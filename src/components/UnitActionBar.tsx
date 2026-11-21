import {
  Bomb,
  Crosshair,
  Flame,
  Minus,
  Plus,
  Radar,
  Rocket,
  Shield,
  Trash2,
  Waves,
  X
} from 'lucide-react';
import { StrikeLockPhase } from '../core/targetingLock';
import { StrikeMode, UnitAbilityDef } from '../core/types';
import { sanitizeAssetUrl } from '../packs/packSchema';

interface UnitActionBarProps {
  entityId: string;
  actorLabel: string;
  actorSvg?: string;
  ability: UnitAbilityDef;
  isArmed: boolean;
  strikeLockPhase?: StrikeLockPhase;
  scaleMul: number;
  onToggleArm: () => void;
  onChangeScale: (nextScale: number) => void;
  onDelete: () => void;
  onDeselect: () => void;
}

function AbilityIcon({ mode }: { mode: StrikeMode }) {
  if (mode === 'missile') return <Rocket className="w-4 h-4 shrink-0" />;
  if (mode === 'airstrike') return <Bomb className="w-4 h-4 shrink-0" />;
  if (mode === 'shell') return <Flame className="w-4 h-4 shrink-0" />;
  if (mode === 'bullet') return <Crosshair className="w-4 h-4 shrink-0" />;
  if (mode === 'artillery') return <Flame className="w-4 h-4 shrink-0" />;
  if (mode === 'interceptor') return <Shield className="w-4 h-4 shrink-0" />;
  if (mode === 'torpedo') return <Waves className="w-4 h-4 shrink-0" />;
  return <Radar className="w-4 h-4 shrink-0" />;
}

function previewSrc(svg?: string): string {
  if (!svg) return '';
  const safe = sanitizeAssetUrl(svg);
  if (!safe) return '';
  return safe.startsWith('<svg') ? `data:image/svg+xml;utf8,${encodeURIComponent(safe)}` : safe;
}

export function UnitActionBar({
  entityId,
  actorLabel,
  actorSvg,
  ability,
  isArmed,
  strikeLockPhase = 'idle',
  scaleMul,
  onToggleArm,
  onChangeScale,
  onDelete,
  onDeselect
}: UnitActionBarProps) {
  const thumb = previewSrc(actorSvg);
  const isLocked = isArmed && strikeLockPhase === 'locked';
  const isLocking = isArmed && strikeLockPhase === 'locking';

  return (
    <div
      id="unitActionBar"
      data-entity-id={entityId}
      data-lock-phase={strikeLockPhase}
      dir="rtl"
      className="fixed bottom-13 left-1/2 -translate-x-1/2 z-30 max-w-[calc(100vw-16px)] flex flex-col items-center gap-1.5 pointer-events-none"
    >
      {isArmed && (
        <div
          id="strikeLockStatusPill"
          className={`pointer-events-none px-2.5 py-0.5 rounded-lg border text-[11px] font-semibold shadow-lg whitespace-nowrap transition-colors ${
            isLocked
              ? 'bg-red-700/95 border-red-300 text-white shadow-red-900/60 animate-pulse'
              : isLocking
                ? 'bg-amber-950/95 border-amber-400 text-amber-100'
                : 'bg-red-950/90 border-red-500/70 text-red-100'
          }`}
        >
          {isLocked
            ? '🔒 تم قفل الهدف — أفلت للإطلاق المدمر!'
            : isLocking
              ? '🎯 جاري قفل الهدف...'
              : 'مفعّل: اضغط أو اضغط مطولاً لقفل الهدف'}
        </div>
      )}

      <div
        className={`pointer-events-auto max-w-full flex items-center gap-1 p-1.5 rounded-xl border shadow-2xl backdrop-blur-md transition-colors ${
          isLocked
            ? 'bg-red-950/95 border-red-400 shadow-red-900/50'
            : isLocking
              ? 'bg-slate-950/95 border-amber-400/90'
              : 'bg-slate-950/95 border-slate-700/90'
        }`}
      >
        {thumb && (
          <div
            title={actorLabel}
            className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700/80 flex items-center justify-center p-1 shrink-0"
          >
            <img src={thumb} alt="" className="w-full h-full object-contain" />
          </div>
        )}

        {/* زر قدرة الآلية الثابت في الأسفل - يبقى مفعلاً للضربات المتتالية حتى إيقافه */}
        <button
          type="button"
          id="unitAbilityBtn"
          aria-pressed={isArmed}
          title={`${actorLabel}: ${ability.label}`}
          onClick={onToggleArm}
          className={`min-h-[40px] px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-colors whitespace-nowrap shrink-0 ${
            isArmed
              ? 'bg-red-600 hover:bg-red-500 border-red-300 text-white shadow-lg shadow-red-900/40'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-100'
          }`}
        >
          <span style={{ color: isArmed ? '#ffffff' : ability.accentColor }}>
            <AbilityIcon mode={ability.mode} />
          </span>
          <span>{isArmed ? `إيقاف ${ability.shortLabel}` : ability.label}</span>
        </button>

        {/* تصغير وتكبير الآلية المحددة */}
        <button
          type="button"
          aria-label="تصغير الآلية"
          onClick={() => onChangeScale(scaleMul - 0.15)}
          className="min-h-[40px] min-w-[32px] px-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center shrink-0"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          aria-label="تكبير الآلية"
          onClick={() => onChangeScale(scaleMul + 0.15)}
          className="min-h-[40px] min-w-[32px] px-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        {/* حذف الآلية */}
        <button
          type="button"
          aria-label="حذف الآلية"
          onClick={onDelete}
          className="min-h-[40px] min-w-[34px] px-1.5 rounded-lg bg-slate-900 hover:bg-red-950 border border-slate-700 hover:border-red-500/70 text-red-400 flex items-center justify-center shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        {/* إلغاء التحديد */}
        <button
          type="button"
          aria-label="إلغاء تحديد الآلية"
          onClick={onDeselect}
          className="min-h-[40px] min-w-[32px] px-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
