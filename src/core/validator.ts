import { parseStrictSec } from './engine';
import { ActorPack, MapPack, PointRef, ScenarioFile, ScenarioStep, ValidationIssue } from './types';

function closestKey(target: string, keys: string[]): string | null {
  let best: string | null = null;
  let bestScore = Infinity;
  for (const k of keys) {
    let diff = Math.abs(k.length - target.length);
    const minL = Math.min(k.length, target.length);
    for (let i = 0; i < minL; i++) if (k[i] !== target[i]) diff++;
    if (diff < bestScore && diff <= 4) {
      bestScore = diff;
      best = k;
    }
  }
  return best;
}

const VALID_FACTIONS = new Set(['blue', 'red', 'neutral']);
const VALID_SOUNDS = new Set([
  'build_complete',
  'alert_ping',
  'move_order',
  'spawn_pop',
  'jet_takeoff',
  'missile_launch',
  'explosion',
  'ship_horn',
  'cannon_fire',
  'gunfire_burst',
  'artillery_fire',
  'torpedo_launch',
  'radar_ping'
]);
const VALID_STRIKE_MODES = new Set([
  'airstrike',
  'missile',
  'shell',
  'bullet',
  'artillery',
  'interceptor',
  'torpedo',
  'scan'
]);
const VALID_ENTITY_ID_RE = /^[^\s.]+$/;
type AfterEvent = 'arrived' | 'built';
const AFTER_TRIGGER_RE = /^([^\s.]+)\.(arrived|built)$/;

const isPlainObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

type StepTrigger =
  | { type: 'at'; atSec: number }
  | { type: 'after'; targetId: string; event: AfterEvent }
  | { type: 'invalid' };

interface CreationRecord {
  id: string;
  stepIndex: number;
  kind: 'spawn' | 'construct';
  actorId: string;
  constructDurationSec: number;
  trigger: StepTrigger;
}

interface RemovalRecord {
  id: string;
  stepIndex: number;
  trigger: StepTrigger;
}

function parseStepTrigger(step: ScenarioStep): StepTrigger {
  const hasAt = step.at !== undefined;
  const hasAfter = step.after !== undefined;
  if (hasAt && !hasAfter) {
    const atSec = parseStrictSec(step.at);
    return atSec !== null ? { type: 'at', atSec } : { type: 'invalid' };
  }
  if (hasAfter && !hasAt && typeof step.after === 'string') {
    const m = AFTER_TRIGGER_RE.exec(step.after);
    if (m) return { type: 'after', targetId: m[1], event: m[2] as AfterEvent };
  }
  return { type: 'invalid' };
}

function isValidEntityId(id: unknown): id is string {
  return typeof id === 'string' && id.trim().length > 0 && id.trim() === id && VALID_ENTITY_ID_RE.test(id);
}

