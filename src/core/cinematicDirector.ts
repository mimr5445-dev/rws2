import { StudioEngine } from './engine';
import { EntityState, ExplosionState, Point, ProjectileState } from './types';

export type CinematicFocusKind =
  | 'none'
  | 'explosion'
  | 'projectile'
  | 'airstrike'
  | 'movement'
  | 'arrow'
  | 'pulse'
  | 'establishing';

export interface CinematicDirectorOutput {
  x: number;
  y: number;
  zoom: number;
  focusKind: CinematicFocusKind;
  labelAr: string;
}

export interface ViewportMetrics {
  width: number;
  height: number;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function zoomForWorldSpan(
  spanW: number,
  spanH: number,
  mapW: number,
  mapH: number,
  vp: ViewportMetrics,
  minMultiplier = 0.94,
  maxZoom = 3.6
): number {
  const sw = Math.max(1, vp.width);
  const sh = Math.max(1, vp.height);
  const fitZoom = Math.min(sw / Math.max(1, mapW), sh / Math.max(1, mapH)) * 0.94;
  const minZoom = fitZoom * minMultiplier;
  const raw = Math.min(sw / Math.max(80, spanW), sh / Math.max(80, spanH));
  return clamp(raw, minZoom, Math.max(minZoom, maxZoom));
}

function projectilePriority(p: ProjectileState): number {
  if (p.mode === 'missile') return 6;
  if (p.mode === 'bomb') return 5;
  if (p.mode === 'artillery') return 4;
  if (p.mode === 'torpedo') return 3;
  if (p.mode === 'interceptor') return 2;
  if (p.mode === 'shell') return 1;
  return 0;
}

function explosionPriority(ex: ExplosionState): number {
  if (ex.kind === 'missile' || ex.kind === 'airstrike') return 5;
  if (ex.kind === 'artillery') return 4;
  if (ex.kind === 'torpedo') return 3;
  if (ex.kind === 'interceptor') return 2;
  if (ex.kind === 'shell') return 1;
  return 0;
}

function quadraticBezierPoint(from: Point, ctrl: Point, to: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * from.x + 2 * u * t * ctrl.x + t * t * to.x,
    y: u * u * from.y + 2 * u * t * ctrl.y + t * t * to.y
  };
}

export class CinematicDirector {
  private manualPauseUntilSec = -1;
  private holdUntilSec = -1;
  private lastEventX: number | null = null;
  private lastEventY: number | null = null;
  private lastEventSpan = 420;
  private hadAnyEvent = false;
  private trackedProjectileId: string | null = null;

  reset(): void {
    this.manualPauseUntilSec = -1;
    this.holdUntilSec = -1;
    this.lastEventX = null;
    this.lastEventY = null;
    this.lastEventSpan = 420;
    this.hadAnyEvent = false;
    this.trackedProjectileId = null;
  }

  notifyUserInteraction(nowSec: number, pauseDurationSec = 2.6): void {
    this.manualPauseUntilSec = Math.max(this.manualPauseUntilSec, nowSec + Math.max(0, pauseDurationSec));
  }

  resumeImmediately(): void {
    this.manualPauseUntilSec = -1;
  }

  isPaused(nowSec: number): boolean {
    return nowSec < this.manualPauseUntilSec;
  }

