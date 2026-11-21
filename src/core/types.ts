export type Domain = 'land' | 'sea' | 'air';
export type Faction = 'blue' | 'red' | 'neutral';
export type SoundId =
  | 'build_complete'
  | 'alert_ping'
  | 'move_order'
  | 'spawn_pop'
  | 'jet_takeoff'
  | 'missile_launch'
  | 'explosion'
  | 'ship_horn'
  | 'cannon_fire'
  | 'gunfire_burst'
  | 'artillery_fire'
  | 'torpedo_launch'
  | 'radar_ping';

export type StrikeMode =
  | 'airstrike'
  | 'missile'
  | 'shell'
  | 'bullet'
  | 'artillery'
  | 'interceptor'
  | 'torpedo'
  | 'scan';

export type UnitCategory = 'infantry' | 'armor' | 'air' | 'naval' | 'building';

export interface UnitAbilityDef {
  mode: StrikeMode;
  label: string;
  shortLabel: string;
  category: UnitCategory;
  accentColor: string;
  radius: number;
}

// خلايا شبكة الملاحة: 0 = يابسة، 1 = ماء، 2 = عائق صلب، 3 = قناة / جسر مشترك
export type NavCell = 0 | 1 | 2 | 3;

export interface Point {
  x: number;
  y: number;
}

export type PointRef = string | Point;

export interface MapZoneDef {
  id: string;
  label: string;
  polygon: Point[];
}

export interface GeoRegionItem {
  id: string;
  iso3?: string;
  name: string;
  nameAr?: string;
  center: Point;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  polygons: Point[][];
}

export interface MapPack {
  id: string;
  title: string;
  kind: 'geopolitical' | 'tactical';
  width: number;
  height: number;
  cellSize: number;
  cols: number;
  rows: number;
  navGrid: NavCell[]; // cols * rows
  svgOrUrl: string;
  unitScaleMultiplier?: number;
  anchors: Record<string, Point & { label?: string }>;
  zones: Record<string, MapZoneDef>;
  // إضافات الخريطة التفاعلية الحية
  geoLevel?: 'world' | 'country';
  countryIso3?: string;
  regions?: Record<string, GeoRegionItem>;
  hitTest?: (worldPt: Point) => string | null;
}

export interface ActorTemplate {
  domain: Domain;
  kind: 'person' | 'vehicle' | 'ship' | 'building' | 'air';
  speed: number; // world units / second
  turnRate: number; // rad / second
  scale: number; // target height in world units
  radius: number;
}

export interface ActorPack extends ActorTemplate {
  id: string;
  label: string;
  extends?: string;
  svg: string;
  ability?: UnitAbilityDef;
}

export interface PackBundle {
  maps?: MapPack[];
  actors?: ActorPack[];
}

export interface ScenarioStep {
  id?: string;
  at?: string;
  after?: string; // "<entityId>.arrived" | "<entityId>.built"
  camera?: { focus: PointRef; zoom?: number; duration?: string };
  caption?: { text: string };
  sound?: SoundId;
  spawn?: Array<{ id: string; actor: string; at: PointRef; faction?: Faction; scale?: number }>;
  move?: { entity: string; to: PointRef };
  construct?: { id?: string; actor: string; at: PointRef; faction?: Faction; duration?: string; scale?: number };
  resize?: { entity: string; scale: number };
  remove?: { entity: string };
  draw_arrow?: { id: string; from: PointRef; to: PointRef; color?: string; dashed?: boolean; duration?: string };
  zone?: { id: string; color: string; opacity?: number; duration?: string };
  callout?: { id: string; target: string; text: string; color?: string; duration?: string };
  pulse?: { at: PointRef; color?: string; radius?: number };
  strike?: {
    attacker?: string;
    mode: StrikeMode;
    from?: PointRef;
    to: PointRef;
    radius?: number;
    color?: string;
  };
}

export interface ScenarioFile {
  meta: { title: string; map: string; duration_hint?: string };
  timeline: ScenarioStep[];
}

export interface SavedScenarioRecord {
  id: string;
  title: string;
  mapId: string;
  yaml: string;
  source: 'preset' | 'recorded' | 'code';
  updatedAt: number;
}

export interface EntityState {
  id: string;
  actorId: string;
  kind: ActorTemplate['kind'];
  domain: Domain;
  faction: Faction;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  angle: number;
  prevAngle: number;
  currentSpeed: number;
  altitude: number; // 0 = على الأرض/المدرج، 1 = التحليق
  prevAltitude: number;
  bankAngle: number;
  path: Point[];
  speed: number;
  turnRate: number;
  scale: number;
  scaleMul: number;
  radius: number;
  buildProgress: number; // 0..1 (1 = مكتمل)
  buildRate: number;
  isMoving: boolean;
  arrivedTick: number | null;
  builtTick: number | null;
  homeX: number;
  homeY: number;
  pendingStrike: {
    to: Point;
    radius: number;
    mode: StrikeMode;
    color: string;
    returnTo: Point;
  } | null;
}

export interface ProjectileState {
  id: string;
  mode: 'bomb' | 'missile' | 'shell' | 'bullet' | 'artillery' | 'interceptor' | 'torpedo';
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  altitude: number; // ارتفاع القوس الباليستي / السقوط
  progress: number; // 0..1
  delaySec?: number; // تأخير إطلاق الرشقات المتتابعة
  durationSec: number;
  radius: number;
  color: string;
  faction: Faction;
  impactDamage?: boolean;
}

export interface MuzzleFlashState {
  x: number;
  y: number;
  angle: number;
  kind: 'cannon' | 'bullet' | 'missile' | 'artillery';
  color: number;
  progress: number;
}

export interface ExplosionState {
  id: string;
  x: number;
  y: number;
  maxRadius: number;
  progress: number; // 0..1
  color: string;
  kind: 'airstrike' | 'missile' | 'shell' | 'bullet' | 'artillery' | 'interceptor' | 'torpedo';
}

export interface CraterDecal {
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
}

export interface ArrowState {
  id: string;
  from: Point;
  to: Point;
  color: string;
  dashed: boolean;
  progress: number;
  rate: number;
}

export interface ZoneVisualState {
  id: string;
  color: string;
  targetOpacity: number;
  opacity: number;
  rate: number;
}

export interface CalloutState {
  id: string;
  target: string; // entityId أو anchorId
  text: string;
  color: string;
  remainingTicks: number | null; // null = يبقى دائمًا
}

export interface PulseState {
  x: number;
  y: number;
  color: string;
  maxRadius: number;
  progress: number; // 0..1
}

export interface CameraTarget {
  x: number;
  y: number;
  zoom: number;
  durationSec: number;
  seq: number;
}

export type Order =
  | { type: 'spawn'; id: string; actorId: string; at: Point; faction: Faction; scale?: number }
  | { type: 'move'; entityId: string; to: Point }
  | { type: 'construct'; id: string; actorId: string; at: Point; faction: Faction; durationSec: number; scale?: number }
  | { type: 'resize'; entityId: string; scale: number }
  | { type: 'remove'; entityId: string }
  | {
      type: 'strike';
      attackerId?: string;
      mode: StrikeMode;
      from?: Point;
      to: Point;
      radius?: number;
      color?: string;
      faction?: Faction;
    };

export interface ValidationIssue {
  stepIndex: number;
  field: string;
  message: string;
}
