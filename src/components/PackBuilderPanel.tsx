import React, { useRef } from 'react';
import { Download, FileUp, ImagePlus, MapPin, Paintbrush, Play, Shapes } from 'lucide-react';
import { MapPack } from '../core/types';

export type MapEditTool = 'anchor' | 'zone' | 'paint_land' | 'paint_sea' | 'paint_block';

interface PackBuilderPanelProps {
  maps: Record<string, MapPack>;
  activeMapId: string;
  onSelectActiveMap: (mapId: string) => void;
  newMapId: string;
  onChangeNewMapId: (val: string) => void;
  onUploadNewMapImage: (file: File) => void;
  mapTool: MapEditTool;
  onSelectMapTool: (tool: MapEditTool) => void;
  pointName: string;
  onChangePointName: (val: string) => void;
  draftZoneCount: number;
  onFinishZone: () => void;
  onClearDraftZone: () => void;
  onSaveCurrentMap: () => void;
  onCreateStarterScenario: () => void;
  newActorId: string;
  onChangeNewActorId: (val: string) => void;
  newActorLabel: string;
  onChangeNewActorLabel: (val: string) => void;
  newActorTpl: string;
  onChangeNewActorTpl: (val: string) => void;
  hasPendingActorImage: boolean;
  onUploadActorImage: (file: File) => void;
  onSaveCustomActor: () => void;
  onExportPack: () => void;
  onImportPackFile: (file: File) => void;
  packNotice: { kind: 'ok' | 'err'; text: string } | null;
}

const MAP_TOOLS: Array<{ id: MapEditTool; label: string }> = [
  { id: 'anchor', label: '+ مرسى (Anchor)' },
  { id: 'zone', label: '+ منطقة (Zone)' },
  { id: 'paint_land', label: 'فرشاة يابسة' },
  { id: 'paint_sea', label: 'فرشاة بحر' },
  { id: 'paint_block', label: 'فرشاة عائق' }
];

