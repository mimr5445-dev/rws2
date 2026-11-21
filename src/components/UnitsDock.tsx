import { ChevronLeft, Crosshair, Package, X } from 'lucide-react';
import { useState } from 'react';
import { ActorPack, Faction, UnitCategory } from '../core/types';
import { sanitizeAssetUrl } from '../packs/packSchema';

interface UnitsDockProps {
  open: boolean;
  onToggleOpen: () => void;
  actors: ActorPack[];
  activeTool: string;
  onSelectTool: (toolId: string) => void;
  sandboxFaction: Faction;
  onChangeFaction: (f: Faction) => void;
  toolScales: Record<string, number>;
  onChangeToolScale: (toolId: string, scale: number) => void;
}

const CATEGORIES: Array<{ id: 'all' | UnitCategory; label: string }> = [
  { id: 'all', label: 'الكل' },
  { id: 'air', label: 'طائرات' },
  { id: 'armor', label: 'مدرعات' },
  { id: 'infantry', label: 'مشاة' },
  { id: 'naval', label: 'بحرية' },
  { id: 'building', label: 'منشآت' }
];

function actorPreviewSrc(svg: string): string {
  const safe = sanitizeAssetUrl(svg);
  if (!safe) return '';
  if (safe.startsWith('<svg')) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(safe)}`;
  }
  return safe;
}

export function UnitsDock({
  open,
  onToggleOpen,
  actors,
  activeTool,
  onSelectTool,
  sandboxFaction,
  onChangeFaction,
  toolScales,
  onChangeToolScale
}: UnitsDockProps) {
  const [category, setCategory] = useState<'all' | UnitCategory>('all');

  const filteredActors =
    category === 'all'
      ? actors
      : actors.filter((a) => (a.ability?.category ?? 'armor') === category);

  const activeActor = activeTool !== 'select' ? actors.find((a) => a.id === activeTool) : undefined;
  const activePlacementScale = activeActor ? (toolScales[activeActor.id] ?? 1.0) : 1.0;

  return (
    <div
      dir="ltr"
      className="fixed left-2 top-14 z-30 flex flex-col items-start pointer-events-none"
    >
      {/* زر أيقونة الآليات والمعدات المنفصل في الزاوية اليسرى */}
      <button
        type="button"
        id="unitsDockToggle"
        aria-label="الآليات والمعدات"
        aria-expanded={open}
        onClick={onToggleOpen}
        className={`pointer-events-auto min-h-[44px] min-w-[44px] px-2.5 flex items-center gap-2 rounded-xl border shadow-xl backdrop-blur-md transition-colors whitespace-nowrap shrink-0 ${
          open || activeTool !== 'select'
            ? 'bg-sky-600/95 border-sky-400 text-white'
            : 'bg-slate-950/90 border-slate-700/90 text-slate-100 hover:bg-slate-900'
        }`}
      >
        <Package className="w-5 h-5 shrink-0" />
        <span className="text-xs font-semibold hidden sm:inline">الآليات</span>
        {activeActor && (
          <span className="w-2 h-2 rounded-full bg-amber-300 shrink-0" aria-hidden="true" />
        )}
      </button>

      {/* مستطيل الآليات والمعدات الملاصق للشاشة اليسرى */}
      {open && (
        <section
          id="unitsDockDrawer"
          dir="rtl"
          aria-label="قائمة الآليات والمعدات"
          className="pointer-events-auto mt-2 w-[min(278px,calc(100vw-16px))] max-h-[68dvh] flex flex-col bg-slate-950/95 border border-slate-700/90 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden"
        >
          {/* رأس الدرج */}
          <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <Package className="w-4 h-4 text-sky-400 shrink-0" />
              <h2 className="text-xs font-bold text-slate-100 truncate">الآليات والمعدات</h2>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {activeTool !== 'select' && (
                <button
                  type="button"
                  onClick={() => onSelectTool('select')}
                  className="px-2 py-1 text-[11px] font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 whitespace-nowrap"
                >
                  تحديد
                </button>
              )}
              <button
                type="button"
                aria-label="إغلاق قائمة الآليات"
                onClick={onToggleOpen}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* اختيار الفصيل */}
          <div className="px-2.5 py-2 border-b border-slate-800/80 grid grid-cols-3 gap-1.5 shrink-0">
            {(
              [
                { id: 'blue', label: 'أزرق', cls: 'bg-sky-600 border-sky-400 text-white' },
                { id: 'red', label: 'أحمر', cls: 'bg-red-600 border-red-400 text-white' },
                { id: 'neutral', label: 'محايد', cls: 'bg-slate-600 border-slate-400 text-white' }
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onChangeFaction(f.id)}
                className={`min-h-[34px] px-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                  sandboxFaction === f.id
                    ? f.cls
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* تبويبات الفئات */}
          <div className="px-2.5 py-1.5 border-b border-slate-800/80 flex flex-wrap items-center gap-1 shrink-0">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                  category === c.id
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/60'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* شريط حجم الآلية قبل الإنزال */}
          {activeActor && (
            <div className="px-3 py-1.5 bg-sky-950/50 border-b border-sky-800/60 flex items-center justify-between gap-2 shrink-0">
              <span className="text-[11px] text-sky-200 truncate">
                اضغط الخريطة لوضع: <strong>{activeActor.label}</strong>
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="range"
                  aria-label="حجم الآلية"
                  min={0.4}
                  max={2.4}
                  step={0.1}
                  value={activePlacementScale}
                  onChange={(e) => onChangeToolScale(activeActor.id, parseFloat(e.target.value))}
                  className="w-16 accent-sky-400 cursor-pointer"
                />
                <span className="text-[11px] font-mono tabular-nums text-sky-300 w-8 text-center">
                  {activePlacementScale.toFixed(1)}x
                </span>
              </div>
            </div>
          )}

          {/* قائمة الآليات والمعدات الواقعية */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {filteredActors.map((actor) => {
              const selected = activeTool === actor.id;
              const preview = actorPreviewSrc(actor.svg);
              return (
                <button
                  key={actor.id}
                  type="button"
                  data-actor-id={actor.id}
                  onClick={() => onSelectTool(selected ? 'select' : actor.id)}
                  className={`w-full min-h-[48px] px-2.5 py-1.5 rounded-lg border flex items-center gap-2.5 text-right transition-colors ${
                    selected
                      ? 'bg-sky-900/60 border-sky-400 text-white'
                      : 'bg-slate-900/90 border-slate-800 text-slate-200 hover:bg-slate-800/90 hover:border-slate-700'
                  }`}
                >
                  <div className="w-10 h-9 rounded-md bg-slate-950/80 border border-slate-800 flex items-center justify-center p-1 shrink-0">
                    {preview ? (
                      <img src={preview} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <Crosshair className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-100 truncate">{actor.label}</div>
                    {actor.ability && (
                      <div className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: actor.ability.accentColor }}
                        />
                        <span className="truncate">{actor.ability.label}</span>
                      </div>
                    )}
                  </div>
                  <ChevronLeft
                    className={`w-3.5 h-3.5 shrink-0 ${selected ? 'text-sky-300' : 'text-slate-600'}`}
                  />
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