  evaluate(
    engine: StudioEngine,
    nowSec: number,
    viewport: ViewportMetrics,
    alpha = 1
  ): CinematicDirectorOutput | null {
    if (nowSec < this.manualPauseUntilSec) {
      return null;
    }

    const mapW = Math.max(1, engine.map.width);
    const mapH = Math.max(1, engine.map.height);
    const minMapDim = Math.min(mapW, mapH);

    // 1. أولوية قصوى: الانفجارات النشطة (وميض + موجة صدمة + دخان)
    if (engine.explosions.length > 0) {
      let bestEx = engine.explosions[0];
      let bestScore = explosionPriority(bestEx) * 10 + (1 - bestEx.progress);
      for (let i = 1; i < engine.explosions.length; i++) {
        const ex = engine.explosions[i];
        const score = explosionPriority(ex) * 10 + (1 - ex.progress);
        if (score > bestScore) {
          bestScore = score;
          bestEx = ex;
        }
      }
      const span = clamp(Math.max(250, bestEx.maxRadius * 5.4), 240, minMapDim * 0.72);
      const zoom = zoomForWorldSpan(span, span, mapW, mapH, viewport, 1.0, 3.4);
      this.recordEvent(bestEx.x, bestEx.y, span * 1.15, nowSec + 1.35);
      return {
        x: bestEx.x,
        y: bestEx.y,
        zoom,
        focusKind: 'explosion',
        labelAr: bestEx.kind === 'bullet' ? 'رصد الاشتباك الناري' : 'رصد لحظة الانفجار'
      };
    }

    // 2. تتبع الصواريخ والقذائف والطوربيدات أثناء الطيران مع تقريب تدريجي نحو الهدف
    const activeProjectiles = engine.projectiles.filter((p) => !p.delaySec || p.delaySec <= 0);
    if (activeProjectiles.length > 0) {
      let chosen = this.trackedProjectileId
        ? activeProjectiles.find((p) => p.id === this.trackedProjectileId)
        : undefined;
      if (!chosen) {
        chosen = activeProjectiles.reduce((best, cur) =>
          projectilePriority(cur) > projectilePriority(best) ? cur : best
        );
        this.trackedProjectileId = chosen.id;
      }

      const px = lerp(chosen.prevX, chosen.x, alpha);
      const py = lerp(chosen.prevY, chosen.y, alpha);
      const remDist = Math.hypot(chosen.targetX - px, chosen.targetY - py);
      // توجيه الكاميرا بنقطة متقدمة بين المقذوف والهدف مع تضييق الإطار عند الاقتراب
      const lookWeight = chosen.mode === 'bullet' ? 0.55 : 0.28 + chosen.progress * 0.35;
      const fx = lerp(px, chosen.targetX, lookWeight);
      const fy = lerp(py, chosen.targetY, lookWeight);
      const span = clamp(
        Math.max(minMapDim * 0.34, remDist * 1.15 + 190),
        250,
        minMapDim * 0.85
      );
      const zoom = zoomForWorldSpan(span, span, mapW, mapH, viewport, 1.0, 3.1);
      this.recordEvent(fx, fy, span, nowSec + 1.2);

      const labelAr =
        chosen.mode === 'missile'
          ? 'تتبع مسار الصاروخ'
          : chosen.mode === 'torpedo'
            ? 'تتبع مسار الطوربيد'
            : chosen.mode === 'artillery'
              ? 'تتبع القصف المدفعي'
              : chosen.mode === 'interceptor'
                ? 'تتبع صاروخ الاعتراض'
                : chosen.mode === 'bomb'
                  ? 'رصد القصف الجوي'
                  : 'تتبع القذيفة نحو الهدف';

      return {
        x: fx,
        y: fy,
        zoom,
        focusKind: 'projectile',
        labelAr
      };
    }
    this.trackedProjectileId = null;

    // 3. تتبع الطائرات المنفذة للغارات الجوية قبل إلقاء القنبلة
    const strikers: EntityState[] = [];
    const movers: EntityState[] = [];
    for (const ent of engine.entities.values()) {
      if (ent.pendingStrike) strikers.push(ent);
      if (ent.isMoving) movers.push(ent);
    }

    if (strikers.length > 0) {
      const jet = strikers[0];
      const ex = lerp(jet.prevX, jet.x, alpha);
      const ey = lerp(jet.prevY, jet.y, alpha);
      const tgt = jet.pendingStrike!.to;
      const distToTarget = Math.hypot(tgt.x - ex, tgt.y - ey);
      const fx = lerp(ex, tgt.x, 0.25);
      const fy = lerp(ey, tgt.y, 0.25);
      const span = clamp(Math.max(300, distToTarget * 0.9 + 200), 280, minMapDim * 0.85);
      const zoom = zoomForWorldSpan(span, span, mapW, mapH, viewport, 1.0, 2.8);
      this.recordEvent(fx, fy, span, nowSec + 1.1);
      return {
        x: fx,
        y: fy,
        zoom,
        focusKind: 'airstrike',
        labelAr: 'تتبع المقاتلة نحو الهدف'
      };
    }

    // 4. تتبع الأسهم التكتيكية أثناء رسمها
    for (const arr of engine.arrows.values()) {
      if (arr.progress < 0.99) {
        const mx = (arr.from.x + arr.to.x) / 2;
        const my = (arr.from.y + arr.to.y) / 2 - 55;
        const tip = quadraticBezierPoint(arr.from, { x: mx, y: my }, arr.to, arr.progress);
        const spanW = Math.max(280, Math.abs(tip.x - arr.from.x) + 220);
        const spanH = Math.max(240, Math.abs(tip.y - arr.from.y) + 220);
        const cx = (arr.from.x + tip.x) / 2;
        const cy = (arr.from.y + tip.y) / 2;
        const zoom = zoomForWorldSpan(spanW, spanH, mapW, mapH, viewport, 1.0, 2.6);
        this.recordEvent(cx, cy, Math.max(spanW, spanH), nowSec + 1.0);
        return {
          x: cx,
          y: cy,
          zoom,
          focusKind: 'arrow',
          labelAr: 'متابعة مسار العملية'
        };
      }
    }

    // 5. تتبع تحرك الوحدات والأساطيل
    if (movers.length > 0) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      let sumX = 0;
      let sumY = 0;
      for (const m of movers) {
        const ex = lerp(m.prevX, m.x, alpha);
        const ey = lerp(m.prevY, m.y, alpha);
        const lead = m.kind === 'air' ? 38 : 20;
        const lx = ex + Math.cos(m.angle) * lead;
        const ly = ey + Math.sin(m.angle) * lead;
        minX = Math.min(minX, ex, lx);
        maxX = Math.max(maxX, ex, lx);
        minY = Math.min(minY, ey, ly);
        maxY = Math.max(maxY, ey, ly);
        sumX += lx;
        sumY += ly;
      }
      const cx = movers.length === 1 ? sumX : (minX + maxX) / 2;
      const cy = movers.length === 1 ? sumY : (minY + maxY) / 2;
      const spanW = Math.max(320, maxX - minX + 260);
      const spanH = Math.max(260, maxY - minY + 240);
      const zoom = zoomForWorldSpan(spanW, spanH, mapW, mapH, viewport, 1.0, 2.5);
      this.recordEvent(cx, cy, Math.max(spanW, spanH), nowSec + 1.0);
      return {
        x: cx,
        y: cy,
        zoom,
        focusKind: 'movement',
        labelAr: movers.length > 1 ? 'تتبع تحرك التشكيلات' : 'تتبع تحرك الوحدة'
      };
    }