export function PackBuilderPanel({
  maps,
  activeMapId,
  onSelectActiveMap,
  newMapId,
  onChangeNewMapId,
  onUploadNewMapImage,
  mapTool,
  onSelectMapTool,
  pointName,
  onChangePointName,
  draftZoneCount,
  onFinishZone,
  onClearDraftZone,
  onSaveCurrentMap,
  onCreateStarterScenario,
  newActorId,
  onChangeNewActorId,
  newActorLabel,
  onChangeNewActorLabel,
  newActorTpl,
  onChangeNewActorTpl,
  hasPendingActorImage,
  onUploadActorImage,
  onSaveCustomActor,
  onExportPack,
  onImportPackFile,
  packNotice
}: PackBuilderPanelProps) {
  const mapImgRef = useRef<HTMLInputElement>(null);
  const actorImgRef = useRef<HTMLInputElement>(null);
  const packImportRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>, fn: (f: File) => void) => {
    const file = e.target.files?.[0];
    if (file) fn(file);
    e.target.value = '';
  };

  return (
    <div id="viewPack" className="flex flex-col gap-3.5">
      {/* 1) Map Editor / Creator */}
      <section aria-label="محرر الخريطة والملاحة" className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-300">
            <MapPin className="w-3.5 h-3.5" />
            <span>1. الخريطة، المراسي، وشبكة الملاحة</span>
          </span>
        </div>

        <div className="space-y-1">
          <label htmlFor="builderMapSelect" className="block text-[11px] text-slate-400">
            الخريطة قيد التحرير
          </label>
          <select
            id="builderMapSelect"
            value={activeMapId}
            onChange={(e) => onSelectActiveMap(e.target.value)}
            className="w-full bg-slate-900 text-slate-100 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-sky-400"
          >
            {Object.values(maps).map((m) => (
              <option key={m.id} value={m.id}>
                {m.title} ({m.id})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            id="newMapId"
            dir="ltr"
            value={newMapId}
            onChange={(e) => onChangeNewMapId(e.target.value)}
            placeholder="my_custom_map"
            aria-label="معرف الخريطة الجديدة"
            className="flex-1 min-w-0 bg-slate-900 text-slate-100 border border-slate-700 rounded-md px-2.5 py-1.5 font-mono text-xs focus:outline-none focus:border-sky-400"
          />
          <input
            ref={mapImgRef}
            id="mapImageInput"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e, onUploadNewMapImage)}
          />
          <button
            type="button"
            onClick={() => mapImgRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-md whitespace-nowrap shrink-0"
          >
            <ImagePlus className="w-3.5 h-3.5 text-sky-400" />
            <span>رفع خريطة جديدة</span>
          </button>
        </div>

        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
            <Paintbrush className="w-3 h-3" />
            <span>أداة النقر / السحب على الخريطة:</span>
          </span>
          <div id="mapToolBar" className="flex flex-wrap gap-1.5">
            {MAP_TOOLS.map((t) => (
              <button
                key={t.id}
                type="button"
                data-mtool={t.id}
                onClick={() => onSelectMapTool(t.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 transition-colors ${
                  mapTool === t.id
                    ? 'bg-sky-600 border-sky-400 text-white'
                    : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <input
            type="text"
            id="pointNameInput"
            dir="ltr"
            value={pointName}
            onChange={(e) => onChangePointName(e.target.value)}
            placeholder="anchor_or_zone_id"
            aria-label="اسم المرسى أو المنطقة بالإنجليزية"
            className="flex-1 min-w-0 bg-slate-900 text-slate-100 border border-slate-700 rounded-md px-2.5 py-1.5 font-mono text-xs focus:outline-none focus:border-sky-400"
          />
          {mapTool === 'zone' && (
            <>
              <button
                type="button"
                id="finishZoneBtn"
                onClick={onFinishZone}
                disabled={draftZoneCount < 3}
                className="px-2.5 py-1.5 text-xs font-medium bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white border border-emerald-500 rounded-md whitespace-nowrap shrink-0"
              >
                إنهاء ({draftZoneCount})
              </button>
              {draftZoneCount > 0 && (
                <button
                  type="button"
                  onClick={onClearDraftZone}
                  className="px-2 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-md shrink-0"
                >
                  مسح
                </button>
              )}
            </>
          )}
        </div>

        <p className="text-[11px] text-slate-400 leading-4">
          {mapTool.startsWith('paint_')
            ? 'اسحب بالماوس مباشرة فوق الخريطة لرسم طبقة الملاحة (أزرق = بحر، أحمر = عائق).'
            : mapTool === 'zone'
              ? 'انقر 3 نقاط أو أكثر على الخريطة لتحديد مضلع المنطقة ثم اضغط «إنهاء».'
              : 'انقر على أي موقع في الخريطة لإضافة مرسى مسمى جديد.'}
        </p>

        <div className="flex flex-wrap gap-1.5 pt-1">
          <button
            type="button"
            id="saveMapBtn"
            onClick={onSaveCurrentMap}
            className="flex-1 px-3 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white border border-sky-400 rounded-md whitespace-nowrap shrink-0"
          >
            حفظ الخريطة في الاستوديو
          </button>
          <button
            type="button"
            onClick={onCreateStarterScenario}
            title="توليد سيناريو تجريبي للخريطة الحالية والانتقال للمشغل"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-md whitespace-nowrap shrink-0"
          >
            <Play className="w-3 h-3 text-emerald-400" />
            <span>تجربة في المشغّل</span>
          </button>
        </div>
      </section>

      {/* 2) Actor Creator */}
      <section aria-label="إضافة كيان جديد" className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-300">
          <Shapes className="w-3.5 h-3.5" />
          <span>2. إضافة كيان جديد (شخصية / آلية / سفينة / مبنى)</span>
        </span>

        <div className="grid grid-cols-2 gap-1.5">
          <input
            type="text"
            id="newActorId"
            dir="ltr"
            value={newActorId}
            onChange={(e) => onChangeNewActorId(e.target.value)}
            placeholder="cargo_truck"
            aria-label="معرف الكيان"
            className="bg-slate-900 text-slate-100 border border-slate-700 rounded-md px-2.5 py-1.5 font-mono text-xs focus:outline-none focus:border-sky-400"
          />
          <input
            type="text"
            id="newActorLabel"
            value={newActorLabel}
            onChange={(e) => onChangeNewActorLabel(e.target.value)}
            placeholder="الاسم الظاهر"
            aria-label="الاسم الظاهر للكيان"
            className="bg-slate-900 text-slate-100 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-sky-400"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <select
            id="newActorTpl"
            aria-label="قالب الوراثة"
            value={newActorTpl}
            onChange={(e) => onChangeNewActorTpl(e.target.value)}
            className="flex-1 bg-slate-900 text-slate-100 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-sky-400"
          >
            <option value="_person">قالب: شخصية (_person)</option>
            <option value="_vehicle">قالب: آلية برية (_vehicle)</option>
            <option value="_ship">قالب: سفينة (_ship)</option>
            <option value="_carrier">قالب: حاملة طائرات (_carrier)</option>
            <option value="_air">قالب: مقاتلة / طائرة (_air)</option>
            <option value="_heli">قالب: مروحية (_heli)</option>
            <option value="_building">قالب: مبنى / منشأة (_building)</option>
          </select>

          <input
            ref={actorImgRef}
            id="actorImgInput"
            type="file"
            accept="image/*,.svg"
            className="hidden"
            onChange={(e) => handleFile(e, onUploadActorImage)}
          />
          <button
            type="button"
            onClick={() => actorImgRef.current?.click()}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 ${
              hasPendingActorImage
                ? 'bg-emerald-900/60 border-emerald-500 text-emerald-200'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
            }`}
          >
            {hasPendingActorImage ? 'تم اختيار الصورة' : 'رفع صورة'}
          </button>
        </div>

        <button
          type="button"
          id="saveActorBtn"
          onClick={onSaveCustomActor}
          className="w-full px-3 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white border border-sky-400 rounded-md whitespace-nowrap"
        >
          حفظ الكيان وإضافته للأدوات
        </button>
      </section>

      {/* 3) Bundle Import / Export */}
      <section aria-label="تصدير واستيراد الحزم" className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-2">
        <span className="text-xs font-semibold text-slate-300 block">3. تصدير واستيراد الحزم (.pack.yaml)</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="exportPackBtn"
            onClick={onExportPack}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-md whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>تصدير .pack.yaml</span>
          </button>

          <input
            ref={packImportRef}
            type="file"
            accept=".yaml,.yml"
            className="hidden"
            onChange={(e) => handleFile(e, onImportPackFile)}
          />
          <button
            type="button"
            onClick={() => packImportRef.current?.click()}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-md whitespace-nowrap"
          >
            <FileUp className="w-3.5 h-3.5 text-amber-400" />
            <span>استيراد حزمة</span>
          </button>
        </div>
      </section>

      {packNotice && (
        <div
          id="packStatusBox"
          role="status"
          className={`rounded-md p-2.5 text-xs border ${
            packNotice.kind === 'ok'
              ? 'bg-emerald-950/80 border-emerald-600/80 text-emerald-200'
              : 'bg-red-950/80 border-red-600/80 text-red-200'
          }`}
        >
          {packNotice.text}
        </div>
      )}
    </div>
  );
}