export function validateScenario(
  scenario: ScenarioFile,
  map: MapPack | undefined,
  actors: Record<string, ActorPack>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isPlainObj(scenario)) {
    issues.push({ stepIndex: -1, field: 'root', message: 'ملف السيناريو يجب أن يكون كائن YAML صالحًا' });
    return issues;
  }
  if (!isPlainObj(scenario.meta) || typeof scenario.meta.map !== 'string' || !scenario.meta.map.trim()) {
    issues.push({ stepIndex: -1, field: 'meta.map', message: 'يجب تحديد اسم الخريطة في meta.map' });
    return issues;
  }
  if (!map) {
    issues.push({ stepIndex: -1, field: 'meta.map', message: `الخريطة "${scenario.meta.map}" غير موجودة في قاعدة البيانات` });
    return issues;
  }
  if (scenario.meta.duration_hint !== undefined) {
    const hint = parseStrictSec(scenario.meta.duration_hint);
    if (hint === null || hint <= 0) {
      issues.push({ stepIndex: -1, field: 'meta.duration_hint', message: 'meta.duration_hint يجب أن يكون مدة زمنية موجبة مثل "42s"' });
    }
  }
  if (scenario.timeline !== undefined && !Array.isArray(scenario.timeline)) {
    issues.push({ stepIndex: -1, field: 'timeline', message: 'timeline يجب أن يكون قائمة من الخطوات' });
    return issues;
  }

  const timeline = scenario.timeline ?? [];
  const anchorKeys = Object.keys(map.anchors);
  const zoneKeys = Object.keys(map.zones);
  const actorKeys = Object.keys(actors);
  const maxRadius = Math.max(map.width, map.height) * 2;

  // Pass 1: Index all entity creations, removals, and timed moves for lifecycle causality analysis.
  const stepTriggers: StepTrigger[] = [];
  const creationsById = new Map<string, CreationRecord[]>();
  const removalsById = new Map<string, RemovalRecord[]>();
  const earliestAtMoveById = new Map<string, number>();

  interface MotionRecord {
    id: string;
    stepIndex: number;
    kind: 'move' | 'airstrike';
    trigger: StepTrigger;
  }
  const motionsById = new Map<string, MotionRecord[]>();

  timeline.forEach((rawStep, idx) => {
    if (!isPlainObj(rawStep)) {
      stepTriggers.push({ type: 'invalid' });
      return;
    }
    const step = rawStep as unknown as ScenarioStep;
    const trigger = parseStepTrigger(step);
    stepTriggers.push(trigger);

    if (Array.isArray(step.spawn)) {
      for (const s of step.spawn) {
        if (isPlainObj(s) && isValidEntityId(s.id)) {
          const list = creationsById.get(s.id) ?? [];
          list.push({
            id: s.id,
            stepIndex: idx,
            kind: 'spawn',
            actorId: typeof s.actor === 'string' ? s.actor : '',
            constructDurationSec: 0,
            trigger
          });
          creationsById.set(s.id, list);
        }
      }
    }
    if (isPlainObj(step.construct) && isValidEntityId(step.construct.id)) {
      const dur = parseStrictSec(step.construct.duration);
      const list = creationsById.get(step.construct.id) ?? [];
      list.push({
        id: step.construct.id,
        stepIndex: idx,
        kind: 'construct',
        actorId: typeof step.construct.actor === 'string' ? step.construct.actor : '',
        constructDurationSec: Math.max(0.2, dur ?? 2),
        trigger
      });
      creationsById.set(step.construct.id, list);
    }
    if (isPlainObj(step.remove) && isValidEntityId(step.remove.entity)) {
      const list = removalsById.get(step.remove.entity) ?? [];
      list.push({ id: step.remove.entity, stepIndex: idx, trigger });
      removalsById.set(step.remove.entity, list);
    }
    if (isPlainObj(step.move) && isValidEntityId(step.move.entity)) {
      const list = motionsById.get(step.move.entity) ?? [];
      list.push({ id: step.move.entity, stepIndex: idx, kind: 'move', trigger });
      motionsById.set(step.move.entity, list);
      if (trigger.type === 'at') {
        const prev = earliestAtMoveById.get(step.move.entity);
        if (prev === undefined || trigger.atSec < prev) {
          earliestAtMoveById.set(step.move.entity, trigger.atSec);
        }
      }
    }
    if (isPlainObj(step.strike) && step.strike.mode === 'airstrike' && isValidEntityId(step.strike.attacker)) {
      const list = motionsById.get(step.strike.attacker) ?? [];
      list.push({ id: step.strike.attacker, stepIndex: idx, kind: 'airstrike', trigger });
      motionsById.set(step.strike.attacker, list);
    }
  });

  // Detect indirect circular `after` dependency chains among entity creations.
  const creatorTriggerCycleIds = new Set<string>();
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const detectCycle = (id: string, stack: Set<string>): boolean => {
    if (stack.has(id)) return true;
    if (visited.has(id)) return false;
    visited.add(id);
    stack.add(id);
    const primary = creationsById.get(id)?.[0];
    if (primary?.trigger.type === 'after') {
      if (detectCycle(primary.trigger.targetId, stack)) {
        creatorTriggerCycleIds.add(id);
        stack.delete(id);
        return true;
      }
    }
    stack.delete(id);
    return false;
  };
  for (const id of creationsById.keys()) {
    visiting.clear();
    detectCycle(id, visiting);
  }

  const checkPointRef = (stepIdx: number, field: string, ref: PointRef | undefined) => {
    if (!ref) {
      issues.push({ stepIndex: stepIdx, field, message: 'الموضع مفقود' });
      return;
    }
    if (typeof ref === 'string') {
      if (!map.anchors[ref]) {
        const hint = closestKey(ref, anchorKeys);
        issues.push({
          stepIndex: stepIdx,
          field,
          message: `نقطة غير معروفة "${ref}"${hint ? ` — هل تقصد "${hint}"؟` : ''}`
        });
      }
      return;
    }
    if (!isPlainObj(ref) || typeof ref.x !== 'number' || typeof ref.y !== 'number' || !Number.isFinite(ref.x) || !Number.isFinite(ref.y)) {
      issues.push({ stepIndex: stepIdx, field, message: 'الإحداثيات {x, y} غير صالحة' });
      return;
    }
    if (ref.x < 0 || ref.x > map.width || ref.y < 0 || ref.y > map.height) {
      issues.push({
        stepIndex: stepIdx,
        field,
        message: `الإحداثيات (${ref.x}, ${ref.y}) خارج حدود الخريطة [0..${map.width} × 0..${map.height}]`
      });
    }
  };

  const checkActor = (stepIdx: number, field: string, name: unknown) => {
    if (typeof name !== 'string' || !actors[name]) {
      const hint = typeof name === 'string' ? closestKey(name, actorKeys) : null;
      issues.push({
        stepIndex: stepIdx,
        field,
        message: `كيان غير معروف "${String(name ?? '')}"${hint ? ` — هل تقصد "${hint}"؟` : ''}`
      });
    }
  };

  const checkDurationField = (stepIdx: number, field: string, val: unknown, allowZero = false) => {
    const parsed = parseStrictSec(val);
    if (parsed === null || (!allowZero && parsed <= 0)) {
      issues.push({
        stepIndex: stepIdx,
        field,
        message: allowZero
          ? `المدة "${String(val)}" يجب أن تكون رقمًا غير سالب مثل "1.2s"`
          : `المدة "${String(val)}" يجب أن تكون رقمًا موجبًا أكبر من صفر مثل "1.5s"`
      });
    }
  };

  const isTriggerProvablyAfterRemoval = (refTrigger: StepTrigger, refIdx: number, rem: RemovalRecord): boolean => {
    // Same step execution order in StudioEngine.executeStep:
    // spawn -> move -> resize -> remove -> construct -> strike -> draw_arrow -> zone -> callout
    if (rem.stepIndex === refIdx) return false; // handled specifically by caller when needed
    if (refTrigger.type === 'at' && rem.trigger.type === 'at') {
      return refTrigger.atSec > rem.trigger.atSec || (refTrigger.atSec === rem.trigger.atSec && refIdx > rem.stepIndex);
    }
    if (refTrigger.type === 'after' && rem.trigger.type === 'after' && refTrigger.targetId === rem.trigger.targetId && refTrigger.event === rem.trigger.event) {
      return refIdx > rem.stepIndex;
    }
    // Cross-branch: if ref waits on `after: X.<event>`, check whether X can only finish after `rem`
    if (refTrigger.type === 'after' && rem.trigger.type === 'at') {
      const depCreator = creationsById.get(refTrigger.targetId)?.[0];
      if (depCreator?.trigger.type === 'at' && depCreator.trigger.atSec > rem.trigger.atSec) {
        return true;
      }
      if (refTrigger.event === 'arrived') {
        const depMove = earliestAtMoveById.get(refTrigger.targetId);
        if (depCreator?.trigger.type === 'at' && depMove !== undefined && depMove >= rem.trigger.atSec) {
          return true;
        }
      } else if (refTrigger.event === 'built' && depCreator?.trigger.type === 'at') {
        if (depCreator.trigger.atSec + depCreator.constructDurationSec >= rem.trigger.atSec) {
          return true;
        }
      }
    }
    // Otherwise (cross-branch timed vs conditional whose wall-clock order depends on A*/speed),
    // arrival order is statically indeterminate; do not falsely reject valid scenarios.
    return false;
  };

  // Fixed-point causal reachability for `<entityId>.built` and `<entityId>.arrived`:
  // Distinguish carefully between:
  //   - triggerMinSec: earliest time an event can possibly fire (lower bound; for arrived, > min motion start)
  //   - triggerMaxSec: latest time an event is guaranteed to have fired (upper bound; Infinity for arrived!)
  //   - triggerAncestors: triggers guaranteed to have ALREADY fired strictly before this event
  const DT_APPROX = 1 / 30;
  const achievableBuilt = new Set<string>();
  const achievableArrived = new Set<string>();
  const builtMinSec = new Map<string, number>();
  const builtMaxSec = new Map<string, number>();
  const arrivedMinFinishSec = new Map<string, number>();
  const builtAncestors = new Map<string, Set<string>>();
  const arrivedAncestors = new Map<string, Set<string>>();

  const triggerEventKey = (t: StepTrigger): string | null =>
    t.type === 'after' ? `${t.targetId}.${t.event}` : null;

  const getTriggerMinSec = (t: StepTrigger): number | null => {
    if (t.type === 'at') return t.atSec;
    if (t.type === 'after') {
      return t.event === 'built'
        ? (builtMinSec.get(t.targetId) ?? null)
        : (arrivedMinFinishSec.get(t.targetId) ?? null);
    }
    return null;
  };

  const getTriggerMaxSec = (t: StepTrigger): number => {
    if (t.type === 'at') return t.atSec;
    if (t.type === 'after') {
      return t.event === 'built' ? (builtMaxSec.get(t.targetId) ?? Infinity) : Infinity;
    }
    return Infinity;
  };

  const getStepPredecessorTriggers = (t: StepTrigger): Set<string> => {
    const out = new Set<string>();
    if (t.type === 'after') {
      const k = `${t.targetId}.${t.event}`;
      out.add(k);
      const anc = t.event === 'built' ? builtAncestors.get(t.targetId) : arrivedAncestors.get(t.targetId);
      if (anc) for (const a of anc) out.add(a);
    }
    return out;
  };

  const isTriggerAchievable = (t: StepTrigger): boolean => {
    if (t.type === 'at') return true;
    if (t.type === 'after') {
      return t.event === 'built' ? achievableBuilt.has(t.targetId) : achievableArrived.has(t.targetId);
    }
    return false;
  };

  const isCreatorProvablyBeforeTrigger = (
    creatorTrigger: StepTrigger,
    creatorStepIdx: number,
    creatorKind: 'spawn' | 'construct',
    refTrigger: StepTrigger,
    refStepIdx: number
  ): boolean => {
    if (!isTriggerAchievable(creatorTrigger) || !isTriggerAchievable(refTrigger)) return false;

    // Same step: spawn runs before move, resize, remove, strike, callout in executeStep;
    // construct runs after move/resize/remove (handled separately by checkEntityLifecycle).
    if (refStepIdx === creatorStepIdx) {
      return creatorKind === 'spawn';
    }

    // Identical `after` trigger: step array index determines execution order
    if (
      refTrigger.type === 'after' &&
      creatorTrigger.type === 'after' &&
      refTrigger.targetId === creatorTrigger.targetId &&
      refTrigger.event === creatorTrigger.event
    ) {
      return refStepIdx > creatorStepIdx;
    }

    // Both timed via `at`: strictly chronological (atSec, stepIndex)
    if (refTrigger.type === 'at' && creatorTrigger.type === 'at') {
      return (
        refTrigger.atSec > creatorTrigger.atSec ||
        (refTrigger.atSec === creatorTrigger.atSec && refStepIdx > creatorStepIdx)
      );
    }

    // Causal ancestor check: creator's `after` trigger MUST have fired before ref's `after` trigger
    const creatorKey = triggerEventKey(creatorTrigger);
    if (creatorKey && refTrigger.type === 'after') {
      const refPreds = getStepPredecessorTriggers(refTrigger);
      if (refPreds.has(creatorKey)) {
        return true;
      }
    }

    // Sound time-interval check: creator's guaranteed latest execution (cMax) < ref's earliest execution (rMin).
    // Note: arrived events always have cMax === Infinity because movement duration is unknown without A*.
    const cMax = getTriggerMaxSec(creatorTrigger);
    const rMin = getTriggerMinSec(refTrigger);
    if (Number.isFinite(cMax) && rMin !== null && cMax < rMin) {
      return true;
    }

    return false;
  };

  const canMotionExecuteAfterCreation = (m: MotionRecord, creator: CreationRecord): boolean =>
    isCreatorProvablyBeforeTrigger(creator.trigger, creator.stepIndex, creator.kind, m.trigger, m.stepIndex);

  const isMotionBlockedByRemoval = (m: MotionRecord, removals: RemovalRecord[]): boolean => {
    for (const rem of removals) {
      if (rem.stepIndex === m.stepIndex) return true; // Removed on the same tick before completing motion
      if (isTriggerProvablyAfterRemoval(m.trigger, m.stepIndex, rem)) return true;
    }
    return false;
  };

  const setsEqual = (a: Set<string> | undefined, b: Set<string>): boolean => {
    if (!a || a.size !== b.size) return false;
    for (const v of b) if (!a.has(v)) return false;
    return true;
  };

  let changed = true;
  let fixedPointIters = 0;
  const maxFixedPointIters = (creationsById.size + 1) * 8 + 32;
  while (changed && fixedPointIters++ < maxFixedPointIters) {
    changed = false;

    for (const [id, creations] of creationsById) {
      const creator = creations[0];
      if (!creator || creator.kind !== 'construct') continue;
      const removals = removalsById.get(id) ?? [];
      if (!isTriggerAchievable(creator.trigger) || removals.some((r) => r.stepIndex === creator.stepIndex)) {
        if (achievableBuilt.has(id)) {
          achievableBuilt.delete(id);
          builtMinSec.delete(id);
          builtMaxSec.delete(id);
          builtAncestors.delete(id);
          changed = true;
        }
        continue;
      }

      const cMin = getTriggerMinSec(creator.trigger);
      const cMax = getTriggerMaxSec(creator.trigger);
      const nextMin = cMin !== null ? cMin + creator.constructDurationSec : null;
      // Add 2*DT slack on max for tick quantization of buildProgress and next evaluateTimeline() tick
      const nextMax = Number.isFinite(cMax) ? cMax + creator.constructDurationSec + DT_APPROX * 2 : Infinity;
      const nextAnc = getStepPredecessorTriggers(creator.trigger);

      if (!achievableBuilt.has(id)) {
        achievableBuilt.add(id);
        if (nextMin !== null) builtMinSec.set(id, nextMin);
        builtMaxSec.set(id, nextMax);
        builtAncestors.set(id, nextAnc);
        changed = true;
      } else {
        const prevMin = builtMinSec.get(id);
        const prevMax = builtMaxSec.get(id) ?? Infinity;
        if (
          (nextMin !== null && (prevMin === undefined || nextMin < prevMin)) ||
          nextMax < prevMax ||
          !setsEqual(builtAncestors.get(id), nextAnc)
        ) {
          if (nextMin !== null) builtMinSec.set(id, nextMin);
          builtMaxSec.set(id, nextMax);
          builtAncestors.set(id, nextAnc);
          changed = true;
        }
      }
    }

    for (const [id, creations] of creationsById) {
      const creator = creations[0];
      if (!creator || creator.kind !== 'spawn') continue;
      if (!isTriggerAchievable(creator.trigger)) {
        if (achievableArrived.has(id)) {
          achievableArrived.delete(id);
          arrivedMinFinishSec.delete(id);
          arrivedAncestors.delete(id);
          changed = true;
        }
        continue;
      }

      const actor = actors[creator.actorId];
      if (actor && (actor.kind === 'building' || actor.speed <= 0)) continue;

      const motions = motionsById.get(id) ?? [];
      const removals = removalsById.get(id) ?? [];
      let bestMinFinish: number | null = null;
      let intersectAnc: Set<string> | null = null;
      let canArrive = false;

      for (const m of motions) {
        if (m.kind === 'airstrike' && actor?.kind !== 'air') continue;
        if (m.trigger.type === 'after' && m.trigger.event === 'arrived' && m.trigger.targetId === id) continue;
        if (!canMotionExecuteAfterCreation(m, creator)) continue;
        if (isMotionBlockedByRemoval(m, removals)) continue;
        canArrive = true;
        // Arrival completes strictly after motion begins (at least 1 tick later)
        const mStartMin = getTriggerMinSec(m.trigger);
        if (mStartMin !== null) {
          const finishMin = mStartMin + DT_APPROX;
          if (bestMinFinish === null || finishMin < bestMinFinish) {
            bestMinFinish = finishMin;
          }
        }
        const mPreds = getStepPredecessorTriggers(m.trigger);
        if (intersectAnc === null) {
          intersectAnc = mPreds;
        } else {
          const narrowed = new Set<string>();
          for (const a of intersectAnc) if (mPreds.has(a)) narrowed.add(a);
          intersectAnc = narrowed;
        }
      }

      if (canArrive) {
        // Arrival depends both on the entity's own creation ancestry (including `creator.trigger` itself if `after`)
        // AND on the intersection of ancestors across all executable motion triggers.
        const finalAnc = getStepPredecessorTriggers(creator.trigger);
        if (intersectAnc) {
          for (const a of intersectAnc) finalAnc.add(a);
        }
        if (!achievableArrived.has(id)) {
          achievableArrived.add(id);
          if (bestMinFinish !== null) arrivedMinFinishSec.set(id, bestMinFinish);
          arrivedAncestors.set(id, finalAnc);
          changed = true;
        } else {
          const prevMin = arrivedMinFinishSec.get(id);
          if (
            (bestMinFinish !== null && (prevMin === undefined || bestMinFinish < prevMin)) ||
            !setsEqual(arrivedAncestors.get(id), finalAnc)
          ) {
            if (bestMinFinish !== null) arrivedMinFinishSec.set(id, bestMinFinish);
            arrivedAncestors.set(id, finalAnc);
            changed = true;
          }
        }
      } else if (achievableArrived.has(id)) {
        // Soundness guard: if narrowed ancestors/min-times invalidated an earlier provisional reachability, retract it
        achievableArrived.delete(id);
        arrivedMinFinishSec.delete(id);
        arrivedAncestors.delete(id);
        changed = true;
      }
    }
  }

  const checkEntityLifecycle = (
    stepIdx: number,
    field: string,
    targetId: unknown,
    op: 'after' | 'move' | 'resize' | 'remove' | 'callout' | 'strike_attacker',
    afterEvent?: AfterEvent
  ) => {
    if (!isValidEntityId(targetId)) {
      issues.push({
        stepIndex: stepIdx,
        field,
        message: op === 'after'
          ? `محفز after غير صالح لوحدة فارغة أو غير صالحة`
          : `معرّف الوحدة في ${field} مفقود أو غير صالح`
      });
      return;
    }

    const creations = creationsById.get(targetId);
    if (!creations || creations.length === 0) {
      if (op === 'callout') {
        issues.push({
          stepIndex: stepIdx,
          field,
          message: `الهدف "${targetId}" ليس مرسى في الخريطة ولا وحدة منشأة`
        });
      } else if (op === 'after') {
        issues.push({
          stepIndex: stepIdx,
          field: 'after',
          message: `محفز after "${targetId}.${afterEvent ?? 'arrived'}" يشير إلى وحدة غير منشأة في السيناريو`
        });
      } else {
        issues.push({
          stepIndex: stepIdx,
          field,
          message: `الوحدة "${targetId}" لم تُنشأ في السيناريو`
        });
      }
      return;
    }

    const creator = creations[0];
    const refTrigger = stepTriggers[stepIdx];

    if (op === 'after' && creator.stepIndex === stepIdx) {
      issues.push({
        stepIndex: stepIdx,
        field: 'after',
        message: `الخطوة لا يمكنها انتظار ${afterEvent ?? 'arrived'} للوحدة "${targetId}" التي تُنشأ في نفس الخطوة`
      });
      return;
    }

    if (op === 'after' && creatorTriggerCycleIds.has(targetId)) {
      issues.push({
        stepIndex: stepIdx,
        field: 'after',
        message: `دورة اعتماد شرطية (after cycle) تمنع إنشاء الوحدة "${targetId}"`
      });
      return;
    }

    if (op === 'after') {
      const actor = actors[creator.actorId];
      if (afterEvent === 'built') {
        if (creator.kind !== 'construct') {
          issues.push({
            stepIndex: stepIdx,
            field: 'after',
            message: `محفز "${targetId}.built" صالح فقط للمنشآت التي تُنشأ بأمر construct`
          });
          return;
        }
      } else {
        // `.arrived` is strictly for movable units with an achievable motion command.
        if (creator.kind === 'construct') {
          issues.push({
            stepIndex: stepIdx,
            field: 'after',
            message: `المنشأة "${targetId}" ثابتة ولا تتحرك؛ استخدم "${targetId}.built" لاكتمال البناء بدلاً من ".arrived"`
          });
          return;
        }
        if (actor && (actor.kind === 'building' || actor.speed <= 0)) {
          issues.push({
            stepIndex: stepIdx,
            field: 'after',
            message: `الوحدة الثابتة "${targetId}" (${actor.kind}) لا يمكنها الحركة ولا تحقيق محفز arrived`
          });
          return;
        }
        const canMove = achievableArrived.has(targetId);
        if (!canMove) {
          const motions = motionsById.get(targetId) ?? [];
          const hasAnyValidKindMotion = motions.some(
            (m) => m.kind === 'move' || (m.kind === 'airstrike' && actor?.kind === 'air')
          );
          issues.push({
            stepIndex: stepIdx,
            field: 'after',
            message: hasAnyValidKindMotion
              ? `محفز "${targetId}.arrived" غير قابل للتحقق لأن أمر الحركة سابق للإنشاء أو محذوف أو في دورة اعتماد غير قابلة للتنفيذ`
              : `الوحدة "${targetId}" لا تملك أمر حركة قابل للتنفيذ لتحقيق محفز arrived`
          });
          return;
        }
      }
    }

    // Creation causality: in executeStep, construct runs AFTER move/resize/remove.
    if (creator.stepIndex === stepIdx && creator.kind === 'construct' && (op === 'move' || op === 'resize' || op === 'remove')) {
      issues.push({
        stepIndex: stepIdx,
        field,
        message: `لا يمكن تنفيذ ${op} على "${targetId}" في نفس خطوة construct قبل اكتمال إنشائها`
      });
      return;
    }

    // Both timed via `at`: check chronological order (atSec, stepIndex).
    if (refTrigger.type === 'at' && creator.trigger.type === 'at') {
      if (
        refTrigger.atSec < creator.trigger.atSec ||
        (refTrigger.atSec === creator.trigger.atSec && stepIdx < creator.stepIndex)
      ) {
        issues.push({
          stepIndex: stepIdx,
          field,
          message: `الوحدة "${targetId}" تُستخدم في ت=${refTrigger.atSec}s قبل إنشائها في ت=${creator.trigger.atSec}s`
        });
        return;
      }
    }

    // Timed ref waiting on an `after` creator whose completion cannot be proven before `refTrigger.atSec`.
    if (refTrigger.type === 'at' && creator.trigger.type === 'after') {
      const cMax = getTriggerMaxSec(creator.trigger);
      if (!Number.isFinite(cMax) || cMax >= refTrigger.atSec) {
        issues.push({
          stepIndex: stepIdx,
          field,
          message: `الوحدة "${targetId}" تُنشأ بعد محفز "${creator.trigger.targetId}.${creator.trigger.event}" ولا يمكن إثبات اكتمال إنشائها قبل ت=${refTrigger.atSec}s`
        });
        return;
      }
    }

    // Conditional ref (`after`) using an entity whose creation is not provably before `refTrigger`.
    if (op !== 'after' && refTrigger.type === 'after' && isTriggerAchievable(refTrigger)) {
      const sameEntityEvent = refTrigger.targetId === targetId;
      if (!sameEntityEvent && !isCreatorProvablyBeforeTrigger(creator.trigger, creator.stepIndex, creator.kind, refTrigger, stepIdx)) {
        issues.push({
          stepIndex: stepIdx,
          field,
          message: `لا يمكن إثبات إنشاء الوحدة "${targetId}" قبل تنفيذ المحفز "${refTrigger.targetId}.${refTrigger.event}"`
        });
        return;
      }
    }

    // Post-removal causality checks.
    const removals = removalsById.get(targetId) ?? [];
    for (const rem of removals) {
      if (rem.stepIndex === stepIdx) {
        if (op === 'remove') continue;
        // Same step has both `remove` and another action on the same entity
        if (op === 'callout' || op === 'strike_attacker' || op === 'after' || op === 'move' || op === 'resize') {
          issues.push({
            stepIndex: stepIdx,
            field,
            message: `لا يمكن استخدام الوحدة "${targetId}" في نفس الخطوة التي يتم حذفها فيها`
          });
          return;
        }
      } else if (isTriggerProvablyAfterRemoval(refTrigger, stepIdx, rem)) {
        issues.push({
          stepIndex: stepIdx,
          field,
          message: op === 'remove'
            ? `الوحدة "${targetId}" تم حذفها مسبقًا ولا يمكن حذفها مرة أخرى`
            : `الوحدة "${targetId}" تم حذفها مسبقًا ولا يمكن استخدامها بعد الإزالة`
        });
        return;
      }
    }
  };

  // Pass 2: Validate every step in deterministic field order.
  const seenCreatedIds = new Set<string>();

  timeline.forEach((rawStep, idx) => {
    if (!isPlainObj(rawStep)) {
      issues.push({ stepIndex: idx, field: 'step', message: 'الخطوة فارغة أو غير صالحة' });
      return;
    }
    const step = rawStep as unknown as ScenarioStep;

    const hasAt = step.at !== undefined;
    const hasAfter = step.after !== undefined;
    if (!hasAt && !hasAfter) {
      issues.push({ stepIndex: idx, field: 'at/after', message: 'كل خطوة تحتاج توقيت at أو محفز after' });
    } else if (hasAt && hasAfter) {
      issues.push({ stepIndex: idx, field: 'at/after', message: 'لا يمكن الجمع بين التوقيت at والمحفز الشرطي after في نفس الخطوة' });
    } else if (hasAt) {
      const parsedAt = parseStrictSec(step.at);
      if (parsedAt === null) {
        issues.push({
          stepIndex: idx,
          field: 'at',
          message: `توقيت at "${String(step.at)}" غير صالح — يجب أن يكون رقمًا غير سالب مثل "0s" أو "2.5s"`
        });
      }
    } else if (hasAfter) {
      const m = typeof step.after === 'string' ? AFTER_TRIGGER_RE.exec(step.after) : null;
      if (!m) {
        issues.push({
          stepIndex: idx,
          field: 'after',
          message: `محفز after "${String(step.after)}" يجب أن يكون بصيغة "<entityId>.arrived" أو "<entityId>.built"`
        });
      } else {
        checkEntityLifecycle(idx, 'after', m[1], 'after', m[2] as AfterEvent);
      }
    }

    if (step.sound !== undefined && (typeof step.sound !== 'string' || !VALID_SOUNDS.has(step.sound))) {
      issues.push({ stepIndex: idx, field: 'sound', message: `صوت غير معروف "${String(step.sound)}"` });
    }

    if (step.caption !== undefined) {
      if (!isPlainObj(step.caption) || typeof step.caption.text !== 'string') {
        issues.push({ stepIndex: idx, field: 'caption.text', message: 'caption.text يجب أن يكون نصًا' });
      }
    }

    if (step.camera !== undefined) {
      if (!isPlainObj(step.camera)) {
        issues.push({ stepIndex: idx, field: 'camera', message: 'camera يجب أن يكون كائنًا' });
      } else {
        checkPointRef(idx, 'camera.focus', step.camera.focus);
        if (typeof step.camera.zoom !== 'number' || !Number.isFinite(step.camera.zoom) || step.camera.zoom < 0.25 || step.camera.zoom > 4) {
          issues.push({ stepIndex: idx, field: 'camera.zoom', message: 'camera.zoom يجب أن يكون رقمًا بين 0.25 و 4' });
        }
        if (step.camera.duration !== undefined) {
          checkDurationField(idx, 'camera.duration', step.camera.duration, true);
        }
      }
    }

    if (step.spawn !== undefined) {
      if (!Array.isArray(step.spawn)) {
        issues.push({ stepIndex: idx, field: 'spawn', message: 'spawn يجب أن يكون قائمة وحدات' });
      } else {
        for (const s of step.spawn) {
          if (!isPlainObj(s)) {
            issues.push({ stepIndex: idx, field: 'spawn', message: 'عنصر spawn يجب أن يكون كائنًا صالحًا' });
            continue;
          }
          if (!isValidEntityId(s.id)) {
            issues.push({ stepIndex: idx, field: 'spawn.id', message: 'معرّف الوحدة في spawn.id مطلوب ولا يقبل فراغات أو نقاط' });
          } else if (seenCreatedIds.has(s.id)) {
            issues.push({ stepIndex: idx, field: 'spawn.id', message: `معرّف الوحدة "${s.id}" مكرر — يجب أن يكون فريدًا في السيناريو` });
          } else {
            seenCreatedIds.add(s.id);
          }
          checkActor(idx, 'spawn.actor', s.actor);
          checkPointRef(idx, 'spawn.at', s.at as PointRef | undefined);
          if (s.faction !== undefined && (typeof s.faction !== 'string' || !VALID_FACTIONS.has(s.faction))) {
            issues.push({ stepIndex: idx, field: 'spawn.faction', message: `فصيل غير معروف "${String(s.faction)}"` });
          }
          if (s.scale !== undefined && (typeof s.scale !== 'number' || !Number.isFinite(s.scale) || s.scale < 0.2 || s.scale > 4)) {
            issues.push({ stepIndex: idx, field: 'spawn.scale', message: 'معامل الحجم scale يجب أن يكون رقمًا بين 0.2 و 4' });
          }
        }
      }
    }

    if (step.pulse !== undefined) {
      if (!isPlainObj(step.pulse)) {
        issues.push({ stepIndex: idx, field: 'pulse', message: 'pulse يجب أن يكون كائنًا' });
      } else {
        checkPointRef(idx, 'pulse.at', step.pulse.at as PointRef | undefined);
        if (step.pulse.radius !== undefined && (typeof step.pulse.radius !== 'number' || !Number.isFinite(step.pulse.radius) || step.pulse.radius <= 0 || step.pulse.radius > maxRadius)) {
          issues.push({ stepIndex: idx, field: 'pulse.radius', message: `pulse.radius يجب أن يكون رقمًا موجبًا ضمن 0..${maxRadius}` });
        }
      }
    }

    if (step.move !== undefined) {
      if (!isPlainObj(step.move)) {
        issues.push({ stepIndex: idx, field: 'move', message: 'move يجب أن يكون كائنًا' });
      } else {
        checkEntityLifecycle(idx, 'move.entity', step.move.entity, 'move');
        checkPointRef(idx, 'move.to', step.move.to as PointRef | undefined);
      }
    }

    if (step.resize !== undefined) {
      if (!isPlainObj(step.resize)) {
        issues.push({ stepIndex: idx, field: 'resize', message: 'resize يجب أن يكون كائنًا' });
      } else {
        checkEntityLifecycle(idx, 'resize.entity', step.resize.entity, 'resize');
        if (typeof step.resize.scale !== 'number' || !Number.isFinite(step.resize.scale) || step.resize.scale < 0.2 || step.resize.scale > 4) {
          issues.push({ stepIndex: idx, field: 'resize.scale', message: 'معامل الحجم scale يجب أن يكون رقمًا بين 0.2 و 4' });
        }
      }
    }

    if (step.remove !== undefined) {
      if (!isPlainObj(step.remove)) {
        issues.push({ stepIndex: idx, field: 'remove', message: 'remove يجب أن يكون كائنًا' });
      } else {
        checkEntityLifecycle(idx, 'remove.entity', step.remove.entity, 'remove');
      }
    }

    if (step.construct !== undefined) {
      if (!isPlainObj(step.construct)) {
        issues.push({ stepIndex: idx, field: 'construct', message: 'construct يجب أن يكون كائنًا' });
      } else {
        if (step.construct.id !== undefined) {
          if (!isValidEntityId(step.construct.id)) {
            issues.push({ stepIndex: idx, field: 'construct.id', message: 'معرّف construct.id غير صالح (لا يقبل فراغات أو نقاط أو نصًا فارغًا)' });
          } else if (seenCreatedIds.has(step.construct.id)) {
            issues.push({ stepIndex: idx, field: 'construct.id', message: `معرّف المنشأة "${step.construct.id}" مكرر مع كيان آخر في السيناريو` });
          } else {
            seenCreatedIds.add(step.construct.id);
          }
        }
        checkActor(idx, 'construct.actor', step.construct.actor);
        checkPointRef(idx, 'construct.at', step.construct.at as PointRef | undefined);
        if (step.construct.faction !== undefined && (typeof step.construct.faction !== 'string' || !VALID_FACTIONS.has(step.construct.faction))) {
          issues.push({ stepIndex: idx, field: 'construct.faction', message: `فصيل غير معروف "${String(step.construct.faction)}"` });
        }
        if (step.construct.duration !== undefined) {
          checkDurationField(idx, 'construct.duration', step.construct.duration, false);
        }
        if (step.construct.scale !== undefined && (typeof step.construct.scale !== 'number' || !Number.isFinite(step.construct.scale) || step.construct.scale < 0.2 || step.construct.scale > 4)) {
          issues.push({ stepIndex: idx, field: 'construct.scale', message: 'معامل الحجم scale يجب أن يكون رقمًا بين 0.2 و 4' });
        }
      }
    }

    if (step.draw_arrow !== undefined) {
      if (!isPlainObj(step.draw_arrow)) {
        issues.push({ stepIndex: idx, field: 'draw_arrow', message: 'draw_arrow يجب أن يكون كائنًا' });
      } else {
        if (typeof step.draw_arrow.id !== 'string' || !step.draw_arrow.id.trim()) {
          issues.push({ stepIndex: idx, field: 'draw_arrow.id', message: 'معرّف السهم draw_arrow.id مطلوب' });
        }
        checkPointRef(idx, 'draw_arrow.from', step.draw_arrow.from as PointRef | undefined);
        checkPointRef(idx, 'draw_arrow.to', step.draw_arrow.to as PointRef | undefined);
        if (step.draw_arrow.duration !== undefined) {
          checkDurationField(idx, 'draw_arrow.duration', step.draw_arrow.duration, false);
        }
      }
    }

    if (step.zone !== undefined) {
      if (!isPlainObj(step.zone)) {
        issues.push({ stepIndex: idx, field: 'zone', message: 'zone يجب أن يكون كائنًا' });
      } else {
        if (typeof step.zone.id !== 'string' || !map.zones[step.zone.id]) {
          const hint = typeof step.zone.id === 'string' ? closestKey(step.zone.id, zoneKeys) : null;
          issues.push({
            stepIndex: idx,
            field: 'zone.id',
            message: `منطقة غير معروفة "${String(step.zone.id ?? '')}"${hint ? ` — هل تقصد "${hint}"؟` : ''}`
          });
        }
        if (step.zone.opacity !== undefined && (typeof step.zone.opacity !== 'number' || !Number.isFinite(step.zone.opacity) || step.zone.opacity < 0 || step.zone.opacity > 1)) {
          issues.push({ stepIndex: idx, field: 'zone.opacity', message: 'zone.opacity يجب أن يكون رقمًا بين 0 و 1' });
        }
        if (step.zone.duration !== undefined) {
          checkDurationField(idx, 'zone.duration', step.zone.duration, false);
        }
      }
    }

    if (step.callout !== undefined) {
      if (!isPlainObj(step.callout)) {
        issues.push({ stepIndex: idx, field: 'callout', message: 'callout يجب أن يكون كائنًا' });
      } else {
        if (typeof step.callout.id !== 'string' || !step.callout.id.trim()) {
          issues.push({ stepIndex: idx, field: 'callout.id', message: 'معرّف البطاقة callout.id مطلوب' });
        }
        const t = step.callout.target;
        if (typeof t !== 'string' || !t.trim()) {
          issues.push({ stepIndex: idx, field: 'callout.target', message: 'callout.target مطلوب' });
        } else if (!map.anchors[t]) {
          checkEntityLifecycle(idx, 'callout.target', t, 'callout');
        }
        if (typeof step.callout.text !== 'string') {
          issues.push({ stepIndex: idx, field: 'callout.text', message: 'callout.text يجب أن يكون نصًا' });
        }
        if (step.callout.duration !== undefined) {
          checkDurationField(idx, 'callout.duration', step.callout.duration, false);
        }
      }
    }

    if (step.strike !== undefined) {
      if (!isPlainObj(step.strike)) {
        issues.push({ stepIndex: idx, field: 'strike', message: 'strike يجب أن يكون كائنًا' });
      } else {
        if (typeof step.strike.mode !== 'string' || !VALID_STRIKE_MODES.has(step.strike.mode)) {
          issues.push({
            stepIndex: idx,
            field: 'strike.mode',
            message: 'نوع الضربة strike.mode غير صالح'
          });
        }
        if (step.strike.attacker !== undefined) {
          checkEntityLifecycle(idx, 'strike.attacker', step.strike.attacker, 'strike_attacker');
        }
        if (step.strike.from !== undefined) {
          checkPointRef(idx, 'strike.from', step.strike.from as PointRef | undefined);
        }
        checkPointRef(idx, 'strike.to', step.strike.to as PointRef | undefined);
        if (step.strike.radius !== undefined && (typeof step.strike.radius !== 'number' || !Number.isFinite(step.strike.radius) || step.strike.radius <= 0 || step.strike.radius > maxRadius)) {
          issues.push({ stepIndex: idx, field: 'strike.radius', message: `strike.radius يجب أن يكون رقمًا موجبًا ضمن 0..${maxRadius}` });
        }
      }
    }
  });

  return issues;
}
