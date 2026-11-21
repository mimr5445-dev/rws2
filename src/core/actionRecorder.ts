import * as yaml from 'js-yaml';
import { Faction, Point, ScenarioFile, ScenarioStep, StrikeMode } from './types';

export class ActionRecorder {
  public isRecording = false;
  public mapId = '';
  public steps: ScenarioStep[] = [];
  private startPerfMs = 0;
  private lastSec = 0;

  start(mapId: string, initialCamera: { x: number; y: number; zoom: number }): void {
    this.isRecording = true;
    this.mapId = mapId;
    this.lastSec = 0;
    const cx = Number.isFinite(initialCamera.x) ? Math.round(initialCamera.x) : 0;
    const cy = Number.isFinite(initialCamera.y) ? Math.round(initialCamera.y) : 0;
    const cz = Number.isFinite(initialCamera.zoom) ? Number(initialCamera.zoom.toFixed(2)) : 1;
    this.steps = [
      {
        at: '0.0s',
        camera: {
          focus: { x: cx, y: cy },
          zoom: cz,
          duration: '0.8s'
        }
      }
    ];
    this.startPerfMs = performance.now();
  }

  stop(): void {
    this.isRecording = false;
  }

  elapsedSec(): number {
    if (!this.isRecording) return 0;
    const raw = Math.max(0, (performance.now() - this.startPerfMs) / 1000);
    if (raw > this.lastSec) this.lastSec = raw;
    return this.lastSec;
  }

  private atLabel(): string {
    return `${this.elapsedSec().toFixed(1)}s`;
  }

  private roundPt(pt: Point): Point {
    return {
      x: Number.isFinite(pt.x) ? Math.round(pt.x) : 0,
      y: Number.isFinite(pt.y) ? Math.round(pt.y) : 0
    };
  }

  recordSpawn(id: string, actor: string, pt: Point, faction: Faction = 'blue', scale?: number): void {
    if (!this.isRecording) return;
    const item: NonNullable<ScenarioStep['spawn']>[number] = { id, actor, at: this.roundPt(pt), faction };
    if (scale !== undefined && Math.abs(scale - 1) > 0.01) item.scale = Number(scale.toFixed(2));
    this.steps.push({
      at: this.atLabel(),
      spawn: [item]
    });
  }

  recordMove(entityId: string, pt: Point): void {
    if (!this.isRecording) return;
    this.steps.push({
      at: this.atLabel(),
      move: { entity: entityId, to: this.roundPt(pt) }
    });
  }

  recordConstruct(id: string, actor: string, pt: Point, faction: Faction = 'blue', durationSec = 1.8, scale?: number): void {
    if (!this.isRecording) return;
    const item: NonNullable<ScenarioStep['construct']> = {
      id,
      actor,
      at: this.roundPt(pt),
      faction,
      duration: `${durationSec}s`
    };
    if (scale !== undefined && Math.abs(scale - 1) > 0.01) item.scale = Number(scale.toFixed(2));
    this.steps.push({
      at: this.atLabel(),
      construct: item
    });
  }

  recordResize(entityId: string, scale: number): void {
    if (!this.isRecording) return;
    this.steps.push({
      at: this.atLabel(),
      resize: { entity: entityId, scale: Number(scale.toFixed(2)) }
    });
  }

  recordRemove(entityId: string): void {
    if (!this.isRecording) return;
    this.steps.push({ at: this.atLabel(), remove: { entity: entityId } });
  }

  recordZone(zoneId: string, color: string, opacity = 0.35): void {
    if (!this.isRecording) return;
    this.steps.push({
      at: this.atLabel(),
      zone: { id: zoneId, color, opacity, duration: '1s' }
    });
  }

  recordArrow(id: string, from: Point, to: Point, color = '#f59e0b', dashed = true): void {
    if (!this.isRecording) return;
    this.steps.push({
      at: this.atLabel(),
      draw_arrow: { id, from: this.roundPt(from), to: this.roundPt(to), color, dashed, duration: '1.2s' }
    });
  }

  recordPulse(pt: Point, color = '#ef4444'): void {
    if (!this.isRecording) return;
    this.steps.push({ at: this.atLabel(), pulse: { at: this.roundPt(pt), color, radius: 70 } });
  }

  recordStrike(
    mode: StrikeMode,
    to: Point,
    attacker?: string,
    from?: Point,
    radius?: number,
    color?: string
  ): void {
    if (!this.isRecording) return;
    const strike: NonNullable<ScenarioStep['strike']> = {
      mode,
      to: this.roundPt(to)
    };
    if (attacker) strike.attacker = attacker;
    if (from) strike.from = this.roundPt(from);
    if (radius !== undefined) strike.radius = radius;
    if (color !== undefined) strike.color = color;
    this.steps.push({ at: this.atLabel(), strike });
  }

  recordCaption(text: string): void {
    if (!this.isRecording) return;
    this.steps.push({ at: this.atLabel(), caption: { text } });
  }

  recordCamera(x: number, y: number, zoom: number): void {
    if (!this.isRecording) return;
    this.steps.push({
      at: this.atLabel(),
      camera: {
        focus: { x: Math.round(x), y: Math.round(y) },
        zoom: Number(zoom.toFixed(2)),
        duration: '1s'
      }
    });
  }

  toScenarioFile(title: string): ScenarioFile {
    return {
      meta: { title, map: this.mapId },
      timeline: this.steps
    };
  }

  toYaml(title: string): string {
    return yaml.dump(this.toScenarioFile(title), { lineWidth: 120, noRefs: true });
  }
}