    // 6. تتبع موجات الرادار والإنذار النشطة
    if (engine.pulses.length > 0) {
      const latestPulse = engine.pulses[engine.pulses.length - 1];
      if (latestPulse.progress < 0.85) {
        const span = clamp(Math.max(280, latestPulse.maxRadius * 3.4), 260, minMapDim * 0.78);
        const zoom = zoomForWorldSpan(span, span, mapW, mapH, viewport, 1.0, 2.7);
        this.recordEvent(latestPulse.x, latestPulse.y, span, nowSec + 1.0);
        return {
          x: latestPulse.x,
          y: latestPulse.y,
          zoom,
          focusKind: 'pulse',
          labelAr: 'رصد موجة المسح والإنذار'
        };
      }
    }

    // 7. التريث على موقع الحدث الأخير ثم سحب الكاميرا تدريجيًا للقطة شاملة للمسرح
    if (this.hadAnyEvent && this.lastEventX !== null && this.lastEventY !== null && nowSec < this.holdUntilSec) {
      const zoom = zoomForWorldSpan(
        this.lastEventSpan * 1.12,
        this.lastEventSpan * 1.12,
        mapW,
        mapH,
        viewport,
        0.98,
        2.6
      );
      return {
        x: this.lastEventX,
        y: this.lastEventY,
        zoom,
        focusKind: 'establishing',
        labelAr: 'تأمل ما بعد الحدث'
      };
    }

    if (this.hadAnyEvent && engine.entities.size > 0) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const ent of engine.entities.values()) {
        const ex = lerp(ent.prevX, ent.x, alpha);
        const ey = lerp(ent.prevY, ent.y, alpha);
        minX = Math.min(minX, ex);
        maxX = Math.max(maxX, ex);
        minY = Math.min(minY, ey);
        maxY = Math.max(maxY, ey);
      }
      const spanW = Math.max(460, maxX - minX + 340);
      const spanH = Math.max(360, maxY - minY + 300);
      const zoom = zoomForWorldSpan(spanW, spanH, mapW, mapH, viewport, 1.0, 2.0);
      return {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
        zoom,
        focusKind: 'establishing',
        labelAr: 'لقطة عامة للمسرح'
      };
    }

    return null;
  }

  private recordEvent(x: number, y: number, span: number, holdUntilSec: number): void {
    this.hadAnyEvent = true;
    this.lastEventX = x;
    this.lastEventY = y;
    this.lastEventSpan = span;
    this.holdUntilSec = Math.max(this.holdUntilSec, holdUntilSec);
  }
}
