import React, { useEffect, useMemo, useState } from 'react';
import { Check, Plus, Save, Trash2, Upload, X } from 'lucide-react';
import { FLAG_PRESET_TEMPLATES } from '../countries/countrySeed';
import {
  CountryFlagAsset,
  CountryProfile,
  CountryRelationItem,
  CountryRelationType,
  makeCountryIdFromIso3,
  normalizeIso3,
  validateCountryProfile
} from '../countries/countryTypes';
import { CountryFlagView, LeaderPortraitView } from './CountryFlagView';

interface CountryEditorModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialDraft: CountryProfile | null;
  knownCountries: CountryProfile[];
  regionIsoOptions: Array<{ iso3: string; label: string }>;
  onClose: () => void;
  onSave: (profile: CountryProfile) => Promise<void>;
}

type EditorTab = 'identity' | 'leadership' | 'economy_mil' | 'diplomacy_media';

const COLOR_SWATCHES = [
  '#15803d',
  '#0f766e',
  '#0284c7',
  '#1d4ed8',
  '#4338ca',
  '#b45309',
  '#ea580c',
  '#dc2626',
  '#be123c',
  '#475569'
];

const RELATION_OPTIONS: Array<{ value: CountryRelationType; label: string }> = [
  { value: 'alliance', label: 'تحالف' },
  { value: 'defense_pact', label: 'دفاع مشترك' },
  { value: 'trade', label: 'شراكة تجارية' },
  { value: 'rivalry', label: 'خصومة' },
  { value: 'sanctions', label: 'عقوبات' },
  { value: 'tension', label: 'توتر' }
];

function cloneDraft(src: CountryProfile): CountryProfile {
  return {
    ...src,
    flag: { ...src.flag },
    leader: { ...src.leader },
    government: { ...src.government },
    stability: { ...src.stability },
    economy: { ...src.economy, primaryResources: [...src.economy.primaryResources] },
    military: { ...src.military },
    diplomacy: {
      ...src.diplomacy,
      alliances: src.diplomacy.alliances.map((a) => ({ ...a })),
      rivalries: src.diplomacy.rivalries.map((r) => ({ ...r }))
    },
    mediaAndPublic: { ...src.mediaAndPublic },
    metadata: { ...src.metadata },
    extensions: src.extensions ? { ...src.extensions } : undefined
  };
}

