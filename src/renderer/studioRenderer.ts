import { Application, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { CinematicDirector, CinematicFocusKind } from '../core/cinematicDirector';
import { StudioEngine, normalizeAngleDiff } from '../core/engine';
import {
  LOCK_MOVE_TOLERANCE_PX,
  StrikeLockPhase,
  StrikeModeConfig,
  TargetingLockCandidate,
  computeLockedStrikeRadius,
  computeTargetingLockProgress,
  getAggressiveLockStyle
} from '../core/targetingLock';
import {
  EntityState,
  ExplosionState,
  Faction,
  MapPack,
  MuzzleFlashState,
  Point,
  ProjectileState
} from '../core/types';
import { sanitizeAssetUrl } from '../packs/packSchema';

async function loadSvgOrUrlTexture(src: string, fallbackW = 128, fallbackH = 128): Promise<Texture> {
  const safeSrc = sanitizeAssetUrl(src);
  if (!safeSrc) return Texture.EMPTY;
  const isSvg = safeSrc.startsWith('<svg');
  let url = safeSrc;
  let w = fallbackW;
  let h = fallbackH;

  if (isSvg) {
    const vbMatch = safeSrc.match(/viewBox=["']\s*[\d.-]+\s+[\d.-]+\s+([\d.]+)\s+([\d.]+)\s*["']/i);
    if (vbMatch) {
      w = Math.max(1, Math.round(parseFloat(vbMatch[1])));
      h = Math.max(1, Math.round(parseFloat(vbMatch[2])));
    }
    let normalizedSvg = safeSrc;
    if (!/\bwidth=/.test(normalizedSvg.slice(0, 220))) {
      normalizedSvg = normalizedSvg.replace('<svg', `<svg width="${w}" height="${h}"`);
    }
    url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(normalizedSvg)}`;
  }

  const img = new Image();
  img.crossOrigin = 'anonymous';
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load texture image'));
      img.src = url;
    });
  } catch {
    return Texture.EMPTY;
  }
  if (img.decode) {
    try {
      await img.decode();
    } catch {
      // Already decoded on load
    }
  }

  const outW = isSvg ? (w < 256 ? w * 2 : w) : Math.max(1, img.naturalWidth || w);
  const outH = isSvg ? (h < 256 ? h * 2 : h) : Math.max(1, img.naturalHeight || h);
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, outW, outH);
    ctx.drawImage(img, 0, 0, outW, outH);
  }
  return Texture.from(canvas);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpAngle(a: number, b: number, t: number): number {
  return a + normalizeAngleDiff(b, a) * t;
}

const FACTION_COLOR: Record<Faction, number> = {
  blue: 0x38bdf8,
  red: 0xef4444,
  neutral: 0x94a3b8
};

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
  color: number;
}

interface FxParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  drag: number;
  rise: number;
  life: number;
  maxLife: number;
  startRadius: number;
  endRadius: number;
  startAlpha: number;
  color: number;
}

interface WakeRipple {
  x: number;
  y: number;
  angle: number;
  width: number;
  life: number;
  maxLife: number;
}

export interface EditorOverlayState {
  enabled: boolean;
  showNavGrid: boolean;
  paintActive: boolean;
  draftZonePoints: Point[];
}

interface EntityView {
  container: Container;
  sprite: Sprite;
  baseSpriteScale: number;
  isElongated: boolean;
  shadow: Graphics;
  factionHalo: Graphics;
  ring: Graphics;
  buildArc: Graphics;
  rotor?: Graphics;
}

interface CalloutView {
  container: Container;
  bg: Graphics;
  label: Text;
  lastText: string;
  lastColor: string;
}

export class StudioRenderer {
  public app = new Application();
  private world = new Container();
  private mapLayer = new Container();
  private countryTintGraphics = new Graphics();
  private geoHoverGraphics = new Graphics();
  private geoSelectGraphics = new Graphics();
  private navOverlay = new Graphics();
  private zoneGraphics = new Graphics();
  private craterGraphics = new Graphics();
  private wakeGraphics = new Graphics();
  private pathGraphics = new Graphics();
  private arrowGraphics = new Graphics();
  private pulseGraphics = new Graphics();
  private particleGraphics = new Graphics();
  private anchorLayer = new Container();
  private entityLayer = new Container();
  private projectileGraphics = new Graphics();
  private explosionGraphics = new Graphics();
  private fxParticleGraphics = new Graphics();
  private targetingGraphics = new Graphics();
  private calloutLayer = new Container();

  private actorTextures = new Map<string, Texture>();
  private entityViews = new Map<string, EntityView>();
  private calloutViews = new Map<string, CalloutView>();
  private particles: Particle[] = [];
  private fxParticles: FxParticle[] = [];
  private wakeRipples: WakeRipple[] = [];
  private seenMuzzleFlashes = new WeakSet<MuzzleFlashState>();
  private seenProjectiles = new WeakSet<ProjectileState>();
  private seenExplosions = new WeakSet<ExplosionState>();
  private lockCandidate: TargetingLockCandidate | null = null;
  private hoverWorldPt: Point | null = null;
  private cinematicDirector = new CinematicDirector();
  private lastCinematicLabel = '';

  private camX = 600;
  private camY = 400;
  private camZoom = 1;
  private lastCamSeq = -1;
  private currentTargetSeq = 0;
  private activePointers = new Map<number, Point>();
  private pointerDownClient: Point | null = null;
  private pinchUsed = false;
  private painting = false;
  private dragMoved = false;
  private mapWidth = 1200;
  private mapHeight = 800;
  private lastUnitFactor = 1;
  private currentHitTest?: (pt: Point) => string | null;
  private lastEmittedSelPos: { id: string; x: number; y: number } | null = null;
  private userAdjustedCamera = false;
  private lastScreenW = 0;
  private lastScreenH = 0;

  public userUnitScale = 1.0;
  public selectedEntityId: string | null = null;
  public hoveredRegionId: string | null = null;
  public selectedRegionId: string | null = null;
  public hideUIHelpers = false;
  public showAnchors = true;
  public cinematicCameraEnabled = false;
  private countryColorMap: Record<string, string> = {};
  private countryTintDirty = true;

  setCountryColorMap(colors: Record<string, string>): void {
    this.countryColorMap = colors;
    this.countryTintDirty = true;
  }
  public editorOverlay: EditorOverlayState = {
    enabled: false,
    showNavGrid: false,
    paintActive: false,
    draftZonePoints: []
  };

  getCameraState(): { x: number; y: number; zoom: number } {
    return { x: this.camX, y: this.camY, zoom: this.camZoom };
  }

  worldToScreen(pt: Point): Point {
    return {
      x: (pt.x - this.camX) * this.camZoom + this.app.screen.width / 2,
      y: (pt.y - this.camY) * this.camZoom + this.app.screen.height / 2
    };
  }

  private getMinZoom(): number {
    const sw = Math.max(1, this.app.screen.width);
    const sh = Math.max(1, this.app.screen.height);
    const fitZoom = Math.min(sw / Math.max(1, this.mapWidth), sh / Math.max(1, this.mapHeight)) * 0.94;
    return Math.max(0.08, Math.min(0.28, fitZoom * 0.72));
  }

  private clampZoom(z: number): number {
    return Math.max(this.getMinZoom(), Math.min(6.0, z));
  }

  public strikeModeConfig: StrikeModeConfig | null = null;

  public onMapClick?: (
    worldPt: Point,
    clickedEntityId: string | null,
    shiftKey?: boolean,
    lockPhase?: StrikeLockPhase
  ) => void;
  public onStrikeLockChange?: (phase: StrikeLockPhase, targetPt?: Point, targetEntityId?: string | null) => void;
  public onCinematicFocusChange?: (kind: CinematicFocusKind, labelAr: string) => void;
  public onMapPaint?: (worldPt: Point) => void;
  public onSelectionChange?: (entityId: string | null) => void;
  public onSelectedScreenPos?: (pos: { id: string; x: number; y: number; offsetPx: number } | null) => void;
  public onRegionHover?: (regionId: string | null) => void;
  public onRegionDoubleClick?: (regionId: string) => void;

  private cleanupListeners: Array<() => void> = [];
  private destroyed = false;

  async init(host: HTMLElement): Promise<void> {
    try {
      await this.app.init({
        resizeTo: host,
        backgroundColor: 0x090f1a,
        antialias: true,
        preference: 'webgl',
        preserveDrawingBuffer: true
      });
    } catch {
      await this.app.init({
        resizeTo: host,
        backgroundColor: 0x090f1a,
        antialias: true,
        preserveDrawingBuffer: true
      });
    }
    if (this.destroyed) return;
    this.app.canvas.style.display = 'block';
    this.app.canvas.style.width = '100%';
    this.app.canvas.style.height = '100%';
    this.app.canvas.style.touchAction = 'none';
    this.app.canvas.setAttribute('data-testid', 'studio-canvas');
    host.appendChild(this.app.canvas);

    this.world.addChild(
      this.mapLayer,
      this.countryTintGraphics,
      this.geoHoverGraphics,
      this.geoSelectGraphics,
      this.navOverlay,
      this.zoneGraphics,
      this.craterGraphics,
      this.wakeGraphics,
      this.pathGraphics,
      this.arrowGraphics,
      this.pulseGraphics,
      this.particleGraphics,
      this.anchorLayer,
      this.entityLayer,
      this.projectileGraphics,
      this.explosionGraphics,
      this.fxParticleGraphics,
      this.targetingGraphics,
      this.calloutLayer
    );
    this.app.stage.addChild(this.world);
    this.setupPointerEvents();
  }

  private screenToWorld(clientX: number, clientY: number): Point {
    const rect = this.app.canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    return {
      x: (sx - this.app.screen.width / 2) / this.camZoom + this.camX,
      y: (sy - this.app.screen.height / 2) / this.camZoom + this.camY
    };
  }

  private setupPointerEvents(): void {
    const canvas = this.app.canvas;

    const onPointerDown = (e: PointerEvent) => {
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // Ignore capture failures on synthetic events
      }
      const pt = { x: e.clientX, y: e.clientY };
      this.activePointers.set(e.pointerId, pt);

      if (this.activePointers.size >= 2) {
        this.pinchUsed = true;
        this.dragMoved = true;
        this.painting = false;
        this.lastCamSeq = this.currentTargetSeq;
        if (this.lockCandidate) {
          if (this.lockCandidate.lastPhase !== 'idle') {
            this.onStrikeLockChange?.('idle');
          }
          this.lockCandidate = null;
        }
        return;
      }

      this.pinchUsed = false;
      if (this.editorOverlay.enabled && (e.shiftKey || (this.editorOverlay.paintActive && e.button === 0))) {
        this.painting = true;
        this.dragMoved = true;
        this.onMapPaint?.(this.screenToWorld(e.clientX, e.clientY));
        return;
      }
      this.painting = false;
      this.dragMoved = false;
      this.pointerDownClient = pt;

      if (this.strikeModeConfig && e.button === 0) {
        const wpt = this.screenToWorld(e.clientX, e.clientY);
        this.hoverWorldPt = wpt;
        this.lockCandidate = {
          startClient: pt,
          currentClient: pt,
          worldPt: wpt,
          targetEntityId: this.pickEntity(wpt.x, wpt.y),
          startedAtMs: performance.now(),
          lastPhase: 'idle'
        };
      } else {
        this.lockCandidate = null;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!this.activePointers.has(e.pointerId)) return;

      if (this.activePointers.size >= 2) {
        const ptsBefore = [...this.activePointers.entries()];
        const p1Before = ptsBefore[0][1];
        const p2Before = ptsBefore[1][1];
        const prevDist = Math.hypot(p2Before.x - p1Before.x, p2Before.y - p1Before.y);
        const prevMid = { x: (p1Before.x + p2Before.x) / 2, y: (p1Before.y + p2Before.y) / 2 };

        this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const ptsAfter = [...this.activePointers.values()];
        const p1After = ptsAfter[0];
        const p2After = ptsAfter[1];
        const currDist = Math.hypot(p2After.x - p1After.x, p2After.y - p1After.y);
        const currMid = { x: (p1After.x + p2After.x) / 2, y: (p1After.y + p2After.y) / 2 };

        if (prevDist > 8 && currDist > 8) {
          const rect = canvas.getBoundingClientRect();
          const sw = this.app.screen.width;
          const sh = this.app.screen.height;
          const worldAtPrevMidX = (prevMid.x - rect.left - sw / 2) / this.camZoom + this.camX;
          const worldAtPrevMidY = (prevMid.y - rect.top - sh / 2) / this.camZoom + this.camY;
          const nextZoom = this.clampZoom(this.camZoom * (currDist / prevDist));
          this.camZoom = nextZoom;
          this.camX = worldAtPrevMidX - (currMid.x - rect.left - sw / 2) / nextZoom;
          this.camY = worldAtPrevMidY - (currMid.y - rect.top - sh / 2) / nextZoom;
          this.lastCamSeq = this.currentTargetSeq;
          this.userAdjustedCamera = true;
          this.cinematicDirector.notifyUserInteraction(performance.now() / 1000, 2.6);
        }
        return;
      }

      const prev = this.activePointers.get(e.pointerId)!;
      this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (this.painting || (this.editorOverlay.enabled && e.shiftKey)) {
        this.onMapPaint?.(this.screenToWorld(e.clientX, e.clientY));
        return;
      }

      // أثناء وضع قفل الهدف بالضغط المطول: نثبّت التوجيه ولا نحول اللمسة إلى سحب خريطة إلا عند تحريك سريع قبل بدء القفل
      if (this.lockCandidate && this.strikeModeConfig) {
        const moveFromStart = Math.hypot(
          e.clientX - this.lockCandidate.startClient.x,
          e.clientY - this.lockCandidate.startClient.y
        );
        if (this.lockCandidate.lastPhase === 'idle' && moveFromStart > LOCK_MOVE_TOLERANCE_PX) {
          this.lockCandidate = null;
        } else {
          this.lockCandidate.currentClient = { x: e.clientX, y: e.clientY };
          const wpt = this.screenToWorld(e.clientX, e.clientY);
          this.lockCandidate.worldPt = wpt;
          this.hoverWorldPt = wpt;
          const hit = this.pickEntity(wpt.x, wpt.y);
          if (hit) this.lockCandidate.targetEntityId = hit;
          return;
        }
      }

      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      if (this.pointerDownClient && Math.hypot(e.clientX - this.pointerDownClient.x, e.clientY - this.pointerDownClient.y) > 5) {
        this.dragMoved = true;
        this.lastCamSeq = this.currentTargetSeq;
        this.userAdjustedCamera = true;
        this.cinematicDirector.notifyUserInteraction(performance.now() / 1000, 2.6);
      }
      this.camX -= dx / this.camZoom;
      this.camY -= dy / this.camZoom;
    };

    const onPointerUp = (e: PointerEvent) => {
      const hadPointer = this.activePointers.has(e.pointerId);
      this.activePointers.delete(e.pointerId);
      try {
        if (canvas.hasPointerCapture(e.pointerId)) {
          canvas.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore capture errors
      }
      if (!hadPointer) return;

      if (this.activePointers.size > 0) {
        // Still holding another finger after pinch
        return;
      }

      const wasPainting = this.painting;
      const wasPinch = this.pinchUsed;
      const wasMoved = this.dragMoved;
      const lockCand = this.lockCandidate;
      this.lockCandidate = null;
      this.painting = false;
      this.pointerDownClient = null;

      if (lockCand && lockCand.lastPhase !== 'idle') {
        const firedPhase = lockCand.lastPhase;
        this.onStrikeLockChange?.('idle');
        if (!wasPainting && !wasPinch) {
          this.cinematicDirector.resumeImmediately();
          this.onMapClick?.(lockCand.worldPt, lockCand.targetEntityId, e.shiftKey, firedPhase);
        }
        return;
      }

      if (!wasPainting && !wasPinch && !wasMoved && e.target === canvas) {
        const pt = this.screenToWorld(e.clientX, e.clientY);
        const hit = this.pickEntity(pt.x, pt.y);
        if (this.strikeModeConfig || this.selectedEntityId) {
          this.cinematicDirector.resumeImmediately();
        }
        this.onMapClick?.(pt, hit, e.shiftKey, 'idle');
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      this.lastCamSeq = this.currentTargetSeq;
      this.userAdjustedCamera = true;
      this.cinematicDirector.notifyUserInteraction(performance.now() / 1000, 2.6);
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      this.camZoom = this.clampZoom(this.camZoom * factor);
    };

    const onCanvasHoverMove = (e: PointerEvent) => {
      if (this.activePointers.size > 0) return;
      const pt = this.screenToWorld(e.clientX, e.clientY);
      this.hoverWorldPt = pt;
      if (!this.currentHitTest) return;
      const hit = this.currentHitTest(pt);
      if (hit !== this.hoveredRegionId) {
        this.hoveredRegionId = hit;
        this.onRegionHover?.(hit);
      }
    };

    const onCanvasDblClick = (e: MouseEvent) => {
      if (!this.currentHitTest) return;
      const pt = this.screenToWorld(e.clientX, e.clientY);
      const hit = this.currentHitTest(pt);
      if (hit) this.onRegionDoubleClick?.(hit);
    };

    const onPointerLeave = () => {
      this.hoverWorldPt = null;
      if (this.hoveredRegionId !== null) {
        this.hoveredRegionId = null;
        this.onRegionHover?.(null);
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onCanvasHoverMove);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('dblclick', onCanvasDblClick);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    this.cleanupListeners.push(() => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onCanvasHoverMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('dblclick', onCanvasDblClick);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
    });
  }

  private pickEntity(wx: number, wy: number): string | null {
    for (const [id, view] of this.entityViews) {
      const hitRadius = Math.max(18 / this.camZoom, 24 * view.container.scale.x);
      if (Math.hypot(view.container.x - wx, view.container.y - wy) <= hitRadius) return id;
    }
    return null;
  }

  private computeClampedCameraGoal(targetX: number, targetY: number, targetZoom: number): { x: number; y: number } {
    const halfW = this.app.screen.width / (2 * targetZoom);
    const halfH = this.app.screen.height / (2 * targetZoom);
    return {
      x:
        halfW * 2 >= this.mapWidth
          ? this.mapWidth / 2
          : Math.max(halfW, Math.min(this.mapWidth - halfW, targetX)),
      y:
        halfH * 2 >= this.mapHeight
          ? this.mapHeight / 2
          : Math.max(halfH, Math.min(this.mapHeight - halfH, targetY))
    };
  }

  zoomBy(factor: number): void {
    this.lastCamSeq = this.currentTargetSeq;
    this.userAdjustedCamera = true;
    this.cinematicDirector.notifyUserInteraction(performance.now() / 1000, 2.4);
    this.camZoom = this.clampZoom(this.camZoom * factor);
  }

  resetCamera(): void {
    this.lastCamSeq = this.currentTargetSeq;
    this.userAdjustedCamera = false;
    this.cinematicDirector.notifyUserInteraction(performance.now() / 1000, 2.2);
    this.camX = this.mapWidth / 2;
    this.camY = this.mapHeight / 2;
    const sw = Math.max(1, this.app.screen.width);
    const sh = Math.max(1, this.app.screen.height);
    this.lastScreenW = sw;
    this.lastScreenH = sh;
    this.camZoom = Math.min(sw / this.mapWidth, sh / this.mapHeight) * 0.94;
  }

  resumeCameraTracking(): void {
    this.lastCamSeq = -1;
    this.cinematicDirector.reset();
    this.lastCinematicLabel = '';
    this.onCinematicFocusChange?.('none', '');
  }

  resumeCinematicDirector(): void {
    this.cinematicDirector.resumeImmediately();
  }

  syncCameraImmediate(engine: StudioEngine): void {
    if (engine.cameraTarget) {
      this.currentTargetSeq = engine.cameraTarget.seq;
      const clamped = this.computeClampedCameraGoal(
        engine.cameraTarget.x,
        engine.cameraTarget.y,
        engine.cameraTarget.zoom
      );
      this.camX = clamped.x;
      this.camY = clamped.y;
      this.camZoom = engine.cameraTarget.zoom;
      this.lastCamSeq = engine.cameraTarget.seq;
    }
    this.particles = [];
    this.fxParticles = [];
    this.wakeRipples = [];
    this.seenMuzzleFlashes = new WeakSet();
    this.seenProjectiles = new WeakSet();
    this.seenExplosions = new WeakSet();
  }

  async syncActorTextures(actors: Record<string, { id: string; svg: string }>): Promise<void> {
    for (const actor of Object.values(actors)) {
      if (!this.actorTextures.has(actor.id)) {
        this.actorTextures.set(actor.id, await loadSvgOrUrlTexture(actor.svg, 64, 64));
      }
    }
  }

  focusRegion(engine: StudioEngine, regionId: string, zoomBoost = 3.2): void {
    const reg = engine.map.regions?.[regionId];
    if (!reg) return;
    const rw = Math.max(40, reg.bounds.maxX - reg.bounds.minX);
    const rh = Math.max(40, reg.bounds.maxY - reg.bounds.minY);
    const sw = Math.max(1, this.app.screen.width);
    const sh = Math.max(1, this.app.screen.height);
    const fitZoom = Math.min(sw / rw, sh / rh) * 0.65;
    engine.cameraTarget = {
      x: reg.center.x,
      y: reg.center.y,
      zoom: Math.max(1.2, Math.min(zoomBoost, fitZoom)),
      durationSec: 0.8,
      seq: (engine.cameraTarget?.seq ?? 0) + 1
    };
  }

  private drawRegionHighlight(
    g: Graphics,
    engine: StudioEngine,
    regionId: string | null,
    fillColor: number,
    fillAlpha: number,
    strokeColor: number,
    strokeWidth: number
  ): void {
    g.clear();
    if (!regionId || !engine.map.regions || this.hideUIHelpers) return;
    const reg = engine.map.regions[regionId];
    if (!reg) return;
    for (const poly of reg.polygons) {
      if (poly.length < 3) continue;
      const flat = poly.flatMap((p) => [p.x, p.y]);
      g.poly(flat, true)
        .fill({ color: fillColor, alpha: fillAlpha })
        .stroke({ width: strokeWidth / Math.max(0.4, this.camZoom), color: strokeColor, alpha: 0.95 });
    }
  }

  refreshAnchors(map: MapPack): void {
    this.anchorLayer.removeChildren();
    if (map.geoLevel === 'world' && !this.editorOverlay.enabled) return;
    for (const [id, pt] of Object.entries(map.anchors)) {
      const dot = new Graphics()
        .circle(0, 0, 5)
        .fill({ color: 0xfef08a, alpha: 0.92 })
        .stroke({ width: 2, color: 0x0f172a });
      dot.position.set(pt.x, pt.y);
      const anchorText =
        map.geoLevel === 'country'
          ? id
          : pt.label && pt.label !== id
            ? `${pt.label} (${id})`
            : id;
      const label = new Text({
        text: anchorText,
        style: {
          fontFamily: 'IBM Plex Sans Arabic, system-ui, sans-serif',
          fontSize: map.geoLevel === 'country' ? 10 : 12,
          fontWeight: '600',
          fill: map.geoLevel === 'country' ? 0xbae6fd : 0xe2e8f0,
          stroke: { color: 0x090f1a, width: 3.5 }
        }
      });
      label.anchor.set(0.5, 1);
      label.position.set(pt.x, pt.y - 9);
      this.anchorLayer.addChild(dot, label);
    }
  }

  async loadEngineAssets(engine: StudioEngine): Promise<void> {
    this.mapLayer.removeChildren();
    this.entityLayer.removeChildren();
    this.calloutLayer.removeChildren();
    this.countryTintGraphics.clear();
    this.countryTintDirty = true;
    this.geoHoverGraphics.clear();
    this.geoSelectGraphics.clear();
    this.craterGraphics.clear();
    this.wakeGraphics.clear();
    this.projectileGraphics.clear();
    this.explosionGraphics.clear();
    this.fxParticleGraphics.clear();
    this.targetingGraphics.clear();
    this.lockCandidate = null;
    this.cinematicDirector.reset();
    this.lastCinematicLabel = '';
    this.onStrikeLockChange?.('idle');
    this.onCinematicFocusChange?.('none', '');
    this.entityViews.clear();
    this.calloutViews.clear();
    this.particles = [];
    this.fxParticles = [];
    this.wakeRipples = [];
    this.seenMuzzleFlashes = new WeakSet();
    this.seenProjectiles = new WeakSet();
    this.seenExplosions = new WeakSet();
    this.selectedEntityId = null;
    this.hoveredRegionId = null;
    this.selectedRegionId = null;
    this.currentHitTest = engine.map.hitTest;
    this.onSelectionChange?.(null);

    this.mapWidth = engine.map.width;
    this.mapHeight = engine.map.height;

    const mapTex = await loadSvgOrUrlTexture(engine.map.svgOrUrl, engine.map.width, engine.map.height);
    if (this.destroyed) return;
    const mapSprite = new Sprite(mapTex);
    mapSprite.width = engine.map.width;
    mapSprite.height = engine.map.height;
    const mapFrame = new Graphics()
      .rect(0, 0, engine.map.width, engine.map.height)
      .stroke({ width: 2, color: 0x334155, alpha: 0.9 });
    this.mapLayer.addChild(mapSprite, mapFrame);

    this.refreshAnchors(engine.map);
    await this.syncActorTextures(engine.actors);

    this.camX = engine.map.width / 2;
    this.camY = engine.map.height / 2;
    const sw = Math.max(1, this.app.screen.width);
    const sh = Math.max(1, this.app.screen.height);
    this.lastScreenW = sw;
    this.lastScreenH = sh;
    this.userAdjustedCamera = false;
    this.camZoom = Math.min(sw / engine.map.width, sh / engine.map.height) * 0.94;
    this.currentTargetSeq = engine.cameraTarget?.seq ?? 0;
    this.lastCamSeq = -1;
  }

  render(engine: StudioEngine, alpha: number, timeSec: number, frameDt = 0.016, isPlaying = true): void {
    if (this.destroyed) return;
    const curSw = Math.max(1, this.app.screen.width);
    const curSh = Math.max(1, this.app.screen.height);
    if (curSw !== this.lastScreenW || curSh !== this.lastScreenH) {
      this.lastScreenW = curSw;
      this.lastScreenH = curSh;
      if (!this.userAdjustedCamera && !engine.cameraTarget) {
        this.camX = this.mapWidth / 2;
        this.camY = this.mapHeight / 2;
        this.camZoom = Math.min(curSw / Math.max(1, this.mapWidth), curSh / Math.max(1, this.mapHeight)) * 0.94;
      }
    }
    this.anchorLayer.visible = !this.hideUIHelpers && this.showAnchors;
    if (engine.cameraTarget) {
      this.currentTargetSeq = engine.cameraTarget.seq;
    }

    const hasScriptedCamera =
      engine.cameraTarget &&
      engine.cameraTarget.seq !== this.lastCamSeq &&
      (!this.cinematicCameraEnabled || engine.cameraTarget.seq > 0);

    if (hasScriptedCamera && engine.cameraTarget) {
      const targetZoom = engine.cameraTarget.zoom;
      const goal = this.computeClampedCameraGoal(engine.cameraTarget.x, engine.cameraTarget.y, targetZoom);
      const speedFactor = 1 - Math.exp((-frameDt * 3.6) / Math.max(0.25, engine.cameraTarget.durationSec));
      this.camX = lerp(this.camX, goal.x, speedFactor);
      this.camY = lerp(this.camY, goal.y, speedFactor);
      this.camZoom = lerp(this.camZoom, targetZoom, speedFactor);
      if (
        Math.hypot(this.camX - goal.x, this.camY - goal.y) < 0.8 &&
        Math.abs(this.camZoom - targetZoom) < 0.005
      ) {
        this.lastCamSeq = engine.cameraTarget.seq;
      }
      if (this.lastCinematicLabel !== '') {
        this.lastCinematicLabel = '';
        this.onCinematicFocusChange?.('none', '');
      }
    } else if (this.cinematicCameraEnabled && !this.lockCandidate && this.activePointers.size === 0) {
      if (engine.cameraTarget && engine.cameraTarget.seq === 0) {
        this.lastCamSeq = 0;
      }
      const cin = this.cinematicDirector.evaluate(engine, timeSec, { width: curSw, height: curSh }, alpha);
      if (cin) {
        const targetZoom = this.clampZoom(cin.zoom);
        const goal = this.computeClampedCameraGoal(cin.x, cin.y, targetZoom);
        const posEase = 1 - Math.exp(-frameDt * (cin.focusKind === 'explosion' ? 4.4 : 3.2));
        const zoomEase = 1 - Math.exp(-frameDt * (cin.focusKind === 'establishing' ? 1.8 : 2.5));
        this.camX = lerp(this.camX, goal.x, posEase);
        this.camY = lerp(this.camY, goal.y, posEase);
        this.camZoom = lerp(this.camZoom, targetZoom, zoomEase);
        if (cin.labelAr !== this.lastCinematicLabel) {
          this.lastCinematicLabel = cin.labelAr;
          this.onCinematicFocusChange?.(cin.focusKind, cin.labelAr);
        }
      } else if (this.lastCinematicLabel !== '') {
        this.lastCinematicLabel = '';
        this.onCinematicFocusChange?.('none', '');
      }
    } else if (!this.cinematicCameraEnabled && this.lastCinematicLabel !== '') {
      this.lastCinematicLabel = '';
      this.onCinematicFocusChange?.('none', '');
    }

    // اهتزاز كاميرا خفيف لحظة الانفجارات الحية دون التأثير على camX/camY
    let shakeX = 0;
    let shakeY = 0;
    for (const ex of engine.explosions) {
      if (ex.progress < 0.35) {
        const amp = (1 - ex.progress / 0.35) * (ex.kind === 'missile' ? 5.5 : 3.5);
        shakeX += Math.sin(timeSec * 65 + ex.x) * amp;
        shakeY += Math.cos(timeSec * 58 + ex.y) * amp;
      }
    }

    this.world.position.set(this.app.screen.width / 2 + shakeX, this.app.screen.height / 2 + shakeY);
    this.world.scale.set(this.camZoom);
    this.world.pivot.set(this.camX, this.camY);

    if (this.countryTintDirty) {
      this.countryTintDirty = false;
      this.countryTintGraphics.clear();
      if (engine.map.geoLevel === 'world' && engine.map.regions) {
        for (const [regId, hex] of Object.entries(this.countryColorMap)) {
          const reg = engine.map.regions[regId];
          if (!reg) continue;
          const numericCol = parseInt(hex.replace('#', ''), 16);
          if (!Number.isFinite(numericCol)) continue;
          for (const poly of reg.polygons) {
            if (poly.length < 3) continue;
            const flat = poly.flatMap((p) => [p.x, p.y]);
            this.countryTintGraphics
              .poly(flat, true)
              .fill({ color: numericCol, alpha: 0.34 })
              .stroke({ width: 0.9, color: numericCol, alpha: 0.72 });
          }
        }
      }
    }

    // تمييز الدولة أو المحافظة عند التمرير والتحديد
    this.drawRegionHighlight(this.geoHoverGraphics, engine, this.hoveredRegionId, 0x38bdf8, 0.22, 0x38bdf8, 1.9);
    const selHex = this.selectedRegionId ? this.countryColorMap[this.selectedRegionId] : undefined;
    const selTint = selHex ? parseInt(selHex.replace('#', ''), 16) : 0xf59e0b;
    this.drawRegionHighlight(
      this.geoSelectGraphics,
      engine,
      this.selectedRegionId,
      Number.isFinite(selTint) ? selTint : 0xf59e0b,
      0.3,
      0xfbbf24,
      2.8
    );

    // طبقة شبكة الملاحة ومسودة المناطق في وضع صانع الخرائط
    this.navOverlay.clear();
    if (this.editorOverlay.enabled && this.editorOverlay.showNavGrid) {
      const m = engine.map;
      for (let y = 0; y < m.rows; y++) {
        for (let x = 0; x < m.cols; x++) {
          const cell = m.navGrid[y * m.cols + x];
          if (cell === 1) {
            this.navOverlay
              .rect(x * m.cellSize, y * m.cellSize, m.cellSize, m.cellSize)
              .fill({ color: 0x38bdf8, alpha: 0.25 });
          } else if (cell === 2) {
            this.navOverlay
              .rect(x * m.cellSize, y * m.cellSize, m.cellSize, m.cellSize)
              .fill({ color: 0xef4444, alpha: 0.35 });
          } else if (cell === 3) {
            this.navOverlay
              .rect(x * m.cellSize, y * m.cellSize, m.cellSize, m.cellSize)
              .fill({ color: 0x10b981, alpha: 0.35 });
          }
        }
      }
    }
    if (this.editorOverlay.enabled && this.editorOverlay.draftZonePoints.length > 0) {
      const pts = this.editorOverlay.draftZonePoints;
      pts.forEach((p) => this.navOverlay.circle(p.x, p.y, 5).fill({ color: 0xf472b6 }));
      if (pts.length > 1) {
        this.navOverlay.poly(pts.flatMap((p) => [p.x, p.y]), false).stroke({ width: 2, color: 0xf472b6 });
      }
    }

    // المناطق
    this.zoneGraphics.clear();
    for (const zState of engine.zones.values()) {
      if (zState.opacity <= 0.01) continue;
      const def = engine.map.zones[zState.id];
      if (!def) continue;
      const pts = def.polygon.flatMap((p) => [p.x, p.y]);
      this.zoneGraphics
        .poly(pts, true)
        .fill({ color: zState.color, alpha: zState.opacity })
        .stroke({ width: 2, color: zState.color, alpha: 0.85 });
    }

    // فوهات وآثار القصف الأرضية المؤقتة (تبقى قليلًا ثم تتلاشى وتختفي)
    this.craterGraphics.clear();
    for (const c of engine.craters) {
      const fade = Math.max(0, Math.min(1, (c.life / Math.max(0.1, c.maxLife)) * 1.8));
      if (fade <= 0.01) continue;
      this.craterGraphics.circle(c.x, c.y, c.radius * 1.32).fill({ color: 0x090d16, alpha: 0.38 * fade });
      this.craterGraphics
        .circle(c.x, c.y, c.radius * 0.7)
        .fill({ color: 0x1e293b, alpha: 0.72 * fade })
        .stroke({ width: 1.8, color: 0x475569, alpha: 0.65 * fade });
      this.craterGraphics.circle(c.x, c.y, c.radius * 0.32).fill({ color: 0x020617, alpha: 0.82 * fade });
    }

    // رسم مسار A* للوحدة المحددة
    this.pathGraphics.clear();
    if (!this.hideUIHelpers && this.selectedEntityId) {
      const sel = engine.entities.get(this.selectedEntityId);
      if (sel && sel.path.length > 0) {
        let px = lerp(sel.prevX, sel.x, alpha);
        let py = lerp(sel.prevY, sel.y, alpha);
        for (const wp of sel.path) {
          this.pathGraphics.moveTo(px, py).lineTo(wp.x, wp.y).stroke({ width: 2, color: 0x22c55e, alpha: 0.65 });
          px = wp.x;
          py = wp.y;
        }
        const dest = sel.path[sel.path.length - 1];
        this.pathGraphics.circle(dest.x, dest.y, 5).stroke({ width: 2, color: 0x22c55e, alpha: 0.85 });
      }
    }

    // الأسهم
    this.arrowGraphics.clear();
    for (const arr of engine.arrows.values()) {
      const mx = (arr.from.x + arr.to.x) / 2;
      const my = (arr.from.y + arr.to.y) / 2 - 55;
      const steps = 24;
      const maxStep = Math.max(1, Math.floor(steps * arr.progress));
      let prev = arr.from;
      for (let i = 1; i <= maxStep; i++) {
        const t = i / steps;
        const x = (1 - t) * (1 - t) * arr.from.x + 2 * (1 - t) * t * mx + t * t * arr.to.x;
        const y = (1 - t) * (1 - t) * arr.from.y + 2 * (1 - t) * t * my + t * t * arr.to.y;
        if (!arr.dashed || i % 2 === 1) {
          this.arrowGraphics.moveTo(prev.x, prev.y).lineTo(x, y).stroke({ width: 4, color: arr.color, alpha: 0.9 });
        }
        prev = { x, y };
      }
      if (arr.progress > 0.15) {
        const ang = Math.atan2(prev.y - my, prev.x - mx);
        this.arrowGraphics
          .poly([
            prev.x + Math.cos(ang) * 10,
            prev.y + Math.sin(ang) * 10,
            prev.x + Math.cos(ang + 2.5) * 10,
            prev.y + Math.sin(ang + 2.5) * 10,
            prev.x + Math.cos(ang - 2.5) * 10,
            prev.y + Math.sin(ang - 2.5) * 10
          ])
          .fill({ color: arr.color });
      }
    }

    // موجات التنبيه والمسح الراداري (Pulses)
    this.pulseGraphics.clear();
    for (const p of engine.pulses) {
      const r = 10 + p.maxRadius * p.progress;
      const a = Math.max(0, 1 - p.progress);
      this.pulseGraphics
        .circle(p.x, p.y, r)
        .stroke({ width: 3.2, color: p.color, alpha: a * 0.9 })
        .circle(p.x, p.y, r * 0.65)
        .stroke({ width: 1.5, color: 0xe0f2fe, alpha: a * 0.55 })
        .circle(p.x, p.y, Math.max(4, 14 * (1 - p.progress)))
        .fill({ color: p.color, alpha: a * 0.28 });
    }

    // الكيانات + جزيئات الحركة الإجرائية + تموجات البحر
    for (const [id, v] of this.entityViews) {
      if (!engine.entities.has(id)) {
        this.entityLayer.removeChild(v.container);
        v.container.destroy({ children: true });
        this.entityViews.delete(id);
      }
    }

    const mapMul = engine.map.unitScaleMultiplier ?? 1;
    const zoomComp = Math.max(0.45, Math.min(1.25, 1 / Math.pow(this.camZoom, 0.4)));
    this.lastUnitFactor = mapMul * this.userUnitScale * zoomComp;

    for (const ent of engine.entities.values()) {
      let view = this.entityViews.get(ent.id);
      if (!view) {
        view = this.createEntityView(ent);
        this.entityViews.set(ent.id, view);
        this.entityLayer.addChild(view.container);
      }

      const x = lerp(ent.prevX, ent.x, alpha);
      const y = lerp(ent.prevY, ent.y, alpha);
      const alt = lerp(ent.prevAltitude, ent.altitude, alpha);
      const smoothAng = lerpAngle(ent.prevAngle, ent.angle, alpha);

      const entScale = this.lastUnitFactor * (ent.scaleMul ?? 1);
      view.container.position.set(x, y);
      view.container.scale.set(entScale * (1 + alt * 0.28));

      // تحديث الظل الأرضي المتصل بالارتفاع والاتجاه + تدوير الأقواس التكتيكية
      if (ent.kind === 'air') {
        view.shadow.position.set(alt * 28, 8 + alt * 34);
        view.shadow.rotation = smoothAng;
        view.shadow.alpha = Math.max(0.22, 0.45 - alt * 0.16);
        view.shadow.scale.set(1 + alt * 0.14);
        view.factionHalo.rotation = smoothAng;
        view.ring.rotation = smoothAng;
      } else if (ent.kind === 'ship' || ent.kind === 'vehicle') {
        view.shadow.position.set(2, ent.scale * 0.16);
        view.shadow.rotation = smoothAng;
        view.factionHalo.rotation = smoothAng;
        view.ring.rotation = smoothAng;
      }

      if (ent.kind === 'person') {
        const bob = ent.isMoving ? Math.abs(Math.sin(timeSec * 12)) * 3 : 0;
        view.sprite.y = -bob;
        view.sprite.rotation = ent.isMoving ? Math.sin(timeSec * 12) * 0.08 : 0;
      } else if (ent.kind === 'vehicle' || ent.kind === 'ship') {
        view.sprite.rotation = smoothAng;
      } else if (ent.kind === 'air') {
        view.sprite.rotation = smoothAng;
        const bankSquash = Math.max(0.76, 1 - Math.abs(ent.bankAngle) * 0.28);
        view.sprite.scale.set(view.baseSpriteScale, view.baseSpriteScale * bankSquash);
        if (view.rotor) {
          view.rotor.rotation = timeSec * (ent.isMoving || alt > 0.05 ? 24 : 7);
        }
      }

      // موجات البحر وذيل الزبد للسفن المبحرة
      if (isPlaying && ent.domain === 'sea') {
        if (ent.isMoving && Math.random() < 0.55 && this.wakeRipples.length < 140) {
          this.wakeRipples.push({
            x: x - Math.cos(smoothAng) * (ent.radius * 0.72 * entScale),
            y: y - Math.sin(smoothAng) * (ent.radius * 0.72 * entScale),
            angle: smoothAng,
            width: Math.max(8, ent.radius * 0.55 * entScale),
            life: 1.5,
            maxLife: 1.5
          });
        }
      }

      // جزيئات غبار الآليات أو عادم/تكاثف الطائرات
      if (isPlaying && ent.isMoving && Math.random() < 0.38 && this.particles.length < 220) {
        if (ent.kind === 'air' && alt > 0.25) {
          this.particles.push({
            x: x - Math.cos(smoothAng) * (ent.radius * 0.85 * entScale),
            y: y - Math.sin(smoothAng) * (ent.radius * 0.85 * entScale),
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            life: 0.75,
            maxLife: 0.75,
            radius: 2.5 * entScale,
            color: 0xe2e8f0
          });
        } else if (ent.domain !== 'air') {
          this.particles.push({
            x: x - Math.cos(smoothAng) * (ent.radius * 0.7 * entScale),
            y: y - Math.sin(smoothAng) * (ent.radius * 0.7 * entScale),
            vx: (Math.random() - 0.5) * 14 * entScale,
            vy: (Math.random() - 0.5) * 14 * entScale,
            life: 0.65,
            maxLife: 0.65,
            radius: (ent.domain === 'sea' ? 4.2 : 3) * entScale,
            color: ent.domain === 'sea' ? 0xbae6fd : 0xd6d3d1
          });
        }
      }

      view.sprite.alpha = ent.buildProgress < 1 ? 0.35 + ent.buildProgress * 0.65 : 1;
      view.buildArc.clear();
      if (ent.buildProgress < 1) {
        view.buildArc
          .arc(0, 0, ent.radius + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ent.buildProgress)
          .stroke({ width: 3, color: 0x38bdf8 });
      }
      view.ring.visible = !this.hideUIHelpers && this.selectedEntityId === ent.id;
    }

    // رسم موجات البحر المتوسعة (Kelvin V-wakes + تموج خفيف حول السفن)
    this.wakeGraphics.clear();
    for (let i = this.wakeRipples.length - 1; i >= 0; i--) {
      const w = this.wakeRipples[i];
      w.life -= frameDt;
      if (w.life <= 0) {
        this.wakeRipples.splice(i, 1);
        continue;
      }
      const p = 1 - w.life / w.maxLife;
      const spread = w.width * (0.6 + p * 1.9);
      const back = 12 * p;
      const cos = Math.cos(w.angle);
      const sin = Math.sin(w.angle);
      const perpX = -sin;
      const perpY = cos;
      const tipX = w.x - cos * back;
      const tipY = w.y - sin * back;
      const tailBack = back + 16 * (0.4 + p);
      const leftX = w.x - cos * tailBack + perpX * spread;
      const leftY = w.y - sin * tailBack + perpY * spread;
      const rightX = w.x - cos * tailBack - perpX * spread;
      const rightY = w.y - sin * tailBack - perpY * spread;
      const alphaW = (1 - p) * 0.55;
      this.wakeGraphics
        .moveTo(leftX, leftY)
        .lineTo(tipX, tipY)
        .lineTo(rightX, rightY)
        .stroke({ width: 2.2 * (1 - p * 0.4), color: 0xe0f2fe, alpha: alphaW });
    }
    for (const ent of engine.entities.values()) {
      if (ent.domain !== 'sea') continue;
      const sx = lerp(ent.prevX, ent.x, alpha);
      const sy = lerp(ent.prevY, ent.y, alpha);
      const wavePhase = (timeSec * 0.9 + (ent.x + ent.y) * 0.01) % 1;
      const rWave = ent.radius * (0.95 + wavePhase * 0.55) * this.lastUnitFactor * (ent.scaleMul ?? 1);
      this.wakeGraphics
        .circle(sx, sy, rWave)
        .stroke({ width: 1.5, color: 0x7dd3fc, alpha: (1 - wavePhase) * 0.35 });
    }

    // تحديث ورسم الجزيئات
    this.particleGraphics.clear();
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx * frameDt;
      pt.y += pt.vy * frameDt;
      pt.life -= frameDt;
      if (pt.life <= 0) {
        this.particles.splice(i, 1);
      } else {
        const ratio = pt.life / pt.maxLife;
        this.particleGraphics
          .circle(pt.x, pt.y, pt.radius * ratio)
          .fill({ color: pt.color, alpha: ratio * 0.55 });
      }
    }

    // رسم المقذوفات والمؤثرات النارية المتنوعة (بالستي، قذيفة دبابة، رصاص، مدفعية، اعتراضي، طوربيد، قنبلة)
    this.projectileGraphics.clear();

    const spawnFxParticle = (item: FxParticle) => {
      if (this.fxParticles.length < 520) {
        this.fxParticles.push(item);
      }
    };

    // فلاش الفوهات اللحظي + دخان الإطلاق
    for (const mf of engine.muzzleFlashes) {
      if (!this.seenMuzzleFlashes.has(mf)) {
        this.seenMuzzleFlashes.add(mf);
        const puffCount = mf.kind === 'bullet' ? 3 : 8;
        for (let i = 0; i < puffCount; i++) {
          const spread = (Math.random() - 0.5) * (mf.kind === 'bullet' ? 0.55 : 0.95);
          const ang = mf.angle + spread;
          const spd = (mf.kind === 'bullet' ? 28 : 44) * (0.5 + Math.random() * 0.9);
          spawnFxParticle({
            x: mf.x,
            y: mf.y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            drag: 3.4,
            rise: -10,
            life: mf.kind === 'bullet' ? 0.42 : 0.95 + Math.random() * 0.45,
            maxLife: mf.kind === 'bullet' ? 0.42 : 1.4,
            startRadius: mf.kind === 'bullet' ? 2.2 : 4.5,
            endRadius: mf.kind === 'bullet' ? 6 : 16,
            startAlpha: mf.kind === 'bullet' ? 0.45 : 0.65,
            color: i % 3 === 0 ? 0x94a3b8 : 0x475569
          });
        }
        const sparkN = mf.kind === 'bullet' ? 4 : 7;
        for (let i = 0; i < sparkN; i++) {
          const ang = mf.angle + (Math.random() - 0.5) * 0.65;
          const spd = (mf.kind === 'bullet' ? 95 : 130) * (0.6 + Math.random() * 0.7);
          spawnFxParticle({
            x: mf.x,
            y: mf.y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            drag: 5.5,
            rise: 0,
            life: 0.24 + Math.random() * 0.14,
            maxLife: 0.38,
            startRadius: 2.2,
            endRadius: 0.4,
            startAlpha: 0.95,
            color: mf.color === 0x38bdf8 ? 0x7dd3fc : 0xfef08a
          });
        }
      }

      const fAlpha = Math.max(0, 1 - mf.progress);
      const len = (mf.kind === 'cannon' || mf.kind === 'artillery' ? 24 : 14) * (1 - mf.progress * 0.3);
      const cos = Math.cos(mf.angle);
      const sin = Math.sin(mf.angle);
      const px = -sin;
      const py = cos;
      const w = mf.kind === 'bullet' ? 3.2 : 6.4;
      // هالة وميض ناعمة حول الفوهة
      this.projectileGraphics
        .circle(mf.x + cos * 5, mf.y + sin * 5, len * 0.72)
        .fill({ color: mf.color, alpha: fAlpha * 0.34 })
        .poly([
          mf.x + px * w,
          mf.y + py * w,
          mf.x + cos * len,
          mf.y + sin * len,
          mf.x - px * w,
          mf.y - py * w
        ])
        .fill({ color: mf.color, alpha: fAlpha * 0.94 })
        // شوكات نجمة الوميض الجانبية
        .poly([
          mf.x - px * (w * 1.45),
          mf.y - py * (w * 1.45),
          mf.x + cos * (len * 0.38),
          mf.y + sin * (len * 0.38),
          mf.x + px * (w * 1.45),
          mf.y + py * (w * 1.45),
          mf.x - cos * (len * 0.2),
          mf.y - sin * (len * 0.2)
        ])
        .fill({ color: 0xfef08a, alpha: fAlpha * 0.78 })
        .circle(mf.x + cos * 3.5, mf.y + sin * 3.5, w * 0.92)
        .fill({ color: 0xffffff, alpha: fAlpha });
    }

    for (const p of engine.projectiles) {
      if (p.delaySec && p.delaySec > 0) continue;
      const gx = lerp(p.prevX, p.x, alpha);
      const gy = lerp(p.prevY, p.y, alpha);
      const arcLift = p.altitude * 48;
      const vy = gy - arcLift;

      if (!this.seenProjectiles.has(p)) {
        this.seenProjectiles.add(p);
        if (p.mode === 'missile' || p.mode === 'artillery' || p.mode === 'interceptor') {
          const isInt = p.mode === 'interceptor';
          for (let i = 0; i < 9; i++) {
            const ang = (i / 9) * Math.PI * 2 + Math.random() * 0.4;
            const spd = 22 + Math.random() * 30;
            spawnFxParticle({
              x: p.startX,
              y: p.startY,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              drag: 2.6,
              rise: -14,
              life: 1.1 + Math.random() * 0.5,
              maxLife: 1.6,
              startRadius: 4.5,
              endRadius: 15,
              startAlpha: 0.65,
              color: isInt ? 0xe0f2fe : i % 2 === 0 ? 0x64748b : 0x94a3b8
            });
          }
        } else if (p.mode === 'torpedo') {
          for (let i = 0; i < 6; i++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = 12 + Math.random() * 18;
            spawnFxParticle({
              x: p.startX,
              y: p.startY,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              drag: 3.0,
              rise: 0,
              life: 0.8 + Math.random() * 0.3,
              maxLife: 1.1,
              startRadius: 2.5,
              endRadius: 8,
              startAlpha: 0.6,
              color: 0xe0f2fe
            });
          }
        }
      }

      // ذيل دخان متراكم أثناء طيران الصواريخ والمدفعية
      if (isPlaying && (p.mode === 'missile' || p.mode === 'artillery' || p.mode === 'interceptor') && Math.random() < 0.72) {
        const isInt = p.mode === 'interceptor';
        spawnFxParticle({
          x: gx + (Math.random() - 0.5) * 2.5,
          y: vy + (Math.random() - 0.5) * 2.5,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          drag: 2.2,
          rise: -11,
          life: p.mode === 'missile' ? 1.35 : 0.9,
          maxLife: p.mode === 'missile' ? 1.35 : 0.9,
          startRadius: p.mode === 'missile' ? 3.8 : 2.6,
          endRadius: p.mode === 'missile' ? 12 : 8,
          startAlpha: 0.52,
          color: isInt ? 0xe0f2fe : Math.random() < 0.3 ? 0xfdba74 : 0x94a3b8
        });
      }

      // حلقة استهداف (لغير الرصاص السريع)
      if (p.mode !== 'bullet') {
        const targetPulse = 0.65 + 0.35 * Math.sin(timeSec * 14);
        const tr = Math.max(9, p.radius * 0.32) * (1 - p.progress * 0.4);
        this.projectileGraphics
          .circle(p.targetX, p.targetY, tr)
          .stroke({ width: 1.4, color: p.color, alpha: 0.6 * targetPulse })
          .moveTo(p.targetX - tr - 3, p.targetY)
          .lineTo(p.targetX - tr + 4, p.targetY)
          .moveTo(p.targetX + tr - 4, p.targetY)
          .lineTo(p.targetX + tr + 3, p.targetY)
          .stroke({ width: 1.4, color: p.color, alpha: 0.7 * targetPulse });
      }

      if (p.mode === 'missile' || p.mode === 'artillery' || p.mode === 'interceptor') {
        const arcPeak = p.mode === 'missile' ? 1.65 : p.mode === 'artillery' ? 0.95 : 0.55;
        const steps = p.mode === 'missile' ? 10 : p.mode === 'artillery' ? 7 : 6;
        for (let s = 1; s <= steps; s++) {
          const bt = Math.max(0, p.progress - s * 0.028);
          const bx = p.startX + (p.targetX - p.startX) * bt;
          const bAlt = Math.sin(bt * Math.PI) * arcPeak * 48;
          const by = p.startY + (p.targetY - p.startY) * bt - bAlt;
          const trailCol =
            p.mode === 'interceptor'
              ? s <= 2
                ? 0x38bdf8
                : 0xe0f2fe
              : s <= 2
                ? 0xfbbf24
                : 0xcbd5e1;
          this.projectileGraphics
            .circle(bx, by, Math.max(1.2, (p.mode === 'missile' ? 4.2 : 3.0) - s * 0.32))
            .fill({ color: trailCol, alpha: Math.max(0.12, 0.72 - s * 0.07) });
        }

        const nextT = Math.min(1, p.progress + 0.02);
        const nx = p.startX + (p.targetX - p.startX) * nextT;
        const ny = p.startY + (p.targetY - p.startY) * nextT - Math.sin(nextT * Math.PI) * arcPeak * 48;
        const mAng = Math.atan2(ny - vy, nx - gx);
        const cos = Math.cos(mAng);
        const sin = Math.sin(mAng);
        const px = -sin;
        const py = cos;

        if (p.mode === 'artillery') {
          // قذيفة مدفعية 155مم متوهجة
          this.projectileGraphics
            .ellipse(gx, gy, 3.5, 2)
            .fill({ color: 0x000000, alpha: 0.25 })
            .poly([
              gx - cos * 6 + px * 2,
              vy - sin * 6 + py * 2,
              gx + cos * 7,
              vy + sin * 7,
              gx - cos * 6 - px * 2,
              vy - sin * 6 - py * 2
            ])
            .fill({ color: 0xf97316 })
            .circle(gx - cos * 6, vy - sin * 6, 2.4)
            .fill({ color: 0xfef08a });
        } else {
          const isInt = p.mode === 'interceptor';
          const lenScale = isInt ? 0.72 : 1;
          // ظل أرضي للصاروخ
          this.projectileGraphics
            .ellipse(gx, gy, 8 * lenScale, 2.2)
            .fill({ color: 0x000000, alpha: 0.25 });

          // هالة وهج المحرك النفاث
          this.projectileGraphics
            .circle(gx - cos * 11 * lenScale, vy - sin * 11 * lenScale, 6.5 * lenScale)
            .fill({ color: isInt ? 0x38bdf8 : 0xf97316, alpha: 0.34 })
            .poly([
              gx - cos * 9 * lenScale + px * 2,
              vy - sin * 9 * lenScale + py * 2,
              gx - cos * 18 * lenScale,
              vy - sin * 18 * lenScale,
              gx - cos * 9 * lenScale - px * 2,
              vy - sin * 9 * lenScale - py * 2
            ])
            .fill({ color: isInt ? 0x38bdf8 : 0xf97316, alpha: 0.94 })
            .circle(gx - cos * 10 * lenScale, vy - sin * 10 * lenScale, 2.2)
            .fill({ color: 0xfef08a, alpha: 0.98 });

          // جسم الصاروخ + رأس حربي
          this.projectileGraphics
            .poly([
              gx - cos * 9 * lenScale + px * 2.1,
              vy - sin * 9 * lenScale + py * 2.1,
              gx + cos * 6 * lenScale + px * 2.1,
              vy + sin * 6 * lenScale + py * 2.1,
              gx + cos * 12 * lenScale,
              vy + sin * 12 * lenScale,
              gx + cos * 6 * lenScale - px * 2.1,
              vy + sin * 6 * lenScale - py * 2.1,
              gx - cos * 9 * lenScale - px * 2.1,
              vy - sin * 9 * lenScale - py * 2.1
            ])
            .fill({ color: isInt ? 0xe0f2fe : 0xf1f5f9 })
            .stroke({ width: 0.8, color: 0x334155 })
            .poly([
              gx + cos * 5 * lenScale + px * 2.1,
              vy + sin * 5 * lenScale + py * 2.1,
              gx + cos * 12 * lenScale,
              vy + sin * 12 * lenScale,
              gx + cos * 5 * lenScale - px * 2.1,
              vy + sin * 5 * lenScale - py * 2.1
            ])
            .fill({ color: isInt ? 0x0284c7 : 0xdc2626 });
        }
      } else if (p.mode === 'shell') {
        // قذيفة مدفع دبابة/بحري مستقيمة عالية السرعة
        const sAng = Math.atan2(p.targetY - p.startY, p.targetX - p.startX);
        const cos = Math.cos(sAng);
        const sin = Math.sin(sAng);
        const px = -sin;
        const py = cos;
        this.projectileGraphics
          .moveTo(gx - cos * 28, vy - sin * 28)
          .lineTo(gx, vy)
          .stroke({ width: 3.0, color: 0xf97316, alpha: 0.7 })
          .moveTo(gx - cos * 15, vy - sin * 15)
          .lineTo(gx, vy)
          .stroke({ width: 1.9, color: 0xfef08a, alpha: 0.96 })
          .poly([
            gx - cos * 4 + px * 1.9,
            vy - sin * 4 + py * 1.9,
            gx + cos * 7.5,
            vy + sin * 7.5,
            gx - cos * 4 - px * 1.9,
            vy - sin * 4 - py * 1.9
          ])
          .fill({ color: 0xffffff });
      } else if (p.mode === 'bullet') {
        // طلقات رصاص متتبعة سريعة ومستقيمة
        const bAng = Math.atan2(p.targetY - p.startY, p.targetX - p.startX);
        const cos = Math.cos(bAng);
        const sin = Math.sin(bAng);
        this.projectileGraphics
          .moveTo(gx - cos * 18, vy - sin * 18)
          .lineTo(gx, vy)
          .stroke({ width: 1.8, color: 0xfacc15, alpha: 0.9 })
          .circle(gx, vy, 1.8)
          .fill({ color: 0xffffff });
      } else if (p.mode === 'torpedo') {
        // طوربيد بحري مع ذيل فقاعات مائي مستقيم
        const tAng = Math.atan2(p.targetY - p.startY, p.targetX - p.startX);
        const cos = Math.cos(tAng);
        const sin = Math.sin(tAng);
        const px = -sin;
        const py = cos;
        for (let s = 1; s <= 7; s++) {
          const bt = Math.max(0, p.progress - s * 0.032);
          const bx = p.startX + (p.targetX - p.startX) * bt;
          const by = p.startY + (p.targetY - p.startY) * bt;
          this.projectileGraphics
            .circle(bx, by, 1.4 + s * 0.35)
            .fill({ color: 0xe0f2fe, alpha: Math.max(0.1, 0.55 - s * 0.07) });
        }
        this.projectileGraphics
          .poly([
            gx - cos * 6 + px * 1.6,
            gy - sin * 6 + py * 1.6,
            gx + cos * 8,
            gy + sin * 8,
            gx - cos * 6 - px * 1.6,
            gy - sin * 6 - py * 1.6
          ])
          .fill({ color: 0x22d3ee })
          .stroke({ width: 0.8, color: 0x0f172a });
      } else {
        // قنبلة ذكية موجهة JDAM بزعانف
        const dropDx = p.targetX - p.startX;
        const dropDy = p.targetY - p.startY + 55;
        const bAng = Math.atan2(dropDy, dropDx);
        const cos = Math.cos(bAng);
        const sin = Math.sin(bAng);
        const px = -sin;
        const py = cos;

        this.projectileGraphics.ellipse(gx, gy, 4, 2).fill({ color: 0x000000, alpha: 0.28 });
        this.projectileGraphics
          .poly([
            gx - cos * 6 + px * 3.5,
            vy - sin * 6 + py * 3.5,
            gx - cos * 2 + px * 1.6,
            vy - sin * 2 + py * 1.6,
            gx - cos * 2 - px * 1.6,
            vy - sin * 2 - py * 1.6,
            gx - cos * 6 - px * 3.5,
            vy - sin * 6 - py * 3.5
          ])
          .fill({ color: 0x475569 });
        this.projectileGraphics
          .poly([
            gx - cos * 4 + px * 1.8,
            vy - sin * 4 + py * 1.8,
            gx + cos * 3 + px * 1.8,
            vy + sin * 3 + py * 1.8,
            gx + cos * 6.5,
            vy + sin * 6.5,
            gx + cos * 3 - px * 1.8,
            vy + sin * 3 - py * 1.8,
            gx - cos * 4 - px * 1.8,
            vy - sin * 4 - py * 1.8
          ])
          .fill({ color: 0x334155 })
          .stroke({ width: 0.9, color: 0x94a3b8 });
        this.projectileGraphics
          .moveTo(gx + cos * 1.5 + px * 1.8, vy + sin * 1.5 + py * 1.8)
          .lineTo(gx + cos * 1.5 - px * 1.8, vy + sin * 1.5 - py * 1.8)
          .stroke({ width: 1.5, color: 0xfbbf24 });
      }
    }

    // الانفجارات السينمائية متعددة الطبقات + توليد سحب الدخان والشرر عند لحظة الانفجار
    this.explosionGraphics.clear();
    for (const ex of engine.explosions) {
      if (!this.seenExplosions.has(ex)) {
        this.seenExplosions.add(ex);
        if (ex.kind === 'bullet') {
          for (let i = 0; i < 6; i++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = 45 + Math.random() * 65;
            spawnFxParticle({
              x: ex.x,
              y: ex.y,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              drag: 6.5,
              rise: 0,
              life: 0.25 + Math.random() * 0.14,
              maxLife: 0.39,
              startRadius: 2.0,
              endRadius: 0.3,
              startAlpha: 0.95,
              color: i % 2 === 0 ? 0xfef08a : 0xfacc15
            });
          }
          spawnFxParticle({
            x: ex.x,
            y: ex.y,
            vx: 0,
            vy: -4,
            drag: 2.5,
            rise: -8,
            life: 0.45,
            maxLife: 0.45,
            startRadius: 3,
            endRadius: 8,
            startAlpha: 0.4,
            color: 0x94a3b8
          });
        } else if (ex.kind === 'torpedo') {
          for (let i = 0; i < 16; i++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = 25 + Math.random() * 55;
            spawnFxParticle({
              x: ex.x,
              y: ex.y,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd - 22,
              drag: 2.8,
              rise: 16,
              life: 1.0 + Math.random() * 0.6,
              maxLife: 1.6,
              startRadius: 4 + Math.random() * 4,
              endRadius: 12 + Math.random() * 6,
              startAlpha: 0.72,
              color: i % 3 === 0 ? 0xf8fafc : i % 2 === 0 ? 0xbae6fd : 0x38bdf8
            });
          }
        } else {
          const isHeavy = ex.kind === 'missile' || ex.kind === 'airstrike' || ex.kind === 'artillery';
          const isInt = ex.kind === 'interceptor';
          const smokeN = isHeavy ? 15 : 7;
          const sparkN = isHeavy ? 20 : 12;
          for (let i = 0; i < smokeN; i++) {
            const ang = (i / smokeN) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
            const spd = (isHeavy ? 18 : 14) + Math.random() * (isHeavy ? 42 : 24);
            const dur = (isHeavy ? 1.8 : 1.1) + Math.random() * 1.1;
            spawnFxParticle({
              x: ex.x + Math.cos(ang) * 4,
              y: ex.y + Math.sin(ang) * 4,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              drag: 2.2,
              rise: isHeavy ? -20 : -14,
              life: dur,
              maxLife: dur,
              startRadius: (isHeavy ? 7 : 4.5) + Math.random() * 4,
              endRadius: (isHeavy ? 24 : 14) + Math.random() * 10,
              startAlpha: isInt ? 0.55 : 0.68,
              color: isInt
                ? i % 2 === 0
                  ? 0xe0f2fe
                  : 0x94a3b8
                : i % 3 === 0
                  ? 0x1e293b
                  : i % 3 === 1
                    ? 0x334155
                    : 0x475569
            });
          }
          for (let i = 0; i < sparkN; i++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = (isHeavy ? 70 : 55) + Math.random() * (isHeavy ? 115 : 75);
            const dur = 0.42 + Math.random() * 0.42;
            spawnFxParticle({
              x: ex.x,
              y: ex.y,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              drag: 4.0,
              rise: -8,
              life: dur,
              maxLife: dur,
              startRadius: isHeavy ? 3.2 : 2.4,
              endRadius: 0.4,
              startAlpha: 1,
              color: isInt
                ? i % 2 === 0
                  ? 0xffffff
                  : 0x38bdf8
                : i % 3 === 0
                  ? 0xffffff
                  : i % 3 === 1
                    ? 0xfef08a
                    : 0xf97316
            });
          }
        }
      }

      const p = ex.progress;
      if (ex.kind === 'bullet') {
        const sparkR = Math.max(5, ex.maxRadius * 0.5);
        if (p < 0.35) {
          this.explosionGraphics
            .circle(ex.x, ex.y, sparkR * 0.55 * (1 - p / 0.35))
            .fill({ color: 0xffffff, alpha: 0.95 * (1 - p / 0.35) });
        }
        this.explosionGraphics
          .circle(ex.x, ex.y, sparkR * (0.4 + p * 0.9))
          .stroke({ width: 1.8 * (1 - p), color: 0xfef08a, alpha: Math.max(0, 1 - p) });
        for (let i = 0; i < 4; i++) {
          const ang = (i / 4) * Math.PI * 2 + (ex.x % 2);
          const d = sparkR * (0.3 + p * 0.95);
          this.explosionGraphics
            .circle(ex.x + Math.cos(ang) * d, ex.y + Math.sin(ang) * d, 2.0 * (1 - p))
            .fill({ color: 0xfacc15, alpha: 1 - p });
        }
        continue;
      }

      const isTorp = ex.kind === 'torpedo';
      const isInt = ex.kind === 'interceptor';
      const isHeavy = ex.kind === 'missile' || ex.kind === 'airstrike' || ex.kind === 'artillery';
      const ringCol = isTorp ? 0xe0f2fe : isInt ? 0x38bdf8 : 0xfef08a;
      const fireCol = isTorp ? 0x38bdf8 : isInt ? 0x0ea5e9 : 0xf97316;

      // وميض ضوئي سينمائي فوري في بداية الانفجار
      if (p < 0.24) {
        const flashRatio = 1 - p / 0.24;
        this.explosionGraphics
          .circle(ex.x, ex.y, ex.maxRadius * (isHeavy ? 1.55 : 1.05) * (0.5 + p * 2.2))
          .fill({ color: isTorp ? 0xe0f2fe : isInt ? 0x7dd3fc : 0xfef08a, alpha: flashRatio * 0.42 })
          .circle(ex.x, ex.y, ex.maxRadius * (isHeavy ? 0.8 : 0.55) * flashRatio)
          .fill({ color: 0xffffff, alpha: flashRatio * 0.92 });
      }

      // موجتا الصدمة (خارجية سريعة + داخلية حرارية)
      const rShock = ex.maxRadius * (0.25 + p * 1.15);
      const shockAlpha = Math.max(0, 1 - p) * 0.92;
      this.explosionGraphics
        .circle(ex.x, ex.y, rShock)
        .stroke({ width: (isHeavy ? 3.8 : 3.0) * (1 - p * 0.6), color: ringCol, alpha: shockAlpha });

      if (p > 0.08 && p < 0.85) {
        const p2 = (p - 0.08) / 0.77;
        this.explosionGraphics
          .circle(ex.x, ex.y, ex.maxRadius * (0.18 + p2 * 0.82))
          .stroke({ width: 2.2 * (1 - p2), color: fireCol, alpha: (1 - p2) * 0.7 });
      }

      // كرة اللهب والانفجار المتدرجة
      const rFire = ex.maxRadius * (isHeavy ? 0.74 : 0.58) * Math.sin(Math.min(1, p * 1.25) * Math.PI);
      if (rFire > 2) {
        if (!isTorp && !isInt) {
          this.explosionGraphics
            .circle(ex.x, ex.y, rFire * 1.15)
            .fill({ color: 0xdc2626, alpha: Math.max(0, 0.55 - p * 0.5) });
        }
        this.explosionGraphics
          .circle(ex.x, ex.y, rFire)
          .fill({ color: fireCol, alpha: Math.max(0, 0.88 - p * 0.7) })
          .circle(ex.x, ex.y, rFire * 0.54)
          .fill({ color: isTorp ? 0xf8fafc : 0xfef08a, alpha: Math.max(0, 0.96 - p * 1.08) });
      }

      const sparkCount = isHeavy ? 10 : 6;
      for (let i = 0; i < sparkCount; i++) {
        const ang = (i / sparkCount) * Math.PI * 2 + (ex.x % 3);
        const dist = ex.maxRadius * (0.2 + p * 0.95) * (0.7 + ((i * 17) % 5) * 0.1);
        const sx = ex.x + Math.cos(ang) * dist;
        const sy = ex.y + Math.sin(ang) * dist - p * 18;
        if (p < 0.75) {
          this.explosionGraphics.circle(sx, sy, 3.0 * (1 - p)).fill({ color: ringCol, alpha: 1 - p });
        }
        this.explosionGraphics
          .circle(
            sx * 0.25 + ex.x * 0.75 + Math.cos(ang) * dist * 0.45,
            ex.y + Math.sin(ang) * dist * 0.45 - p * 26,
            8 + p * 12
          )
          .fill({ color: isTorp ? 0xbae6fd : 0x334155, alpha: Math.max(0, (1 - p) * 0.5) });
      }
    }

    // تحديث ورسم سحب الدخان والشرر السينمائية فوق الخريطة والوحدات
    this.fxParticleGraphics.clear();
    for (let i = this.fxParticles.length - 1; i >= 0; i--) {
      const fp = this.fxParticles[i];
      if (isPlaying) {
        const damp = Math.exp(-fp.drag * frameDt);
        fp.vx *= damp;
        fp.vy *= damp;
        fp.x += fp.vx * frameDt;
        fp.y += (fp.vy + fp.rise) * frameDt;
        fp.life -= frameDt;
      }
      if (fp.life <= 0) {
        this.fxParticles.splice(i, 1);
        continue;
      }
      const t = 1 - fp.life / fp.maxLife;
      const rad = lerp(fp.startRadius, fp.endRadius, t);
      const fade = fp.startAlpha * (1 - t * t);
      if (rad > 0.2 && fade > 0.01) {
        this.fxParticleGraphics.circle(fp.x, fp.y, rad).fill({ color: fp.color, alpha: fade });
      }
    }

    // مؤشر التوجيه وقفل الهدف السينمائي (Targeting Lock)
    this.targetingGraphics.clear();
    if (this.strikeModeConfig && !this.hideUIHelpers) {
      const cfg = this.strikeModeConfig;
      const attackerEnt = engine.entities.get(cfg.entityId);
      const baseColor = parseInt(cfg.accentColor.replace('#', ''), 16) || 0x38bdf8;
      const invZ = 1 / Math.max(0.35, this.camZoom);

      if (this.lockCandidate) {
        if (this.lockCandidate.targetEntityId) {
          const lockedTarget = engine.entities.get(this.lockCandidate.targetEntityId);
          if (lockedTarget) {
            this.lockCandidate.worldPt = {
              x: lerp(lockedTarget.prevX, lockedTarget.x, alpha),
              y: lerp(lockedTarget.prevY, lockedTarget.y, alpha)
            };
          } else {
            this.lockCandidate.targetEntityId = null;
          }
        }

        const holdMs = performance.now() - this.lockCandidate.startedAtMs;
        const { phase, progress } = computeTargetingLockProgress(holdMs);
        if (phase !== this.lockCandidate.lastPhase) {
          this.lockCandidate.lastPhase = phase;
          this.onStrikeLockChange?.(phase, this.lockCandidate.worldPt, this.lockCandidate.targetEntityId ?? undefined);
        }

        const tx = this.lockCandidate.worldPt.x;
        const ty = this.lockCandidate.worldPt.y;
        const style = getAggressiveLockStyle(phase, progress, baseColor);
        const strikeR = computeLockedStrikeRadius(cfg.radius, phase);

        if (phase === 'idle') {
          const r = 14 * invZ;
          this.targetingGraphics
            .circle(tx, ty, r)
            .stroke({ width: 1.6 * invZ, color: style.primaryColor, alpha: 0.78 })
            .circle(tx, ty, 2.5 * invZ)
            .fill({ color: style.innerColor, alpha: 0.9 });
        } else {
          // خط تصويب ليزري متقطع من الآلية المسلحة نحو الهدف
          if (attackerEnt) {
            const ax = lerp(attackerEnt.prevX, attackerEnt.x, alpha);
            const ay = lerp(attackerEnt.prevY, attackerEnt.y, alpha);
            const dx = tx - ax;
            const dy = ty - ay;
            const dist = Math.hypot(dx, dy);
            if (dist > 6) {
              const ux = dx / dist;
              const uy = dy / dist;
              const dashLen = 10 * invZ;
              const gapLen = 7 * invZ;
              const step = dashLen + gapLen;
              const offset = (timeSec * 90 * invZ) % step;
              for (let d = offset; d < dist; d += step) {
                const d2 = Math.min(dist, d + dashLen);
                this.targetingGraphics
                  .moveTo(ax + ux * d, ay + uy * d)
                  .lineTo(ax + ux * d2, ay + uy * d2);
              }
              this.targetingGraphics.stroke({
                width: (phase === 'locked' ? 2.4 : 1.7) * invZ,
                color: style.primaryColor,
                alpha: phase === 'locked' ? 0.92 : 0.72
              });
            }
          }

          // نطاق الانفجار والنبض التحذيري العدواني
          const pulseWave = phase === 'locked' ? 0.5 + 0.5 * Math.sin(timeSec * 14) : progress * 0.5;
          this.targetingGraphics
            .circle(tx, ty, strikeR)
            .fill({ color: style.glowColor, alpha: phase === 'locked' ? 0.14 + pulseWave * 0.12 : 0.06 + progress * 0.08 })
            .stroke({
              width: (phase === 'locked' ? 2.4 : 1.5) * invZ,
              color: style.primaryColor,
              alpha: phase === 'locked' ? 0.92 : 0.65
            });

          if (phase === 'locked') {
            const outerPulseR = strikeR * (1.06 + 0.12 * Math.sin(timeSec * 11));
            this.targetingGraphics
              .circle(tx, ty, outerPulseR)
              .stroke({ width: 1.4 * invZ, color: style.innerColor, alpha: 0.45 + 0.35 * pulseWave });
          }

          // قوس شحن القفل الدائري
          const ringR = Math.max(16 * invZ, Math.min(strikeR * 0.78, 34 * invZ));
          if (progress > 0.02) {
            const startAng = -Math.PI / 2;
            const endAng = startAng + Math.PI * 2 * progress;
            this.targetingGraphics
              .moveTo(tx + Math.cos(startAng) * ringR, ty + Math.sin(startAng) * ringR)
              .arc(tx, ty, ringR, startAng, endAng)
              .stroke({ width: style.lineWidth * invZ, color: style.primaryColor, alpha: 0.96 });
          }

          // أقواس التثبيت المنقبضة وأسهم التهديد العدوانية
          const rot = timeSec * style.rotationSpeed;
          const bDist = ringR * 1.15 * style.bracketScale;
          const bArm = Math.max(5 * invZ, bDist * 0.42);
          const chevDist = ringR * 1.45 * style.chevronSpread;
          const chevSize = 5.5 * invZ;

          for (let q = 0; q < 4; q++) {
            const a = rot + q * (Math.PI / 2);
            const ca = Math.cos(a);
            const sa = Math.sin(a);
            const ba = a + Math.PI / 4;
            const bca = Math.cos(ba);
            const bsa = Math.sin(ba);
            const cx = tx + bca * bDist;
            const cy = ty + bsa * bDist;
            const t1x = -bsa;
            const t1y = bca;
            this.targetingGraphics
              .moveTo(cx + t1x * bArm - bca * (bArm * 0.2), cy + t1y * bArm - bsa * (bArm * 0.2))
              .lineTo(cx, cy)
              .lineTo(cx - t1x * bArm - bca * (bArm * 0.2), cy - t1y * bArm - bsa * (bArm * 0.2))
              .stroke({ width: style.lineWidth * invZ, color: style.primaryColor, alpha: 0.95 });

            const tipX = tx + ca * (chevDist - chevSize);
            const tipY = ty + sa * (chevDist - chevSize);
            const baseX = tx + ca * (chevDist + chevSize * 0.7);
            const baseY = ty + sa * (chevDist + chevSize * 0.7);
            const perpX = -sa * chevSize * 0.65;
            const perpY = ca * chevSize * 0.65;
            this.targetingGraphics
              .poly([tipX, tipY, baseX + perpX, baseY + perpY, baseX - perpX, baseY - perpY])
              .fill({ color: phase === 'locked' ? style.innerColor : style.primaryColor, alpha: 0.92 });
          }

          this.targetingGraphics
            .circle(tx, ty, (phase === 'locked' ? 3.5 : 2.5) * invZ)
            .fill({ color: style.innerColor, alpha: 0.98 });
        }
      } else if (this.hoverWorldPt) {
        const hx = this.hoverWorldPt.x;
        const hy = this.hoverWorldPt.y;
        const r = Math.min(cfg.radius, 28 * invZ);
        const cross = 8 * invZ;
        this.targetingGraphics
          .circle(hx, hy, r)
          .stroke({ width: 1.3 * invZ, color: baseColor, alpha: 0.55 })
          .moveTo(hx - cross, hy).lineTo(hx + cross, hy)
          .moveTo(hx, hy - cross).lineTo(hx, hy + cross)
          .stroke({ width: 1.2 * invZ, color: 0xf8fafc, alpha: 0.75 });
      }
    } else if (this.lockCandidate) {
      if (this.lockCandidate.lastPhase !== 'idle') {
        this.onStrikeLockChange?.('idle');
      }
      this.lockCandidate = null;
    }

    // تحديث البطاقات العائمة (Callouts)
    for (const [id, cv] of this.calloutViews) {
      if (!engine.callouts.has(id)) {
        this.calloutLayer.removeChild(cv.container);
        cv.container.destroy({ children: true });
        this.calloutViews.delete(id);
      }
    }
    const calloutScale = Math.max(0.42, Math.min(1.15, 1 / Math.pow(Math.max(0.25, this.camZoom), 0.78)));
    for (const c of engine.callouts.values()) {
      const targetEnt = engine.entities.get(c.target);
      const targetAnchor = engine.map.anchors[c.target];
      const tx = targetEnt ? lerp(targetEnt.prevX, targetEnt.x, alpha) : targetAnchor?.x;
      const entOffset = Math.max(10, 26 * this.lastUnitFactor * (targetEnt?.scaleMul ?? 1)) + 14 * calloutScale;
      const ty = targetEnt
        ? lerp(targetEnt.prevY, targetEnt.y, alpha) - entOffset
        : targetAnchor
          ? targetAnchor.y - 28 * calloutScale
          : undefined;
      if (tx === undefined || ty === undefined) continue;

      let cv = this.calloutViews.get(c.id);
      if (!cv) {
        const container = new Container();
        const bg = new Graphics();
        const label = new Text({
          text: c.text,
          style: {
            fontFamily: 'IBM Plex Sans Arabic, system-ui, sans-serif',
            fontSize: 12,
            fontWeight: '600',
            fill: 0xf8fafc
          }
        });
        label.anchor.set(0.5);
        container.addChild(bg, label);
        this.calloutLayer.addChild(container);
        cv = { container, bg, label, lastText: '', lastColor: '' };
        this.calloutViews.set(c.id, cv);
      }
      if (cv.lastText !== c.text || cv.lastColor !== c.color) {
        cv.label.text = c.text;
        cv.lastText = c.text;
        cv.lastColor = c.color;
        const w = cv.label.width + 20;
        const h = 26;
        cv.bg
          .clear()
          .roundRect(-w / 2, -h / 2, w, h, 6)
          .fill({ color: 0x0f172a, alpha: 0.94 })
          .stroke({ width: 1.5, color: c.color });
      }
      cv.container.position.set(tx, ty);
      cv.container.scale.set(calloutScale);
    }

    // تحديث إحداثيات الشاشة للوحدة المحددة لإبقاء زر القدرة ملاصقًا لها
    if (this.onSelectedScreenPos) {
      const selEnt = this.selectedEntityId && !this.hideUIHelpers ? engine.entities.get(this.selectedEntityId) : undefined;
      if (selEnt) {
        const ex = lerp(selEnt.prevX, selEnt.x, alpha);
        const ey = lerp(selEnt.prevY, selEnt.y, alpha);
        const sp = this.worldToScreen({ x: ex, y: ey });
        const offsetPx = Math.max(20, selEnt.radius * this.lastUnitFactor * (selEnt.scaleMul ?? 1) * this.camZoom);
        const prev = this.lastEmittedSelPos;
        if (
          !prev ||
          prev.id !== selEnt.id ||
          Math.abs(prev.x - sp.x) >= 1.5 ||
          Math.abs(prev.y - sp.y) >= 1.5
        ) {
          this.lastEmittedSelPos = { id: selEnt.id, x: sp.x, y: sp.y };
          this.onSelectedScreenPos({ id: selEnt.id, x: sp.x, y: sp.y, offsetPx });
        }
      } else if (this.lastEmittedSelPos !== null) {
        this.lastEmittedSelPos = null;
        this.onSelectedScreenPos(null);
      }
    }
  }

  private drawCornerBrackets(g: Graphics, hw: number, hh: number, arm: number, color: number, width: number, alpha: number): void {
    const a = Math.min(arm, hw * 0.65, hh * 0.65);
    g.moveTo(-hw, -hh + a).lineTo(-hw, -hh).lineTo(-hw + a, -hh)
      .moveTo(hw - a, -hh).lineTo(hw, -hh).lineTo(hw, -hh + a)
      .moveTo(hw, hh - a).lineTo(hw, hh).lineTo(hw - a, hh)
      .moveTo(-hw + a, hh).lineTo(-hw, hh).lineTo(-hw, hh - a)
      .stroke({ width, color, alpha });
  }

  private createEntityView(ent: EntityState): EntityView {
    const container = new Container();
    const tex = this.actorTextures.get(ent.actorId) ?? Texture.EMPTY;
    const ratio = ent.scale / Math.max(1, tex.width, tex.height);
    const drawW = Math.max(ent.radius * 1.4, tex.width * ratio);
    const drawH = Math.max(ent.radius * 1.0, tex.height * ratio);

    const shadow = new Graphics()
      .ellipse(0, ent.kind === 'air' ? 8 : ent.scale * 0.16, drawW * 0.44, drawH * 0.34)
      .fill({ color: 0x000000, alpha: ent.kind === 'air' ? 0.38 : 0.32 });

    const isElongated = drawW > drawH * 1.35;
    const hw = Math.max(12, drawW * 0.52);
    const hh = Math.max(10, drawH * 0.54);
    const factionHalo = new Graphics();
    const ring = new Graphics();
    const fCol = FACTION_COLOR[ent.faction] ?? 0x94a3b8;
    this.drawCornerBrackets(factionHalo, hw, hh, 5.5, fCol, 1.5, 0.52);
    this.drawCornerBrackets(ring, hw + 4, hh + 4, 8, 0x22c55e, 2.2, 0.95);
    ring.visible = false;
    const buildArc = new Graphics();

    const sprite = new Sprite(tex);
    sprite.anchor.set(0.5);
    sprite.scale.set(ratio);

    let rotor: Graphics | undefined;
    if (ent.actorId === 'apache_heli' || ent.actorId === 'attack_heli') {
      rotor = new Graphics()
        .poly([-20, -1.4, -4, -0.8, -4, 0.8, -20, 1.4])
        .fill({ color: 0x94a3b8, alpha: 0.78 })
        .poly([4, -0.8, 20, -1.4, 20, 1.4, 4, 0.8])
        .fill({ color: 0x94a3b8, alpha: 0.78 })
        .poly([-1.4, -20, 1.4, -20, 0.8, -4, -0.8, -4])
        .fill({ color: 0x94a3b8, alpha: 0.78 })
        .poly([-0.8, 4, 0.8, 4, 1.4, 20, -1.4, 20])
        .fill({ color: 0x94a3b8, alpha: 0.78 })
        .circle(-19.5, 0, 1.2).fill({ color: 0xfacc15, alpha: 0.85 })
        .circle(19.5, 0, 1.2).fill({ color: 0xfacc15, alpha: 0.85 })
        .circle(0, -19.5, 1.2).fill({ color: 0xfacc15, alpha: 0.85 })
        .circle(0, 19.5, 1.2).fill({ color: 0xfacc15, alpha: 0.85 })
        .circle(0, 0, 2.8)
        .fill({ color: 0x475569 })
        .stroke({ width: 1, color: 0xe2e8f0, alpha: 0.85 });
      rotor.position.set(1, 0);
    }

    if (rotor) {
      container.addChild(shadow, factionHalo, ring, sprite, rotor, buildArc);
    } else {
      container.addChild(shadow, factionHalo, ring, sprite, buildArc);
    }
    return { container, sprite, baseSpriteScale: ratio, isElongated, shadow, ring, factionHalo, buildArc, rotor };
  }

  destroy(): void {
    this.destroyed = true;
    this.cleanupListeners.forEach((fn) => fn());
    this.cleanupListeners = [];
    for (const tex of this.actorTextures.values()) {
      if (tex !== Texture.EMPTY) tex.destroy(true);
    }
    this.actorTextures.clear();
    try {
      this.app.destroy(true, { children: true });
    } catch {
      // Ignore destroy errors if init hadn't finished
    }
  }
}
