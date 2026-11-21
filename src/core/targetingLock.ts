import { Point, StrikeMode } from './types';

export type StrikeLockPhase = 'idle' | 'locking' | 'locked';

export interface StrikeModeConfig {
  entityId: string;
  mode: StrikeMode;
  radius: number;
  accentColor: string;
}

export interface TargetingLockProgress {
  phase: StrikeLockPhase;
  progress: number;
}

export interface TargetingLockVisualStyle {
  primaryColor: number;
  glowColor: number;
  innerColor: number;
  bracketScale: number;
  lineWidth: number;
  chevronSpread: number;
  rotationSpeed: number;
}

export interface TargetingLockCandidate {
  startClient: Point;
  currentClient: Point;
  worldPt: Point;
  targetEntityId: string | null;
  startedAtMs: number;
  lastPhase: StrikeLockPhase;
}

export const LOCK_HOLD_THRESHOLD_MS = 120;
export const LOCK_COMPLETE_MS = 480;
export const LOCK_MOVE_TOLERANCE_PX = 16;

export function computeTargetingLockProgress(holdMs: number): TargetingLockProgress {
  if (!Number.isFinite(holdMs) || holdMs < LOCK_HOLD_THRESHOLD_MS) {
    return { phase: 'idle', progress: 0 };
  }
  const span = Math.max(1, LOCK_COMPLETE_MS - LOCK_HOLD_THRESHOLD_MS);
  const progress = Math.max(0, Math.min(1, (holdMs - LOCK_HOLD_THRESHOLD_MS) / span));
  return {
    phase: progress >= 1 ? 'locked' : 'locking',
    progress
  };
}

export function getAggressiveLockStyle(
  phase: StrikeLockPhase,
  progress: number,
  baseColorHex = 0x38bdf8
): TargetingLockVisualStyle {
  if (phase === 'idle') {
    return {
      primaryColor: baseColorHex,
      glowColor: baseColorHex,
      innerColor: 0xe0f2fe,
      bracketScale: 1.18,
      lineWidth: 1.5,
      chevronSpread: 1.25,
      rotationSpeed: 0.6
    };
  }
  if (phase === 'locking') {
    const t = Math.max(0, Math.min(1, progress));
    return {
      primaryColor: t < 0.5 ? 0xf59e0b : 0xf97316,
      glowColor: 0xef4444,
      innerColor: 0xfef08a,
      bracketScale: 1.48 - t * 0.72,
      lineWidth: 2.0 + t * 1.2,
      chevronSpread: 1.45 - t * 0.68,
      rotationSpeed: 2.2 + t * 2.8
    };
  }
  return {
    primaryColor: 0xff1e42,
    glowColor: 0xdc2626,
    innerColor: 0xfef08a,
    bracketScale: 0.64,
    lineWidth: 3.4,
    chevronSpread: 0.68,
    rotationSpeed: 5.5
  };
}

export function computeLockedStrikeRadius(baseRadius: number, phase: StrikeLockPhase): number {
  return phase === 'locked' ? Math.round(baseRadius * 1.25) : baseRadius;
}
