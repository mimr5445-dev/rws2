import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as yaml from 'js-yaml';
import {
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Clock,
  Crosshair,
  Eye,
  EyeOff,
  Globe2,
  Maximize2,
  X,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { ActionRecorder } from './core/actionRecorder';
import { CinematicFocusKind } from './core/cinematicDirector';
import { DT, StudioEngine, TICK_RATE } from './core/engine';
import { isPointNearWalkable } from './core/pathfinding';
import { StrikeLockPhase, computeLockedStrikeRadius } from './core/targetingLock';
import {
  ActorPack,
  Faction,
  MapPack,
  Point,
  SavedScenarioRecord,
  ScenarioFile,
  StrikeMode,
  ValidationIssue
} from './core/types';
import { validateScenario } from './core/validator';
import { CountryRegistry } from './countries/countryRegistry';
import { buildRegionColorMap } from './countries/countrySelection';
import { buildCountryProvincesMapPack } from './maps/worldGeoEngine';
import { PackRegistry } from './packs/packRegistry';
import { SoundSynth } from './renderer/soundSynth';
import { StudioRenderer } from './renderer/studioRenderer';
import { studioDb } from './storage/studioDb';
import { SpecModal } from './components/SpecModal';
import { ToolsDock } from './components/ToolsDock';
import { UnitActionBar } from './components/UnitActionBar';
import { UnitsDock } from './components/UnitsDock';

interface ArmedAbilityState {
  entityId: string;
  mode: StrikeMode;
  radius: number;
  color: string;
  label: string;
  shortLabel: string;
}

const FACTION_HEX: Record<Faction, string> = {
  blue: '#38bdf8',
  red: '#ef4444',
  neutral: '#f59e0b'
};

const DEFAULT_EMPTY_YAML = `meta:
  title: "سيناريو عالمي جديد"
  map: world_live
timeline:
  - at: "0s"
    caption:
      text: "بداية العرض التكتيكي"
`;

export default function App() {
  const registryRef = useRef<PackRegistry | null>(null);
  if (!registryRef.current) {
    registryRef.current = new PackRegistry(true);
  }
  const countryRegistryRef = useRef<CountryRegistry | null>(null);
  if (!countryRegistryRef.current) {
    countryRegistryRef.current = new CountryRegistry(true);
  }

  const stageHostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<StudioRenderer | null>(null);
  const engineRef = useRef<StudioEngine | null>(null);
  const soundRef = useRef<SoundSynth | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const actionRecorderRef = useRef<ActionRecorder>(new ActionRecorder());

  // Refs synced for 60fps loop and Pixi callbacks
  const playingRef = useRef(true);
  const speedRef = useRef(1);
  const activeToolRef = useRef<string>('select');
  const sandboxFactionRef = useRef<Faction>('blue');
  const sandboxCounterRef = useRef(1);
  const toolScalesRef = useRef<Record<string, number>>({});
  const armedAbilityRef = useRef<ArmedAbilityState | null>(null);
  const pendingActionModeRef = useRef<'none' | 'arrow_start' | 'arrow_end' | 'pulse'>('none');
  const arrowStartPtRef = useRef<Point | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const [, setPackVersion] = useState(0);
  const [unitsOpen, setUnitsOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [topHudExpanded, setTopHudExpanded] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);

  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('');
  const [yamlText, setYamlText] = useState(DEFAULT_EMPTY_YAML);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [muted, setMuted] = useState(false);
  const [recording, setRecording] = useState(false);
  const [unitScale, setUnitScale] = useState(1.0);
  const [activeTool, setActiveTool] = useState<string>('select');
  const [sandboxFaction, setSandboxFaction] = useState<Faction>('blue');

  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedEntityScale, setSelectedEntityScale] = useState<number>(1.0);
  const [armedAbility, setArmedAbility] = useState<ArmedAbilityState | null>(null);
  const [strikeLockPhase, setStrikeLockPhase] = useState<StrikeLockPhase>('idle');

  const [toolScales, setToolScales] = useState<Record<string, number>>({});
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [yamlSyntaxError, setYamlSyntaxError] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [showAnchors, setShowAnchors] = useState(true);
  const [cinematicCamera, setCinematicCamera] = useState(false);
  const [cinematicFocus, setCinematicFocus] = useState<{ kind: CinematicFocusKind; labelAr: string }>({
    kind: 'none',
    labelAr: ''
  });
  const [specOpen, setSpecOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const [activeMap, setActiveMap] = useState<MapPack>(registryRef.current.maps.world_live);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [geoLoadingMsg, setGeoLoadingMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [viewportSize, setViewportSize] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 720
  }));

  // Live ActionRecorder UI state
  const [actionRecording, setActionRecording] = useState(false);
  const [recStats, setRecStats] = useState({ clockSec: 0, stepCount: 0 });
  const [pendingSaveMode, setPendingSaveMode] = useState<'recorded' | 'code' | null>(null);
  const [saveDraftTitle, setSaveDraftTitle] = useState('');

  // Throttled HUD & scrubber readouts
  const [hudState, setHudState] = useState({
    simTimeSec: 0,
    tick: 0,
    maxTicks: 600,
    caption: '',
    entityCount: 0,
    executedSteps: 0,
    totalSteps: 0
  });

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  useEffect(() => {
    sandboxFactionRef.current = sandboxFaction;
  }, [sandboxFaction]);

  useEffect(() => {
    armedAbilityRef.current = armedAbility;
    if (rendererRef.current) {
      rendererRef.current.strikeModeConfig = armedAbility
        ? {
            entityId: armedAbility.entityId,
            mode: armedAbility.mode,
            radius: armedAbility.radius,
            accentColor: armedAbility.color
          }
        : null;
    }
    if (!armedAbility) {
      setStrikeLockPhase('idle');
    }
  }, [armedAbility]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.cinematicCameraEnabled = cinematicCamera;
      if (cinematicCamera) {
        rendererRef.current.resumeCinematicDirector();
      } else {
        setCinematicFocus({ kind: 'none', labelAr: '' });
      }
    }
  }, [cinematicCamera]);

  useEffect(() => {
    const onResize = () => {
      setViewportSize({ w: window.innerWidth, h: window.innerHeight });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        pendingActionModeRef.current = 'none';
        arrowStartPtRef.current = null;
        if (armedAbilityRef.current) {
          armedAbilityRef.current = null;
          setArmedAbility(null);
          return;
        }
        if (activeToolRef.current !== 'select') {
          setActiveTool('select');
          return;
        }
        if (rendererRef.current) {
          rendererRef.current.selectedEntityId = null;
        }
        setSelectedEntityId(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMsg(null);
      toastTimerRef.current = null;
    }, 3000);
  }, []);

  const syncHudFromEngine = useCallback((eng: StudioEngine) => {
    const hasSteps = (eng.scenario.timeline?.length ?? 0) > 0;
    const maxTicks = hasSteps ? Math.max(60, Math.ceil(eng.estimateDurationSec() * TICK_RATE)) : 600;
    setHudState({
      simTimeSec: eng.tick * DT,
      tick: eng.tick,
      maxTicks,
      caption: eng.caption,
      entityCount: eng.entities.size,
      executedSteps: eng.executedStepCount,
      totalSteps: eng.totalStepCount
    });
  }, []);

  const attachEngineListeners = useCallback(
    (eng: StudioEngine) => {
      if (soundRef.current) {
        eng.onSound((id) => soundRef.current?.play(id));
      }
      eng.onMoveBlocked((ent) => {
        showToast(
          ent.domain === 'land'
            ? '⚠️ لا يوجد مسار بري متصل — الدبابات والمشاة لا تعبر البحر!'
            : '⚠️ لا يوجد مسار بحري متصل — السفن لا تعبر اليابسة!'
        );
      });
    },
    [showToast]
  );

  const cancelActiveActionRecording = useCallback(() => {
    if (actionRecorderRef.current.isRecording) {
      actionRecorderRef.current.stop();
      setActionRecording(false);
    }
    pendingActionModeRef.current = 'none';
    arrowStartPtRef.current = null;
  }, []);

  const openEmptyMapBoard = useCallback(
    async (mapId: string, preserveRecording = false) => {
      const reg = registryRef.current!;
      const map = reg.maps[mapId] ?? reg.maps.world_live;
      if (!map) return;

      if (!preserveRecording) cancelActiveActionRecording();
      setIssues([]);
      setYamlSyntaxError(null);
      setStatusNotice(null);
      armedAbilityRef.current = null;
      setArmedAbility(null);

      const blankScenario: ScenarioFile = {
        meta: { title: map.title, map: map.id },
        timeline: []
      };
      const engine = new StudioEngine(map, reg.actors, blankScenario);
      attachEngineListeners(engine);
      engineRef.current = engine;
      setActiveMap(map);
      setSelectedEntityId(null);
      setSelectedRegionId(null);
      sandboxCounterRef.current = 1;

      if (rendererRef.current) {
        await rendererRef.current.loadEngineAssets(engine);
        rendererRef.current.setCountryColorMap(buildRegionColorMap(map, countryRegistryRef.current!));
      }

      syncHudFromEngine(engine);
      await studioDb.setSetting('lastMapId', map.id);
      await studioDb.setSetting('lastScenarioId', '');
    },
    [attachEngineListeners, cancelActiveActionRecording, syncHudFromEngine]
  );

  const loadScenario = useCallback(
    async (rawYaml: string, noticeText: string | null = null, savedScenarioId?: string): Promise<boolean> => {
      const reg = registryRef.current!;
      cancelActiveActionRecording();
      setIssues([]);
      setYamlSyntaxError(null);
      setStatusNotice(null);
      armedAbilityRef.current = null;
      setArmedAbility(null);

      try {
        const parsed = yaml.load(rawYaml) as ScenarioFile;
        const map = reg.maps[parsed?.meta?.map];
        const foundIssues = validateScenario(parsed, map, reg.actors);
        if (foundIssues.length > 0) {
          setIssues(foundIssues);
          return false;
        }

        const engine = new StudioEngine(map, reg.actors, parsed);
        attachEngineListeners(engine);
        engineRef.current = engine;
        setActiveMap(map);
        setSelectedEntityId(null);
        setSelectedRegionId(null);

        if (rendererRef.current) {
          await rendererRef.current.loadEngineAssets(engine);
          rendererRef.current.setCountryColorMap(buildRegionColorMap(map, countryRegistryRef.current!));
        }

        syncHudFromEngine(engine);
        await studioDb.setSetting('lastMapId', map.id);
        if (savedScenarioId !== undefined) {
          await studioDb.setSetting('lastScenarioId', savedScenarioId);
        }
        if (noticeText) {
          setStatusNotice(noticeText);
        }
        return true;
      } catch (err) {
        setYamlSyntaxError((err as Error).message);
        return false;
      }
    },
    [attachEngineListeners, cancelActiveActionRecording, syncHudFromEngine]
  );

  const enterCountryProvinces = useCallback(
    async (regionId: string) => {
      const eng = engineRef.current;
      const renderer = rendererRef.current;
      const reg = registryRef.current!;
      const regMap = eng?.map.regions?.[regionId];
      if (!eng || !renderer || !regMap?.iso3) return;

      const title = regMap.nameAr ? `${regMap.nameAr} (${regMap.name})` : regMap.name;
      setGeoLoadingMsg(`⏳ جاري تحميل محافظات ${title}...`);
      renderer.focusRegion(eng, regionId);

      try {
        const cachedId = `country_${regMap.iso3.toLowerCase()}`;
        let countryMap = reg.maps[cachedId];
        if (!countryMap) {
          countryMap = await buildCountryProvincesMapPack(regMap.iso3, title);
          await reg.saveCustomMap(countryMap);
        }
        setPackVersion((v) => v + 1);
        setPlaying(true);
        await openEmptyMapBoard(countryMap.id);
        showToast(`خريطة محافظات ${title}`);
      } catch (err) {
        showToast((err as Error).message);
      } finally {
        setGeoLoadingMsg(null);
      }
    },
    [openEmptyMapBoard, showToast]
  );

  // Initialize PackRegistry, PixiJS StudioRenderer, & 30 TPS loop once
  useEffect(() => {
    const host = stageHostRef.current;
    if (!host) return;

    let cancelled = false;
    let rafId = 0;

    const sound = new SoundSynth();
    soundRef.current = sound;

    const renderer = new StudioRenderer();
    rendererRef.current = renderer;

    renderer.onSelectionChange = (id) => {
      setSelectedEntityId(id);
      const ent = id ? engineRef.current?.entities.get(id) : undefined;
      setSelectedEntityScale(ent?.scaleMul ?? 1.0);
    };
    renderer.onRegionDoubleClick = (id) => {
      if (engineRef.current?.map.geoLevel === 'world') {
        void enterCountryProvinces(id);
      }
    };

    renderer.onStrikeLockChange = (phase) => {
      setStrikeLockPhase(phase);
      if (phase === 'locking') {
        sound.playLockTone(false);
      } else if (phase === 'locked') {
        sound.playLockTone(true);
      }
    };

    renderer.onCinematicFocusChange = (kind, labelAr) => {
      setCinematicFocus({ kind, labelAr });
    };

    renderer.onMapClick = (pt: Point, hitId: string | null, shiftKey = false, lockPhase: StrikeLockPhase = 'idle') => {
      const eng = engineRef.current;
      const reg = registryRef.current;
      const rec = actionRecorderRef.current;
      if (!eng || !reg) return;

      // 1. وضع التسجيل اليدوي للأسهم أو الموجات
      if (pendingActionModeRef.current === 'arrow_start') {
        arrowStartPtRef.current = pt;
        pendingActionModeRef.current = 'arrow_end';
        showToast('اضغط نقطة نهاية السهم على الخريطة');
        return;
      }
      if (pendingActionModeRef.current === 'arrow_end' && arrowStartPtRef.current) {
        const id = `arr_${Date.now()}`;
        eng.arrows.set(id, {
          id,
          from: arrowStartPtRef.current,
          to: pt,
          color: '#f59e0b',
          dashed: true,
          progress: 0,
          rate: 0.8
        });
        rec.recordArrow(id, arrowStartPtRef.current, pt, '#f59e0b', true);
        pendingActionModeRef.current = 'none';
        arrowStartPtRef.current = null;
        return;
      }
      if (pendingActionModeRef.current === 'pulse') {
        eng.pulses.push({ x: pt.x, y: pt.y, color: '#ef4444', maxRadius: 70, progress: 0 });
        rec.recordPulse(pt, '#ef4444');
        pendingActionModeRef.current = 'none';
        return;
      }

      // 2. وضع الإطلاق المستمر المسلّح لآلية محددة (يبقى مفعلاً عبر ضربات متتالية حتى يوقفه المستخدم)
      const armed = armedAbilityRef.current;
      if (armed) {
        const attacker = eng.entities.get(armed.entityId);
        if (!attacker) {
          armedAbilityRef.current = null;
          if (rendererRef.current) rendererRef.current.strikeModeConfig = null;
          setArmedAbility(null);
          setStrikeLockPhase('idle');
        } else {
          const strikeRadius = computeLockedStrikeRadius(armed.radius, lockPhase);
          const strikeColor = lockPhase === 'locked' ? '#ff1e42' : armed.color;
          eng.dispatchOrder({
            type: 'strike',
            attackerId: attacker.id,
            mode: armed.mode,
            to: pt,
            radius: strikeRadius,
            color: strikeColor,
            faction: attacker.faction
          });
          eng.flushOrders();
          rec.recordStrike(armed.mode, pt, attacker.id, undefined, strikeRadius, strikeColor);
          setStrikeLockPhase('idle');
          syncHudFromEngine(eng);
          return;
        }
      }

      // 3. اختصار Shift+Click لإطلاق قدرة الوحدة المحددة بسرعة
      if (shiftKey && renderer.selectedEntityId) {
        const selected = eng.entities.get(renderer.selectedEntityId);
        const actor = selected ? reg.actors[selected.actorId] : undefined;
        if (selected && actor?.ability) {
          eng.dispatchOrder({
            type: 'strike',
            attackerId: selected.id,
            mode: actor.ability.mode,
            to: pt,
            radius: actor.ability.radius,
            color: actor.ability.accentColor,
            faction: selected.faction
          });
          eng.flushOrders();
          rec.recordStrike(
            actor.ability.mode,
            pt,
            selected.id,
            undefined,
            actor.ability.radius,
            actor.ability.accentColor
          );
          syncHudFromEngine(eng);
          return;
        }
      }

      // 4. أداة التحديد/التحريك أو إنزال آلية/منشأة
      const tool = activeToolRef.current;
      if (tool === 'select') {
        if (hitId) {
          renderer.selectedEntityId = hitId;
          setSelectedEntityId(hitId);
          setSelectedEntityScale(eng.entities.get(hitId)?.scaleMul ?? 1.0);
        } else if (renderer.selectedEntityId) {
          const sel = eng.entities.get(renderer.selectedEntityId);
          if (sel && sel.kind !== 'building') {
            eng.dispatchOrder({ type: 'move', entityId: renderer.selectedEntityId, to: pt });
            eng.flushOrders();
            rec.recordMove(renderer.selectedEntityId, pt);
            syncHudFromEngine(eng);
          } else {
            renderer.selectedEntityId = null;
            setSelectedEntityId(null);
          }
        } else {
          const regionHit = eng.map.hitTest?.(pt) ?? null;
          renderer.selectedRegionId = regionHit;
          setSelectedRegionId(regionHit);
        }
      } else {
        const actor = reg.actors[tool];
        if (!actor) return;
        if (!isPointNearWalkable(eng.map, pt, actor.domain, 2)) {
          showToast(
            actor.domain === 'land'
              ? '⚠️ لا يمكن وضع أو بناء وحدة برية في وسط البحر!'
              : '⚠️ لا يمكن وضع وحدة بحرية فوق اليابسة!'
          );
          return;
        }
        const id = `sb_${sandboxCounterRef.current++}`;
        const faction = sandboxFactionRef.current;
        const spawnScale = toolScalesRef.current[actor.id] ?? 1.0;
        if (actor.kind === 'building') {
          eng.dispatchOrder({ type: 'construct', id, actorId: actor.id, at: pt, faction, durationSec: 1.5, scale: spawnScale });
          rec.recordConstruct(id, actor.id, pt, faction, 1.5, spawnScale);
          renderer.selectedEntityId = id;
          setSelectedEntityId(id);
          setSelectedEntityScale(spawnScale);
          setActiveTool('select');
        } else {
          eng.dispatchOrder({ type: 'spawn', id, actorId: actor.id, at: pt, faction, scale: spawnScale });
          rec.recordSpawn(id, actor.id, pt, faction, spawnScale);
          renderer.selectedEntityId = id;
          setSelectedEntityId(id);
          setSelectedEntityScale(spawnScale);
          setActiveTool('select');
        }
        eng.flushOrders();
        syncHudFromEngine(eng);
      }
    };

    const boot = async () => {
      const reg = registryRef.current!;
      const countryReg = countryRegistryRef.current!;
      await Promise.all([reg.init([]), countryReg.init()]);
      await renderer.init(host);
      if (cancelled) return;

      const savedScale = await studioDb.getSetting<number>('unitScale');
      if (savedScale && Number.isFinite(savedScale)) {
        renderer.userUnitScale = savedScale;
        setUnitScale(savedScale);
      }

      const savedCinCam = await studioDb.getSetting<boolean>('cinematicCamera');
      if (typeof savedCinCam === 'boolean') {
        renderer.cinematicCameraEnabled = savedCinCam;
        setCinematicCamera(savedCinCam);
      }

      const lastScenId = await studioDb.getSetting<string>('lastScenarioId');
      setPackVersion((v) => v + 1);

      const userScen = lastScenId ? reg.scenarios.find((s) => s.id === lastScenId) : undefined;
      if (userScen && reg.maps[(() => { try { return (yaml.load(userScen.yaml) as ScenarioFile)?.meta?.map; } catch { return ''; } })()]) {
        setSelectedScenarioId(userScen.id);
        setYamlText(userScen.yaml);
        await loadScenario(userScen.yaml, null, userScen.id);
      } else {
        await openEmptyMapBoard('world_live');
      }

      let accumulator = 0;
      let lastTime = performance.now();
      let lastHudTenths = -1;
      let lastHudCaption = '';
      let lastHudEntities = -1;
      let lastHudSteps = -1;
      let lastRecTenths = -1;
      let lastRecCount = -1;

      const loop = (now: number) => {
        if (cancelled) return;
        const frameDt = Math.min(0.1, (now - lastTime) / 1000);
        lastTime = now;

        const eng = engineRef.current;
        if (eng && playingRef.current) {
          accumulator += frameDt * speedRef.current;
          while (accumulator >= DT) {
            eng.step();
            accumulator -= DT;
          }
        }

        // إلغاء التسليح تلقائيًا إذا تم تدمير الآلية المسلحة أثناء التشغيل
        if (eng && armedAbilityRef.current && !eng.entities.has(armedAbilityRef.current.entityId)) {
          armedAbilityRef.current = null;
          setArmedAbility(null);
        }

        const rec = actionRecorderRef.current;
        if (rec.isRecording) {
          const recSec = rec.elapsedSec();
          const recTenths = Math.floor(recSec * 10);
          if (recTenths !== lastRecTenths || rec.steps.length !== lastRecCount) {
            lastRecTenths = recTenths;
            lastRecCount = rec.steps.length;
            setRecStats({ clockSec: recSec, stepCount: rec.steps.length });
          }
        }

        if (eng) {
          const alpha = playingRef.current ? accumulator / DT : 1;
          renderer.render(eng, alpha, now / 1000, frameDt, playingRef.current);

          const simSec = eng.tick * DT;
          const tenths = Math.floor(simSec * 10);
          const entCount = eng.entities.size;
          const execSteps = eng.executedStepCount;

          if (
            tenths !== lastHudTenths ||
            eng.caption !== lastHudCaption ||
            entCount !== lastHudEntities ||
            execSteps !== lastHudSteps
          ) {
            lastHudTenths = tenths;
            lastHudCaption = eng.caption;
            lastHudEntities = entCount;
            lastHudSteps = execSteps;
            const hasSteps = (eng.scenario.timeline?.length ?? 0) > 0;
            const maxTicks = hasSteps ? Math.max(60, Math.ceil(eng.estimateDurationSec() * TICK_RATE)) : 600;
            setHudState({
              simTimeSec: simSec,
              tick: eng.tick,
              maxTicks,
              caption: eng.caption,
              entityCount: entCount,
              executedSteps: execSteps,
              totalSteps: eng.totalStepCount
            });
          }
        }

        rafId = requestAnimationFrame(loop);
      };

      rafId = requestAnimationFrame(loop);
    };

    void boot();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      if (recorderRef.current && recorderRef.current.state === 'recording') {
        recorderRef.current.stop();
      }
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
      renderer.destroy();
    };
  }, [enterCountryProvinces, loadScenario, openEmptyMapBoard, showToast, syncHudFromEngine]);

  const handleChangeUnitScale = async (nextScale: number) => {
    setUnitScale(nextScale);
    if (rendererRef.current) {
      rendererRef.current.userUnitScale = nextScale;
    }
    await studioDb.setSetting('unitScale', nextScale);
  };

  const handleChangeSelectedEntityScale = (nextScale: number) => {
    const eng = engineRef.current;
    const entityId = rendererRef.current?.selectedEntityId;
    if (!eng || !entityId) return;
    const clamped = Number(Math.max(0.3, Math.min(2.8, nextScale)).toFixed(2));
    setSelectedEntityScale(clamped);
    eng.dispatchOrder({ type: 'resize', entityId, scale: clamped });
    eng.flushOrders();
    actionRecorderRef.current.recordResize(entityId, clamped);
  };

  const handleChangeToolScale = (toolId: string, nextScale: number) => {
    const clamped = Number(Math.max(0.3, Math.min(2.8, nextScale)).toFixed(2));
    toolScalesRef.current = { ...toolScalesRef.current, [toolId]: clamped };
    setToolScales((prev) => ({ ...prev, [toolId]: clamped }));
  };

  const handleDeleteEntity = (entityId: string) => {
    const eng = engineRef.current;
    const renderer = rendererRef.current;
    if (!eng || !renderer) return;
    eng.dispatchOrder({ type: 'remove', entityId });
    eng.flushOrders();
    actionRecorderRef.current.recordRemove(entityId);
    if (armedAbilityRef.current?.entityId === entityId) {
      armedAbilityRef.current = null;
      setArmedAbility(null);
    }
    if (renderer.selectedEntityId === entityId) {
      renderer.selectedEntityId = null;
      setSelectedEntityId(null);
    }
    syncHudFromEngine(eng);
  };

  // Live ActionRecorder handlers
  const handleStartActionRecord = async () => {
    const eng = engineRef.current;
    const renderer = rendererRef.current;
    if (!eng || !renderer) return;
    await openEmptyMapBoard(eng.map.id, true);
    setPlaying(true);
    actionRecorderRef.current.start(eng.map.id, renderer.getCameraState());
    setPendingSaveMode(null);
    setActionRecording(true);
    setRecStats({ clockSec: 0, stepCount: actionRecorderRef.current.steps.length });
  };

  const handleRequestStopActionRecord = () => {
    actionRecorderRef.current.stop();
    setActionRecording(false);
    pendingActionModeRef.current = 'none';
    setSaveDraftTitle(`سيناريو مسجّل (${activeMap.title})`);
    setPendingSaveMode('recorded');
  };

  const handleRequestSaveYaml = async () => {
    const ok = await loadScenario(yamlText);
    if (!ok) return;
    const parsed = yaml.load(yamlText) as ScenarioFile;
    setSaveDraftTitle(parsed?.meta?.title || `سيناريو (${activeMap.title})`);
    setPendingSaveMode('code');
  };

  const handleConfirmSaveScenario = async () => {
    const reg = registryRef.current!;
    const title = saveDraftTitle.trim() || `سيناريو (${activeMap.title})`;
    if (pendingSaveMode === 'recorded') {
      const generatedYaml = actionRecorderRef.current.toYaml(title);
      setYamlText(generatedYaml);
      const rec: SavedScenarioRecord = {
        id: `rec_${Date.now()}`,
        title,
        mapId: actionRecorderRef.current.mapId || activeMap.id,
        yaml: generatedYaml,
        source: 'recorded',
        updatedAt: Date.now()
      };
      await reg.saveScenarioRecord(rec);
      setSelectedScenarioId(rec.id);
      setPackVersion((v) => v + 1);
      setPendingSaveMode(null);
      setPlaying(true);
      await loadScenario(generatedYaml, `تم حفظ "${title}" (${actionRecorderRef.current.steps.length} خطوة)`, rec.id);
    } else if (pendingSaveMode === 'code') {
      const parsed = yaml.load(yamlText) as ScenarioFile;
      const rec: SavedScenarioRecord = {
        id: `scen_${Date.now()}`,
        title,
        mapId: parsed?.meta?.map ?? activeMap.id,
        yaml: yamlText,
        source: 'code',
        updatedAt: Date.now()
      };
      await reg.saveScenarioRecord(rec);
      setSelectedScenarioId(rec.id);
      setPackVersion((v) => v + 1);
      setPendingSaveMode(null);
      await studioDb.setSetting('lastScenarioId', rec.id);
      setStatusNotice(`تم حفظ "${title}"`);
    }
  };

  const handleLoadSelectedScenario = async () => {
    const rec = registryRef.current!.scenarios.find((s) => s.id === selectedScenarioId);
    if (!rec) return;
    setYamlText(rec.yaml);
    setPlaying(true);
    await loadScenario(rec.yaml, `تم تشغيل "${rec.title}"`, rec.id);
  };

  const handleDeleteSelectedScenario = async () => {
    if (!selectedScenarioId) return;
    const deletedId = selectedScenarioId;
    const reg = registryRef.current!;
    await reg.deleteScenarioRecord(deletedId);
    setPackVersion((v) => v + 1);
    const nextId = reg.scenarios[0]?.id ?? '';
    setSelectedScenarioId(nextId);
    const storedLastId = await studioDb.getSetting<string>('lastScenarioId');
    if (storedLastId === deletedId) {
      await studioDb.setSetting('lastScenarioId', nextId);
    }
    setStatusNotice('تم حذف السيناريو');
  };

  const handleRecCamera = () => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    const c = renderer.getCameraState();
    actionRecorderRef.current.recordCamera(c.x, c.y, c.zoom);
    showToast('📷 تم تسجيل لقطة الكاميرا');
  };

  const handleRecCaptionSubmit = (text: string) => {
    if (!engineRef.current) return;
    engineRef.current.caption = text;
    actionRecorderRef.current.recordCaption(text);
    syncHudFromEngine(engineRef.current);
  };

  const handleRecArrow = () => {
    pendingActionModeRef.current = 'arrow_start';
    showToast('اضغط نقطة بداية السهم ثم نقطة نهايته');
  };

  const handleRecPulse = () => {
    pendingActionModeRef.current = 'pulse';
    showToast('اضغط على الخريطة لوضع موجة تنبيه');
  };

  const handleRestart = () => {
    const eng = engineRef.current;
    if (!eng) return;
    eng.reset();
    armedAbilityRef.current = null;
    setArmedAbility(null);
    if (rendererRef.current) {
      rendererRef.current.selectedEntityId = null;
      rendererRef.current.resumeCameraTracking();
      setSelectedEntityId(null);
    }
    syncHudFromEngine(eng);
  };

  const handleScrub = (targetTick: number) => {
    const eng = engineRef.current;
    if (!eng) return;
    setPlaying(false);
    eng.seekToTick(targetTick);
    rendererRef.current?.syncCameraImmediate(eng);
    const selId = rendererRef.current?.selectedEntityId;
    if (selId) {
      const selEnt = eng.entities.get(selId);
      setSelectedEntityScale(selEnt?.scaleMul ?? 1.0);
    }
    syncHudFromEngine(eng);
  };

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (soundRef.current) soundRef.current.muted = next;
  };

  const handleToggleAnchors = () => {
    const next = !showAnchors;
    setShowAnchors(next);
    if (rendererRef.current) rendererRef.current.showAnchors = next;
  };

  const handleToggleCinematicCamera = () => {
    setCinematicCamera((prev) => {
      const next = !prev;
      if (rendererRef.current) {
        rendererRef.current.cinematicCameraEnabled = next;
        if (next) rendererRef.current.resumeCinematicDirector();
      }
      if (!next) {
        setCinematicFocus({ kind: 'none', labelAr: '' });
      }
      void studioDb.setSetting('cinematicCamera', next);
      showToast(next ? '🎬 تم تفعيل الكاميرا السينمائية الآلية مع الأحداث' : 'تم إيقاف الكاميرا السينمائية الآلية');
      return next;
    });
  };

  const handleUploadYamlFile = async (file: File) => {
    const text = await file.text();
    setYamlText(text);
    await loadScenario(text, 'تم استيراد السيناريو وتشغيله');
  };

  const handleStageDrop = async (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    if (file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
      await handleUploadYamlFile(file);
    }
  };

  const handleToggleVideoRecord = () => {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }
    const canvas = rendererRef.current?.app?.canvas;
    if (!canvas || typeof MediaRecorder === 'undefined') {
      showToast('تصوير WebM غير مدعوم في هذا المتصفح');
      return;
    }

    if (rendererRef.current) rendererRef.current.hideUIHelpers = true;
    const videoStream = canvas.captureStream(30);
    const tracks: MediaStreamTrack[] = [...videoStream.getVideoTracks()];
    const audioStream = soundRef.current?.getAudioStream();
    if (audioStream) {
      audioStream.getAudioTracks().forEach((t) => tracks.push(t));
    }
    const combinedStream = new MediaStream(tracks);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
    const recorder = new MediaRecorder(combinedStream, { mimeType });
    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (ev) => {
      if (ev.data.size > 0) chunks.push(ev.data);
    };
    recorder.onstop = () => {
      if (rendererRef.current) rendererRef.current.hideUIHelpers = false;
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scenario-${Date.now()}.webm`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    };

    recorderRef.current = recorder;
    recorder.start(250);
    setRecording(true);
    setPlaying(true);
  };

  const reg = registryRef.current!;
  const actorsList: ActorPack[] = Object.values(reg.actors);
  const selectedRegionObj = selectedRegionId ? activeMap.regions?.[selectedRegionId] : undefined;

  const selectedEntity = selectedEntityId ? engineRef.current?.entities.get(selectedEntityId) : undefined;
  const selectedActor = selectedEntity ? reg.actors[selectedEntity.actorId] : undefined;
  const placementActor = activeTool !== 'select' ? reg.actors[activeTool] : undefined;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 h-[100dvh] w-screen bg-[#090f1a] text-slate-100 overflow-hidden select-none"
    >
      {/* المسرح التفاعلي بكامل حجم الشاشة */}
      <main
        className="relative w-full h-full overflow-hidden"
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleStageDrop}
      >
        <div
          ref={stageHostRef}
          data-strike-lock={armedAbility ? strikeLockPhase : 'off'}
          data-cinematic-cam={cinematicCamera ? (cinematicFocus.kind !== 'none' ? cinematicFocus.kind : 'ready') : 'off'}
          className={`w-full h-full touch-none ${armedAbility ? 'cursor-crosshair' : ''}`}
          aria-label="مسرح الخريطة التفاعلية"
        />

        {/* إيحاء الإطار السينمائي العلوي والسفلي دون حجب الأزرار */}
        {cinematicCamera && (
          <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-10">
            <div className="absolute top-0 left-0 right-0 h-14 bg-gradient-to-b from-black/75 via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
            <div className="absolute inset-0 shadow-[inset_0_0_80px_rgba(0,0,0,0.45)]" />
          </div>
        )}

        {/* الشريط العلوي القابل للطي فوق الخريطة (خالي تمامًا من النصوص الإرشادية وملفات الدول) */}
        <div className="pointer-events-none fixed top-2 left-2 right-2 z-30 flex flex-col items-center gap-1.5">
          <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-950/90 border border-slate-700/90 rounded-xl px-2 py-1 shadow-xl backdrop-blur-md max-w-full">
            <button
              type="button"
              id="topHudCollapseBtn"
              aria-expanded={topHudExpanded}
              onClick={() => setTopHudExpanded((v) => !v)}
              className="min-h-[36px] px-2 rounded-lg flex items-center gap-1.5 text-xs font-semibold text-sky-300 hover:bg-slate-900 whitespace-nowrap"
            >
              <Globe2 className="w-4 h-4 shrink-0" />
              <span className="truncate max-w-[130px] sm:max-w-[240px]">
                {activeMap.geoLevel === 'country'
                  ? activeMap.title.replace(' — المحافظات', '')
                  : 'خريطة العالم'}
              </span>
              {topHudExpanded ? <ChevronUp className="w-3.5 h-3.5 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0" />}
            </button>

            <button
              type="button"
              id="cinematicCamBtn"
              aria-pressed={cinematicCamera}
              aria-label="كاميرا سينمائية آلية مع الأحداث"
              title="كاميرا سينمائية آلية مع الأحداث"
              onClick={handleToggleCinematicCamera}
              className={`min-h-[34px] px-2 rounded-lg text-xs font-semibold border flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                cinematicCamera
                  ? 'bg-amber-600/95 hover:bg-amber-500 border-amber-300 text-white shadow-md shadow-amber-950/50'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              <Clapperboard className={`w-3.5 h-3.5 shrink-0 ${cinematicCamera ? 'text-white' : 'text-amber-400'}`} />
              <span className="hidden sm:inline">سينمائية</span>
            </button>

            {activeMap.geoLevel === 'world' && selectedRegionId && selectedRegionObj?.iso3 && (
              <button
                type="button"
                id="drillDownBtn"
                onClick={() => void enterCountryProvinces(selectedRegionId)}
                className="min-h-[34px] px-2.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white border border-sky-400 whitespace-nowrap shrink-0"
              >
                محافظات {selectedRegionObj.nameAr ?? selectedRegionObj.name} ↗
              </button>
            )}

            {activeMap.geoLevel === 'country' && (
              <button
                type="button"
                id="backWorldBtn"
                onClick={() => void openEmptyMapBoard('world_live')}
                className="min-h-[34px] px-2.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 whitespace-nowrap shrink-0"
              >
                ↩ خريطة العالم
              </button>
            )}
          </div>

          {cinematicCamera && (
            <div
              id="cinematicStatusPill"
              className={`pointer-events-none px-2.5 py-0.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 shadow-lg backdrop-blur-md ${
                cinematicFocus.kind !== 'none'
                  ? 'bg-amber-950/90 border-amber-400/80 text-amber-100'
                  : 'bg-slate-950/85 border-slate-700/80 text-slate-300'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  cinematicFocus.kind !== 'none' ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'
                }`}
              />
              <span>
                {cinematicFocus.labelAr ? `كاميرا سينمائية: ${cinematicFocus.labelAr}` : 'كاميرا سينمائية: بانتظار حدث'}
              </span>
            </div>
          )}

          {topHudExpanded && (
            <div
              id="topHudControls"
              className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 bg-slate-950/92 border border-slate-700/90 rounded-xl px-2.5 py-1.5 shadow-xl backdrop-blur-md text-xs"
            >
              <span className="font-mono tabular-nums text-sky-300 px-1.5">
                {hudState.simTimeSec.toFixed(1)}s
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-300 px-1">{hudState.entityCount} وحدة</span>
              <button
                type="button"
                onClick={() => rendererRef.current?.zoomBy(1.22)}
                aria-label="تكبير الخريطة"
                className="min-h-[36px] min-w-[36px] rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => rendererRef.current?.zoomBy(0.82)}
                aria-label="تصغير الخريطة"
                className="min-h-[36px] min-w-[36px] rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                id="fitMapBtn"
                onClick={() => rendererRef.current?.resetCamera()}
                aria-label="ملاءمة الخريطة"
                className="min-h-[36px] min-w-[36px] rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleToggleAnchors}
                aria-label={showAnchors ? 'إخفاء المراسي' : 'إظهار المراسي'}
                className="min-h-[36px] min-w-[36px] rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center"
              >
                {showAnchors ? <Eye className="w-4 h-4 text-amber-300" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
          )}

          {geoLoadingMsg && (
            <div className="pointer-events-auto bg-sky-950/95 border border-sky-400 text-sky-100 px-3 py-1 rounded-lg text-xs font-medium shadow-lg">
              {geoLoadingMsg}
            </div>
          )}
        </div>

        {/* أيقونة ومستطيل الآليات والمعدات - الزاوية اليسرى */}
        <UnitsDock
          open={unitsOpen}
          onToggleOpen={() => {
            setUnitsOpen((v) => {
              const next = !v;
              if (next && viewportSize.w < 640) setToolsOpen(false);
              return next;
            });
          }}
          actors={actorsList}
          activeTool={activeTool}
          onSelectTool={(toolId) => {
            setActiveTool(toolId);
            if (toolId !== 'select') {
              armedAbilityRef.current = null;
              setArmedAbility(null);
              if (viewportSize.w < 640) setUnitsOpen(false);
            }
          }}
          sandboxFaction={sandboxFaction}
          onChangeFaction={setSandboxFaction}
          toolScales={toolScales}
          onChangeToolScale={handleChangeToolScale}
        />

        {/* أيقونة ومستطيل الأدوات - الزاوية اليمنى */}
        <ToolsDock
          open={toolsOpen}
          onToggleOpen={() => {
            setToolsOpen((v) => {
              const next = !v;
              if (next && viewportSize.w < 640) setUnitsOpen(false);
              return next;
            });
          }}
          playing={playing}
          onTogglePlay={() => setPlaying((p) => !p)}
          onRestart={handleRestart}
          speed={speed}
          onChangeSpeed={setSpeed}
          muted={muted}
          onToggleMute={handleToggleMute}
          recordingVideo={recording}
          onToggleVideoRecord={handleToggleVideoRecord}
          cinematicCamera={cinematicCamera}
          onToggleCinematicCamera={handleToggleCinematicCamera}
          unitScale={unitScale}
          onChangeUnitScale={handleChangeUnitScale}
          onSelectMode={() => {
            setActiveTool('select');
            armedAbilityRef.current = null;
            setArmedAbility(null);
            if (viewportSize.w < 640) setToolsOpen(false);
          }}
          onClearBoard={() => void openEmptyMapBoard(activeMap.id)}
          actionRecording={actionRecording}
          recStats={recStats}
          onStartActionRecord={() => void handleStartActionRecord()}
          onStopActionRecord={handleRequestStopActionRecord}
          onRecCamera={handleRecCamera}
          onRecCaptionSubmit={handleRecCaptionSubmit}
          onRecArrow={handleRecArrow}
          onRecPulse={handleRecPulse}
          onRecDeleteUnit={() => {
            if (selectedEntityId) handleDeleteEntity(selectedEntityId);
          }}
          hasSelectedEntity={Boolean(selectedEntityId)}
          pendingSaveMode={pendingSaveMode}
          saveDraftTitle={saveDraftTitle}
          onChangeSaveDraftTitle={setSaveDraftTitle}
          onConfirmSaveScenario={() => void handleConfirmSaveScenario()}
          onCancelSaveScenario={() => setPendingSaveMode(null)}
          userScenarios={reg.scenarios}
          selectedScenarioId={selectedScenarioId}
          onSelectScenarioId={setSelectedScenarioId}
          onLoadSelectedScenario={() => void handleLoadSelectedScenario()}
          onDeleteSelectedScenario={() => void handleDeleteSelectedScenario()}
          yamlText={yamlText}
          onChangeYamlText={setYamlText}
          onRunYaml={() => {
            setPlaying(true);
            void loadScenario(yamlText, 'تم تشغيل السيناريو');
          }}
          onRequestSaveYaml={() => void handleRequestSaveYaml()}
          onUploadYamlFile={(f) => void handleUploadYamlFile(f)}
          onOpenSpecModal={() => setSpecOpen(true)}
          issues={issues}
          yamlSyntaxError={yamlSyntaxError}
          statusNotice={statusNotice}
        />

        {/* شريط القدرة وإطلاق النار الثابت في أسفل الشاشة (غير معلق على الآلية) */}
        {selectedEntity && selectedActor?.ability && (
          <UnitActionBar
            entityId={selectedEntity.id}
            actorLabel={selectedActor.label}
            actorSvg={selectedActor.svg}
            ability={selectedActor.ability}
            isArmed={armedAbility?.entityId === selectedEntity.id}
            strikeLockPhase={strikeLockPhase}
            scaleMul={selectedEntityScale}
            onToggleArm={() => {
              if (armedAbility?.entityId === selectedEntity.id) {
                armedAbilityRef.current = null;
                if (rendererRef.current) rendererRef.current.strikeModeConfig = null;
                setArmedAbility(null);
                setStrikeLockPhase('idle');
              } else {
                const next: ArmedAbilityState = {
                  entityId: selectedEntity.id,
                  mode: selectedActor.ability!.mode,
                  radius: selectedActor.ability!.radius,
                  color: selectedActor.ability!.accentColor,
                  label: selectedActor.ability!.label,
                  shortLabel: selectedActor.ability!.shortLabel
                };
                armedAbilityRef.current = next;
                if (rendererRef.current) {
                  rendererRef.current.strikeModeConfig = {
                    entityId: next.entityId,
                    mode: next.mode,
                    radius: next.radius,
                    accentColor: next.color
                  };
                }
                setArmedAbility(next);
                setStrikeLockPhase('idle');
                setActiveTool('select');
                setPlaying(true);
              }
            }}
            onChangeScale={handleChangeSelectedEntityScale}
            onDelete={() => handleDeleteEntity(selectedEntity.id)}
            onDeselect={() => {
              armedAbilityRef.current = null;
              if (rendererRef.current) {
                rendererRef.current.strikeModeConfig = null;
                rendererRef.current.selectedEntityId = null;
              }
              setArmedAbility(null);
              setStrikeLockPhase('idle');
              setSelectedEntityId(null);
            }}
          />
        )}

        {/* مؤشر وضع الإنزال أو وضع الضربات المتتالية في حال عدم إظهار شريط الآلية */}
        {(placementActor || (armedAbility && armedAbility.entityId !== selectedEntity?.id)) && (
          <div className="pointer-events-auto fixed bottom-13 left-1/2 -translate-x-1/2 z-25 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/92 border border-sky-500/70 shadow-xl backdrop-blur-md text-xs">
            <Crosshair className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-slate-100 font-medium whitespace-nowrap">
              {armedAbility
                ? `مفعّل: ${armedAbility.label} — اضغط أهدافًا متتالية`
                : `اضغط الخريطة لوضع: ${placementActor?.label}`}
            </span>
            <button
              type="button"
              onClick={() => {
                if (armedAbility) {
                  armedAbilityRef.current = null;
                  setArmedAbility(null);
                } else {
                  setActiveTool('select');
                }
              }}
              className="p-1 rounded bg-slate-800 hover:bg-red-900 text-slate-200"
              aria-label="إيقاف الوضع الحالي"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* تنبيه الأخطاء / عدم وجود مسار */}
        {toastMsg && (
          <div
            id="toastBar"
            role="alert"
            className={`pointer-events-none fixed left-1/2 -translate-x-1/2 z-40 max-w-[90vw] bg-slate-950/95 border border-amber-400/80 text-slate-100 px-3.5 py-1.5 rounded-lg text-xs font-medium text-center shadow-xl ${
              cinematicCamera ? 'top-22' : 'top-16'
            }`}
          >
            {toastMsg}
          </div>
        )}

        {/* إفلات ملف سيناريو */}
        {dragActive && (
          <div className="pointer-events-none fixed inset-4 z-40 flex items-center justify-center rounded-xl border-2 border-dashed border-sky-400 bg-slate-950/85">
            <p className="text-sm font-semibold text-sky-300">أفلت ملف السيناريو (.yaml) هنا</p>
          </div>
        )}

        {/* شريط التعليق السينمائي */}
        {hudState.caption && (
          <div
            id="captionBar"
            data-testid="caption-bar"
            className={`pointer-events-none fixed left-1/2 -translate-x-1/2 z-20 max-w-[88vw] bg-slate-950/92 border border-sky-500/70 px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-100 text-center shadow-xl ${
              selectedEntity && selectedActor?.ability
                ? 'bottom-30'
                : placementActor || armedAbility
                  ? 'bottom-24'
                  : 'bottom-14'
            }`}
          >
            {hudState.caption}
          </div>
        )}

        {/* شريط الزمن القابل للطي في أسفل الشاشة */}
        <div className="fixed bottom-2 left-2 right-2 z-25 flex items-center justify-center pointer-events-none">
          {!timelineOpen ? (
            <button
              type="button"
              id="timelineToggleBtn"
              aria-expanded={false}
              onClick={() => setTimelineOpen(true)}
              className="pointer-events-auto min-h-[34px] px-3 rounded-lg bg-slate-950/88 border border-slate-700/90 text-xs font-mono tabular-nums text-sky-300 flex items-center gap-1.5 shadow-lg backdrop-blur-md hover:bg-slate-900"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{hudState.simTimeSec.toFixed(1)}s</span>
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            </button>
          ) : (
            <div
              aria-label="شريط الزمن التفاعلي"
              className="pointer-events-auto w-full max-w-xl bg-slate-950/94 border border-slate-700/90 rounded-xl px-3 py-1.5 flex items-center gap-2.5 text-xs shadow-xl backdrop-blur-md"
            >
              <button
                type="button"
                onClick={() => setTimelineOpen(false)}
                aria-label="طي شريط الزمن"
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 shrink-0"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <span id="timeLabel" className="font-mono tabular-nums text-sky-300 w-10 shrink-0 text-center">
                {hudState.simTimeSec.toFixed(1)}s
              </span>
              <input
                id="timeScrubber"
                type="range"
                aria-label="التقديم والترجيع في شريط الزمن"
                min={0}
                max={hudState.maxTicks}
                value={Math.min(hudState.maxTicks, hudState.tick)}
                onChange={(e) => handleScrub(parseInt(e.target.value, 10))}
                className="flex-1 accent-sky-400 cursor-pointer"
              />
              <span id="durLabel" className="font-mono tabular-nums text-slate-400 w-10 shrink-0 text-center">
                {(hudState.maxTicks / TICK_RATE).toFixed(1)}s
              </span>
            </div>
          )}
        </div>
      </main>

      <SpecModal
        open={specOpen}
        onClose={() => setSpecOpen(false)}
        activeMap={activeMap}
        maps={reg.maps}
        actors={reg.actors}
      />
    </div>
  );
}