function PctInput({
  id,
  label,
  value,
  onChange
}: {
  id: string;
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <label htmlFor={id} className="text-slate-300">
          {label}
        </label>
        <span dir="ltr" className="font-mono tabular-nums text-sky-300 font-semibold">
          {value}%
        </span>
      </div>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
          className="flex-1 accent-sky-400 cursor-pointer"
        />
        <input
          type="number"
          min={0}
          max={100}
          aria-label={`${label} رقمياً`}
          value={value}
          onChange={(e) => onChange(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
          className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono tabular-nums text-slate-100 text-center"
        />
      </div>
    </div>
  );
}

export function CountryEditorModal({
  open,
  mode,
  initialDraft,
  knownCountries,
  regionIsoOptions,
  onClose,
  onSave
}: CountryEditorModalProps) {
  const [tab, setTab] = useState<EditorTab>('identity');
  const [draft, setDraft] = useState<CountryProfile | null>(null);
  const [newResource, setNewResource] = useState('');
  const [relKind, setRelKind] = useState<'alliances' | 'rivalries'>('alliances');
  const [relTargetIso3, setRelTargetIso3] = useState('');
  const [relName, setRelName] = useState('');
  const [relType, setRelType] = useState<CountryRelationType>('alliance');
  const [relNotes, setRelNotes] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && initialDraft) {
      setDraft(cloneDraft(initialDraft));
      setTab('identity');
      setErrors([]);
      setNewResource('');
      setRelTargetIso3('');
      setRelName('');
      setRelNotes('');
      setSaving(false);
    }
  }, [open, initialDraft]);

  const knownCountryMap = useMemo(() => {
    const m = new Map<string, CountryProfile>();
    for (const c of knownCountries) m.set(c.iso3, c);
    return m;
  }, [knownCountries]);

  if (!open || !draft) return null;

  const updateFlag = (patch: Partial<CountryFlagAsset>) => {
    setDraft((prev) => (prev ? { ...prev, flag: { ...prev.flag, ...patch } } : prev));
  };

  const handleFlagImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      if (!url) return;
      if (file.type === 'image/svg+xml' && url.startsWith('data:image/svg+xml')) {
        void file.text().then((txt) => updateFlag({ mode: 'svg', svg: txt }));
      } else {
        updateFlag({ mode: 'image', imageUrl: url });
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePortraitImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      if (!url) return;
      setDraft((prev) =>
        prev
          ? {
              ...prev,
              leader: {
                ...prev.leader,
                portraitUrl: url,
                portraitSvg: undefined
              }
            }
          : prev
      );
    };
    reader.readAsDataURL(file);
  };

  const handleAddResource = () => {
    const clean = newResource.trim();
    if (!clean) return;
    setDraft((prev) => {
      if (!prev) return prev;
      if (prev.economy.primaryResources.includes(clean)) return prev;
      return {
        ...prev,
        economy: {
          ...prev.economy,
          primaryResources: [...prev.economy.primaryResources, clean]
        }
      };
    });
    setNewResource('');
  };

  const handleRemoveResource = (idx: number) => {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            economy: {
              ...prev.economy,
              primaryResources: prev.economy.primaryResources.filter((_, i) => i !== idx)
            }
          }
        : prev
    );
  };

  const handleAddRelation = () => {
    const iso = relTargetIso3.trim() ? normalizeIso3(relTargetIso3) : undefined;
    const matched = iso ? knownCountryMap.get(iso) : undefined;
    const finalName = relName.trim() || matched?.nameAr || '';
    if (!finalName) {
      setErrors(['أدخل اسم الدولة أو الطرف قبل إضافة العلاقة الدبلوماسية']);
      return;
    }
    const item: CountryRelationItem = {
      targetIso3: iso,
      name: finalName,
      type: relType,
      notes: relNotes.trim() || undefined
    };
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        diplomacy: {
          ...prev.diplomacy,
          [relKind]: [...prev.diplomacy[relKind], item]
        }
      };
    });
    setRelTargetIso3('');
    setRelName('');
    setRelNotes('');
    setErrors([]);
  };

  const handleRemoveRelation = (kind: 'alliances' | 'rivalries', idx: number) => {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            diplomacy: {
              ...prev.diplomacy,
              [kind]: prev.diplomacy[kind].filter((_, i) => i !== idx)
            }
          }
        : prev
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const prepared: CountryProfile = {
      ...draft,
      iso3: normalizeIso3(draft.iso3),
      id: mode === 'create' ? makeCountryIdFromIso3(draft.iso3) : draft.id
    };
    const res = validateCountryProfile(prepared, 'ملف الدولة');
    if (res.errors.length > 0 || !res.profile) {
      setErrors(res.errors);
      return;
    }
    setErrors([]);
    setSaving(true);
    try {
      await onSave(res.profile);
      onClose();
    } catch (err) {
      setErrors([(err as Error).message]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="countryEditorTitle"
      data-testid="country-editor-modal"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="w-full max-w-3xl max-h-[92vh] bg-slate-950 border border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-900 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <CountryFlagView flag={draft.flag} alt={draft.nameAr || 'علم الدولة'} size="md" />
            <div className="min-w-0">
              <h2 id="countryEditorTitle" className="text-sm sm:text-base font-bold text-slate-100 truncate">
                {mode === 'create' ? 'إنشاء ملف دولة جديدة' : `تعديل ملف: ${draft.nameAr}`}
              </h2>
              <p className="text-[11px] text-slate-400">
                سيتم حفظ التعديلات محليًا في قاعدة بيانات المتصفح (IndexedDB) وتنعكس فورًا على الخريطة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق محرر الدولة"
            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/50 flex flex-wrap gap-1.5 shrink-0">
          {(
            [
              ['identity', 'الهوية والعلم والخريطة'],
              ['leadership', 'القيادة والاستقرار'],
              ['economy_mil', 'الاقتصاد والقوات المسلحة'],
              ['diplomacy_media', 'الدبلوماسية والإعلام']
            ] as Array<[EditorTab, string]>
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border whitespace-nowrap transition-colors ${
                tab === id
                  ? 'bg-sky-600 text-white border-sky-400'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {errors.length > 0 && (
            <div
              role="alert"
              className="bg-red-950/60 border border-red-500/70 rounded-lg p-3 text-xs text-red-100 space-y-1"
            >
              {errors.map((err, i) => (
                <div key={i}>• {err}</div>
              ))}
            </div>
          )}

          {tab === 'identity' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label htmlFor="ce-iso3" className="block text-xs text-slate-300">
                    رمز ISO3 (لربط الخريطة)
                  </label>
                  <input
                    id="ce-iso3"
                    dir="ltr"
                    list="world-iso-datalist"
                    value={draft.iso3}
                    disabled={mode === 'edit'}
                    onChange={(e) => setDraft({ ...draft, iso3: normalizeIso3(e.target.value) })}
                    placeholder="مثال: SAU أو JOR"
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs font-mono text-slate-100 disabled:opacity-60"
                  />
                  <datalist id="world-iso-datalist">
                    {regionIsoOptions.map((opt) => (
                      <option key={opt.iso3} value={opt.iso3}>
                        {opt.label}
                      </option>
                    ))}
                  </datalist>
                </div>

                <div className="space-y-1">
                  <label htmlFor="ce-nameAr" className="block text-xs text-slate-300">
                    الاسم بالعربية
                  </label>
                  <input
                    id="ce-nameAr"
                    value={draft.nameAr}
                    onChange={(e) => setDraft({ ...draft, nameAr: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="ce-nameEn" className="block text-xs text-slate-300">
                    الاسم بالإنجليزية
                  </label>
                  <input
                    id="ce-nameEn"
                    dir="ltr"
                    value={draft.nameEn}
                    onChange={(e) => setDraft({ ...draft, nameEn: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label htmlFor="ce-capitalAr" className="block text-xs text-slate-300">
                    العاصمة
                  </label>
                  <input
                    id="ce-capitalAr"
                    value={draft.capitalAr}
                    onChange={(e) => setDraft({ ...draft, capitalAr: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="ce-regime" className="block text-xs text-slate-300">
                    نظام الحكم
                  </label>
                  <input
                    id="ce-regime"
                    value={draft.regimeType}
                    onChange={(e) => setDraft({ ...draft, regimeType: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="ce-pop" className="block text-xs text-slate-300">
                    السكان
                  </label>
                  <input
                    id="ce-pop"
                    dir="ltr"
                    type="number"
                    min={0}
                    value={draft.population}
                    onChange={(e) => setDraft({ ...draft, population: Math.max(0, Number(e.target.value) || 0) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs font-mono tabular-nums text-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="ce-area" className="block text-xs text-slate-300">
                    المساحة (كم²)
                  </label>
                  <input
                    id="ce-area"
                    dir="ltr"
                    type="number"
                    min={0}
                    value={draft.areaKm2}
                    onChange={(e) => setDraft({ ...draft, areaKm2: Math.max(0, Number(e.target.value) || 0) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs font-mono tabular-nums text-slate-100"
                  />
                </div>
              </div>

              {/* Map Color */}
              <div className="border-t border-slate-800 pt-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor="ce-mapColor" className="text-xs font-semibold text-slate-200">
                    لون الدولة على الخريطة العالمية
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="ce-mapColor"
                      type="color"
                      value={/^#[0-9a-fA-F]{6}$/.test(draft.mapColor) ? draft.mapColor : '#15803d'}
                      onChange={(e) => setDraft({ ...draft, mapColor: e.target.value })}
                      className="w-8 h-7 rounded border border-slate-700 bg-slate-900 cursor-pointer"
                    />
                    <input
                      type="text"
                      dir="ltr"
                      aria-label="كود اللون السداسي"
                      value={draft.mapColor}
                      onChange={(e) => setDraft({ ...draft, mapColor: e.target.value })}
                      className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-100"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {COLOR_SWATCHES.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      aria-label={`اختيار اللون ${hex}`}
                      onClick={() => setDraft({ ...draft, mapColor: hex })}
                      className={`w-7 h-7 rounded border flex items-center justify-center transition-transform ${
                        draft.mapColor.toLowerCase() === hex.toLowerCase()
                          ? 'border-white scale-105'
                          : 'border-slate-700'
                      }`}
                      style={{ backgroundColor: hex }}
                    >
                      {draft.mapColor.toLowerCase() === hex.toLowerCase() && (
                        <Check className="w-3.5 h-3.5 text-white drop-shadow" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Flag Customization */}
              <div className="border-t border-slate-800 pt-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-200">تخصيص العلم</span>
                  <div className="flex items-center gap-1.5">
                    {(
                      [
                        ['svg', 'SVG / قالب'],
                        ['image', 'صورة مرفوعة'],
                        ['emoji', 'رمز (Emoji)']
                      ] as Array<[CountryFlagAsset['mode'], string]>
                    ).map(([m, label]) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => updateFlag({ mode: m })}
                        className={`px-2.5 py-1 rounded text-[11px] border whitespace-nowrap ${
                          draft.flag.mode === m
                            ? 'bg-sky-600 text-white border-sky-400'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-slate-400">قوالب جاهزة:</span>
                  {FLAG_PRESET_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => updateFlag({ mode: 'svg', svg: tpl.svg })}
                      className="px-2 py-1 text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded whitespace-nowrap"
                    >
                      {tpl.label}
                    </button>
                  ))}
                  <label className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 rounded cursor-pointer whitespace-nowrap">
                    <Upload className="w-3 h-3" />
                    <span>رفع علم (PNG/SVG)</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFlagImageUpload(f);
                      }}
                    />
                  </label>
                </div>

                {draft.flag.mode === 'svg' && (
                  <textarea
                    dir="ltr"
                    rows={3}
                    aria-label="كود SVG للعلم"
                    value={draft.flag.svg ?? ''}
                    onChange={(e) => updateFlag({ svg: e.target.value })}
                    placeholder='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60">...</svg>'
                    className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-[11px] font-mono text-slate-200"
                  />
                )}
                {draft.flag.mode === 'emoji' && (
                  <input
                    aria-label="رمز Emoji للعلم"
                    value={draft.flag.emoji ?? ''}
                    onChange={(e) => updateFlag({ emoji: e.target.value })}
                    placeholder="🏳️"
                    className="w-32 bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-base text-center"
                  />
                )}
                {draft.flag.mode === 'image' && (
                  <input
                    dir="ltr"
                    aria-label="رابط صورة العلم أو Data URL"
                    value={draft.flag.imageUrl ?? ''}
                    onChange={(e) => updateFlag({ imageUrl: e.target.value })}
                    placeholder="https://... أو data:image/png;base64,..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs font-mono text-slate-200"
                  />
                )}
              </div>

              {/* Summary */}
              <div className="space-y-1">
                <label htmlFor="ce-summary" className="block text-xs text-slate-300">
                  الملخص الاستراتيجي للدولة
                </label>
                <textarea
                  id="ce-summary"
                  rows={3}
                  value={draft.summary}
                  onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100 leading-5"
                />
              </div>
            </div>
          )}

          {tab === 'leadership' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <LeaderPortraitView
                    name={draft.leader.name}
                    portraitSvg={draft.leader.portraitSvg}
                    portraitUrl={draft.leader.portraitUrl}
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-200">صورة رئيس الدولة (اختياري)</div>
                    <div className="text-[11px] text-slate-400">يمكنك رفع صورة PNG/JPG أو تركها للأحرف التلقائية</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 rounded-md cursor-pointer whitespace-nowrap">
                    <Upload className="w-3.5 h-3.5" />
                    <span>رفع صورة</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handlePortraitImageUpload(f);
                      }}
                    />
                  </label>
                  {(draft.leader.portraitUrl || draft.leader.portraitSvg) && (
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          leader: { ...draft.leader, portraitUrl: undefined, portraitSvg: undefined }
                        })
                      }
                      className="px-2.5 py-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-md"
                    >
                      مسح الصورة
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="ce-leader-name" className="block text-xs text-slate-300">
                    اسم رئيس الدولة
                  </label>
                  <input
                    id="ce-leader-name"
                    value={draft.leader.name}
                    onChange={(e) => setDraft({ ...draft, leader: { ...draft.leader, name: e.target.value } })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="ce-leader-title" className="block text-xs text-slate-300">
                    منصب رئيس الدولة
                  </label>
                  <input
                    id="ce-leader-title"
                    value={draft.leader.title}
                    onChange={(e) => setDraft({ ...draft, leader: { ...draft.leader, title: e.target.value } })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="ce-gov-head" className="block text-xs text-slate-300">
                    رئيس الحكومة / الجهة التنفيذية
                  </label>
                  <input
                    id="ce-gov-head"
                    value={draft.government.headOfGovernment}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        government: { ...draft.government, headOfGovernment: e.target.value }
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="ce-gov-title" className="block text-xs text-slate-300">
                    مسمى رئاسة الحكومة
                  </label>
                  <input
                    id="ce-gov-title"
                    value={draft.government.headTitle}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        government: { ...draft.government, headTitle: e.target.value }
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100"
                  />
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4 space-y-3">
                <h3 className="text-xs font-semibold text-slate-200">مؤشرات الاستقرار والنفوذ</h3>
                <PctInput
                  id="ce-pol-stab"
                  label="الاستقرار السياسي"
                  value={draft.stability.politicalStability}
                  onChange={(v) => setDraft({ ...draft, stability: { ...draft.stability, politicalStability: v } })}
                />
                <PctInput
                  id="ce-int-stab"
                  label="الاستقرار الداخلي"
                  value={draft.stability.internalStability}
                  onChange={(v) => setDraft({ ...draft, stability: { ...draft.stability, internalStability: v } })}
                />
                <PctInput
                  id="ce-intl-inf"
                  label="النفوذ الدولي"
                  value={draft.stability.internationalInfluence}
                  onChange={(v) => setDraft({ ...draft, stability: { ...draft.stability, internationalInfluence: v } })}
                />
              </div>
            </div>
          )}

          {tab === 'economy_mil' && (
            <div className="space-y-5">
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-200">المؤشرات الاقتصادية والموارد</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="ce-gdp" className="block text-xs text-slate-300">
                      الناتج المحلي (مليار $)
                    </label>
                    <input
                      id="ce-gdp"
                      dir="ltr"
                      type="number"
                      min={0}
                      value={draft.economy.gdpBillionUsd}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          economy: { ...draft.economy, gdpBillionUsd: Math.max(0, Number(e.target.value) || 0) }
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs font-mono tabular-nums text-slate-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="ce-budget" className="block text-xs text-slate-300">
                      الميزانية السنوية (مليار $)
                    </label>
                    <input
                      id="ce-budget"
                      dir="ltr"
                      type="number"
                      min={0}
                      value={draft.economy.annualBudgetBillionUsd}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          economy: {
                            ...draft.economy,
                            annualBudgetBillionUsd: Math.max(0, Number(e.target.value) || 0)
                          }
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs font-mono tabular-nums text-slate-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="ce-currency" className="block text-xs text-slate-300">
                      رمز العملة
                    </label>
                    <input
                      id="ce-currency"
                      dir="ltr"
                      value={draft.economy.currencyCode ?? ''}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          economy: { ...draft.economy, currencyCode: e.target.value.toUpperCase() }
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs font-mono text-slate-100"
                    />
                  </div>
                </div>

                <PctInput
                  id="ce-econ-pwr"
                  label="القوة الاقتصادية"
                  value={draft.economy.economicPower}
                  onChange={(v) => setDraft({ ...draft, economy: { ...draft.economy, economicPower: v } })}
                />

                <div className="space-y-2">
                  <label htmlFor="ce-add-resource" className="block text-xs text-slate-300">
                    الموارد الاقتصادية الرئيسية
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="ce-add-resource"
                      value={newResource}
                      onChange={(e) => setNewResource(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddResource();
                        }
                      }}
                      placeholder="أضف مورداً (مثال: الغاز الطبيعي)"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={handleAddResource}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 rounded-md whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة</span>
                    </button>
                  </div>
                  <div className="space-y-1">
                    {draft.economy.primaryResources.map((res, idx) => (
                      <div
                        key={`${res}-${idx}`}
                        className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs"
                      >
                        <span className="text-slate-200">{res}</span>
                        <button
                          type="button"
                          aria-label={`حذف المورد ${res}`}
                          onClick={() => handleRemoveResource(idx)}
                          className="text-slate-400 hover:text-red-300 p-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold text-slate-200">توزيع القوة العسكرية</h3>
                  <div className="flex items-center gap-2">
                    <label htmlFor="ce-personnel" className="text-[11px] text-slate-400">
                      الأفراد العاملون:
                    </label>
                    <input
                      id="ce-personnel"
                      dir="ltr"
                      type="number"
                      min={0}
                      value={draft.military.activePersonnel ?? 0}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          military: { ...draft.military, activePersonnel: Math.max(0, Number(e.target.value) || 0) }
                        })
                      }
                      className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono tabular-nums text-slate-100"
                    />
                  </div>
                </div>

                <PctInput
                  id="ce-mil-all"
                  label="القوة العسكرية الإجمالية"
                  value={draft.military.overallPower}
                  onChange={(v) => setDraft({ ...draft, military: { ...draft.military, overallPower: v } })}
                />
                <PctInput
                  id="ce-mil-land"
                  label="القوات البرية"
                  value={draft.military.landForces}
                  onChange={(v) => setDraft({ ...draft, military: { ...draft.military, landForces: v } })}
                />
                <PctInput
                  id="ce-mil-sea"
                  label="القوات البحرية"
                  value={draft.military.navalForces}
                  onChange={(v) => setDraft({ ...draft, military: { ...draft.military, navalForces: v } })}
                />
                <PctInput
                  id="ce-mil-air"
                  label="القوات الجوية"
                  value={draft.military.airForces}
                  onChange={(v) => setDraft({ ...draft, military: { ...draft.military, airForces: v } })}
                />
                <div className="space-y-1">
                  <label htmlFor="ce-doctrine" className="block text-xs text-slate-300">
                    العقيدة العسكرية
                  </label>
                  <input
                    id="ce-doctrine"
                    value={draft.military.doctrine ?? ''}
                    onChange={(e) => setDraft({ ...draft, military: { ...draft.military, doctrine: e.target.value } })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100"
                  />
                </div>
              </div>
            </div>
          )}

          {tab === 'diplomacy_media' && (
            <div className="space-y-5">
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-200">إدارة التحالفات والخصومات</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-900/70 border border-slate-800 rounded-lg p-3">
                  <select
                    aria-label="نوع القائمة الدبلوماسية"
                    value={relKind}
                    onChange={(e) => {
                      const next = e.target.value as 'alliances' | 'rivalries';
                      setRelKind(next);
                      setRelType(next === 'alliances' ? 'alliance' : 'rivalry');
                    }}
                    className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
                  >
                    <option value="alliances">إضافة إلى الحلفاء والشركاء</option>
                    <option value="rivalries">إضافة إلى الخصومات والتوترات</option>
                  </select>

                  <select
                    aria-label="تفاصيل نوع العلاقة"
                    value={relType}
                    onChange={(e) => setRelType(e.target.value as CountryRelationType)}
                    className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
                  >
                    {RELATION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="اختيار دولة مسجلة"
                    value={relTargetIso3}
                    onChange={(e) => {
                      const iso = e.target.value;
                      setRelTargetIso3(iso);
                      const found = knownCountryMap.get(iso);
                      if (found) setRelName(found.nameAr);
                    }}
                    className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
                  >
                    <option value="">-- ربط بدولة مسجلة (اختياري) --</option>
                    {knownCountries
                      .filter((c) => c.iso3 !== draft.iso3)
                      .map((c) => (
                        <option key={c.iso3} value={c.iso3}>
                          {c.nameAr} ({c.iso3})
                        </option>
                      ))}
                  </select>

                  <input
                    value={relName}
                    onChange={(e) => setRelName(e.target.value)}
                    placeholder="اسم الدولة أو الكتلة"
                    className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
                  />

                  <input
                    value={relNotes}
                    onChange={(e) => setRelNotes(e.target.value)}
                    placeholder="ملاحظة مختصرة (اختياري)"
                    className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
                  />

                  <button
                    type="button"
                    onClick={handleAddRelation}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded border border-sky-400 whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة العلاقة</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-medium text-emerald-300">الحلفاء ({draft.diplomacy.alliances.length})</div>
                    {draft.diplomacy.alliances.map((rel, idx) => (
                      <div
                        key={`ed-ally-${idx}`}
                        className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs"
                      >
                        <span className="truncate text-slate-200">
                          {rel.name} {rel.targetIso3 ? `(${rel.targetIso3})` : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveRelation('alliances', idx)}
                          className="text-slate-400 hover:text-red-300"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-[11px] font-medium text-rose-300">الخصومات ({draft.diplomacy.rivalries.length})</div>
                    {draft.diplomacy.rivalries.map((rel, idx) => (
                      <div
                        key={`ed-rival-${idx}`}
                        className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs"
                      >
                        <span className="truncate text-slate-200">
                          {rel.name} {rel.targetIso3 ? `(${rel.targetIso3})` : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveRelation('rivalries', idx)}
                          className="text-slate-400 hover:text-red-300"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4 space-y-3">
                <h3 className="text-xs font-semibold text-slate-200">الإعلام والرأي العام</h3>
                <PctInput
                  id="ce-pub-opinion"
                  label="مؤشر الرأي العام الداخلي"
                  value={draft.mediaAndPublic.publicOpinion}
                  onChange={(v) => setDraft({ ...draft, mediaAndPublic: { ...draft.mediaAndPublic, publicOpinion: v } })}
                />
                <PctInput
                  id="ce-media-inf"
                  label="التأثير الإعلامي"
                  value={draft.mediaAndPublic.mediaInfluence}
                  onChange={(v) => setDraft({ ...draft, mediaAndPublic: { ...draft.mediaAndPublic, mediaInfluence: v } })}
                />
                <div className="space-y-1">
                  <label htmlFor="ce-media-narrative" className="block text-xs text-slate-300">
                    السردية الإعلامية الحالية
                  </label>
                  <textarea
                    id="ce-media-narrative"
                    rows={2}
                    value={draft.mediaAndPublic.narrativeSummary ?? ''}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        mediaAndPublic: { ...draft.mediaAndPublic, narrativeSummary: e.target.value }
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md whitespace-nowrap"
          >
            إلغاء
          </button>

          <button
            type="submit"
            id="saveCountryModalBtn"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white border border-emerald-400 rounded-md whitespace-nowrap"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'جاري الحفظ...' : mode === 'create' ? 'إنشاء وحفظ الدولة' : 'حفظ التعديلات'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
