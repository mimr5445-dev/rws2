import {
  ArrowUpRight,
  BookOpen,
  Camera,
  CircleDot,
  Clapperboard,
  Download,
  FileCode2,
  MousePointer,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Square,
  Trash2,
  Upload,
  Video,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';
import { useState } from 'react';
import { SavedScenarioRecord, ValidationIssue } from '../core/types';

interface ToolsDockProps {
  open: boolean;
  onToggleOpen: () => void;
  playing: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  speed: number;
  onChangeSpeed: (s: number) => void;
  muted: boolean;
  onToggleMute: () => void;
  recordingVideo: boolean;
  onToggleVideoRecord: () => void;
  cinematicCamera: boolean;
  onToggleCinematicCamera: () => void;
  unitScale: number;
  onChangeUnitScale: (s: number) => void;
  onSelectMode: () => void;
  onClearBoard: () => void;
  // Action Recorder
  actionRecording: boolean;
  recStats: { clockSec: number; stepCount: number };
  onStartActionRecord: () => void;
  onStopActionRecord: () => void;
  onRecCamera: () => void;
  onRecCaptionSubmit: (text: string) => void;
  onRecArrow: () => void;
  onRecPulse: () => void;
  onRecDeleteUnit: () => void;
  hasSelectedEntity: boolean;
  // Save draft modal inside dock
  pendingSaveMode: 'recorded' | 'code' | null;
  saveDraftTitle: string;
  onChangeSaveDraftTitle: (t: string) => void;
  onConfirmSaveScenario: () => void;
  onCancelSaveScenario: () => void;
  // User saved scenarios (no presets)
  userScenarios: SavedScenarioRecord[];
  selectedScenarioId: string;
  onSelectScenarioId: (id: string) => void;
  onLoadSelectedScenario: () => void;
  onDeleteSelectedScenario: () => void;
  // YAML
  yamlText: string;
  onChangeYamlText: (y: string) => void;
  onRunYaml: () => void;
  onRequestSaveYaml: () => void;
  onUploadYamlFile: (file: File) => void;
  onOpenSpecModal: () => void;
  issues: ValidationIssue[];
  yamlSyntaxError: string | null;
  statusNotice: string | null;
}

export function ToolsDock({
  open,
  onToggleOpen,
  playing,
  onTogglePlay,
  onRestart,
  speed,
  onChangeSpeed,
  muted,
  onToggleMute,
  recordingVideo,
  onToggleVideoRecord,
  cinematicCamera,
  onToggleCinematicCamera,
  unitScale,
  onChangeUnitScale,
  onSelectMode,
  onClearBoard,
  actionRecording,
  recStats,
  onStartActionRecord,
  onStopActionRecord,
  onRecCamera,
  onRecCaptionSubmit,
  onRecArrow,
  onRecPulse,
  onRecDeleteUnit,
  hasSelectedEntity,
  pendingSaveMode,
  saveDraftTitle,
  onChangeSaveDraftTitle,
  onConfirmSaveScenario,
  onCancelSaveScenario,
  userScenarios,
  selectedScenarioId,
  onSelectScenarioId,
  onLoadSelectedScenario,
  onDeleteSelectedScenario,
  yamlText,
  onChangeYamlText,
  onRunYaml,
  onRequestSaveYaml,
  onUploadYamlFile,
  onOpenSpecModal,
  issues,
  yamlSyntaxError,
  statusNotice
}: ToolsDockProps) {
  const [captionDraft, setCaptionDraft] = useState('');
  const [yamlExpanded, setYamlExpanded] = useState(false);

  return (
    <div
      dir="ltr"
      className="fixed right-2 top-14 z-30 flex flex-col items-end pointer-events-none"
    >
      {/* زر أيقونة الأدوات المنفصل في الزاوية اليمنى */}
      <button
        type="button"
        id="toolsDockToggle"
        aria-label="أدوات الاستوديو"
        aria-expanded={open}
        onClick={onToggleOpen}
        className={`pointer-events-auto min-h-[44px] min-w-[44px] px-2.5 flex items-center gap-2 rounded-xl border shadow-xl backdrop-blur-md transition-colors whitespace-nowrap shrink-0 ${
          open || actionRecording || recordingVideo
            ? 'bg-emerald-600/95 border-emerald-400 text-white'
            : 'bg-slate-950/90 border-slate-700/90 text-slate-100 hover:bg-slate-900'
        }`}
      >
        <SlidersHorizontal className="w-5 h-5 shrink-0" />
        <span className="text-xs font-semibold hidden sm:inline">الأدوات</span>
        {(actionRecording || recordingVideo) && (
          <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse shrink-0" aria-hidden="true" />
        )}
      </button>

      {/* مستطيل الأدوات الملاصق للشاشة اليمنى */}
      {open && (
        <section
          id="toolsDockDrawer"
          dir="rtl"
          aria-label="شريط الأدوات"
          className="pointer-events-auto mt-2 w-[min(282px,calc(100vw-16px))] max-h-[70dvh] flex flex-col bg-slate-950/95 border border-slate-700/90 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden"
        >
          <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <SlidersHorizontal className="w-4 h-4 text-emerald-400 shrink-0" />
              <h2 className="text-xs font-bold text-slate-100 truncate">أدوات الاستوديو</h2>
            </div>
            <button
              type="button"
              aria-label="إغلاق شريط الأدوات"
              onClick={onToggleOpen}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-3 text-xs">
            {/* تحكم سريع باللوح */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={onSelectMode}
                className="min-h-[38px] px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 flex items-center justify-center gap-1.5 font-medium whitespace-nowrap"
              >
                <MousePointer className="w-3.5 h-3.5 text-sky-400" />
                <span>تحديد وتحريك</span>
              </button>
              <button
                type="button"
                id="clearBoardBtn"
                onClick={onClearBoard}
                className="min-h-[38px] px-2.5 rounded-lg bg-slate-900 hover:bg-red-950/70 border border-slate-700 hover:border-red-500/60 text-slate-200 flex items-center justify-center gap-1.5 font-medium whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>تفريغ اللوح</span>
              </button>
            </div>

            {/* التشغيل والصوت وتصدير الفيديو */}
            <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  id="playBtn"
                  onClick={onTogglePlay}
                  className={`flex-1 min-h-[36px] px-2.5 rounded-md font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    playing
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{playing ? 'إيقاف' : 'تشغيل'}</span>
                </button>
                <button
                  type="button"
                  onClick={onRestart}
                  aria-label="إعادة التشغيل"
                  className="min-h-[36px] px-2.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onToggleMute}
                  aria-label={muted ? 'تشغيل الصوت' : 'كتم الصوت'}
                  className="min-h-[36px] px-2.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                >
                  {muted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-sky-400" />}
                </button>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  {[0.5, 1, 2].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onChangeSpeed(s)}
                      className={`px-2 py-1 rounded text-[11px] font-mono tabular-nums border ${
                        speed === s
                          ? 'bg-sky-600 border-sky-400 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-300'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={onToggleVideoRecord}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 border whitespace-nowrap ${
                    recordingVideo
                      ? 'bg-red-600 border-red-400 text-white animate-pulse'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                  }`}
                >
                  {recordingVideo ? <Download className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5 text-rose-400" />}
                  <span>{recordingVideo ? 'إيقاف وحفظ' : 'فيديو'}</span>
                </button>
              </div>

              <button
                type="button"
                id="toolsCinematicCamBtn"
                aria-pressed={cinematicCamera}
                onClick={onToggleCinematicCamera}
                className={`w-full min-h-[36px] px-2.5 rounded-md border text-[11px] font-semibold flex items-center justify-between gap-2 transition-colors ${
                  cinematicCamera
                    ? 'bg-amber-600/90 hover:bg-amber-500 border-amber-300 text-white shadow-lg shadow-amber-950/40'
                    : 'bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-slate-200'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Clapperboard className={`w-3.5 h-3.5 shrink-0 ${cinematicCamera ? 'text-white' : 'text-amber-400'}`} />
                  <span>كاميرا سينمائية تلقائية مع الأحداث</span>
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    cinematicCamera ? 'bg-black/30 text-amber-100' : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  {cinematicCamera ? 'مفعّلة' : 'إيقاف'}
                </span>
              </button>
            </div>

            {/* مسجل السيناريو الحي */}
            <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Radio className={`w-3.5 h-3.5 ${actionRecording ? 'text-red-400 animate-pulse' : 'text-slate-400'}`} />
                  <span>التسجيل الحي</span>
                </span>
                {actionRecording && (
                  <span className="font-mono tabular-nums text-[11px] text-rose-300">
                    {recStats.clockSec.toFixed(1)}s · {recStats.stepCount}
                  </span>
                )}
              </div>

              {!actionRecording ? (
                <button
                  type="button"
                  id="startActionRecordBtn"
                  onClick={onStartActionRecord}
                  className="w-full min-h-[36px] px-3 rounded-md bg-rose-700 hover:bg-rose-600 border border-rose-500 text-white font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <CircleDot className="w-3.5 h-3.5" />
                  <span>بدء تسجيل سيناريو جديد</span>
                </button>
              ) : (
                <div className="space-y-1.5">
                  <button
                    type="button"
                    id="stopActionRecordBtn"
                    onClick={onStopActionRecord}
                    className="w-full min-h-[34px] px-3 rounded-md bg-red-600 hover:bg-red-500 text-white font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>إنهاء وحفظ التسجيل</span>
                  </button>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={onRecCamera}
                      className="py-1.5 px-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] flex items-center justify-center gap-1"
                    >
                      <Camera className="w-3 h-3 text-sky-400" />
                      <span>كاميرا</span>
                    </button>
                    <button
                      type="button"
                      onClick={onRecArrow}
                      className="py-1.5 px-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] flex items-center justify-center gap-1"
                    >
                      <ArrowUpRight className="w-3 h-3 text-amber-400" />
                      <span>سهم</span>
                    </button>
                    <button
                      type="button"
                      onClick={onRecPulse}
                      className="py-1.5 px-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] flex items-center justify-center gap-1"
                    >
                      <Radio className="w-3 h-3 text-rose-400" />
                      <span>نبض</span>
                    </button>
                  </div>
                  {hasSelectedEntity && (
                    <button
                      type="button"
                      onClick={onRecDeleteUnit}
                      className="w-full py-1 rounded bg-red-950/70 hover:bg-red-900 border border-red-700/70 text-red-200 text-[11px]"
                    >
                      حذف الوحدة المحددة من المشهد
                    </button>
                  )}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!captionDraft.trim()) return;
                      onRecCaptionSubmit(captionDraft.trim());
                      setCaptionDraft('');
                    }}
                    className="flex gap-1"
                  >
                    <input
                      type="text"
                      value={captionDraft}
                      onChange={(e) => setCaptionDraft(e.target.value)}
                      placeholder="نص تعليق سفلي..."
                      className="flex-1 min-w-0 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-[11px] text-slate-100"
                    />
                    <button
                      type="submit"
                      className="px-2 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold"
                    >
                      إدراج
                    </button>
                  </form>
                </div>
              )}

              {pendingSaveMode && (
                <div className="p-2 rounded bg-slate-950 border border-sky-500/60 space-y-1.5">
                  <input
                    type="text"
                    value={saveDraftTitle}
                    onChange={(e) => onChangeSaveDraftTitle(e.target.value)}
                    placeholder="اسم السيناريو..."
                    className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-100"
                  />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={onConfirmSaveScenario}
                      className="flex-1 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px]"
                    >
                      حفظ الآن
                    </button>
                    <button
                      type="button"
                      onClick={onCancelSaveScenario}
                      className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-[11px]"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* السيناريوهات المحفوظة من المستخدم فقط */}
            {userScenarios.length > 0 && (
              <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-300">سيناريوهاتي المحفوظة</div>
                <select
                  aria-label="سيناريوهاتي المحفوظة"
                  value={selectedScenarioId}
                  onChange={(e) => onSelectScenarioId(e.target.value)}
                  className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-700 text-xs text-slate-100"
                >
                  {userScenarios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={onLoadSelectedScenario}
                    className="flex-1 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold"
                  >
                    تشغيل
                  </button>
                  <button
                    type="button"
                    onClick={onDeleteSelectedScenario}
                    aria-label="حذف السيناريو"
                    className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-red-950 border border-slate-700 text-red-300 text-[11px]"
                  >
                    حذف
                  </button>
                </div>
              </div>
            )}

            {/* حجم الوحدات العام */}
            <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300 font-medium">حجم الوحدات العام</span>
                <span className="font-mono tabular-nums text-sky-300">{unitScale.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                aria-label="حجم الوحدات العام"
                min={0.4}
                max={2.4}
                step={0.1}
                value={unitScale}
                onChange={(e) => onChangeUnitScale(parseFloat(e.target.value))}
                className="w-full accent-sky-400 cursor-pointer"
              />
            </div>

            {/* محرر YAML المتقدم (قابل للطي) */}
            <div className="rounded-lg bg-slate-900/90 border border-slate-800 overflow-hidden">
              <button
                type="button"
                onClick={() => setYamlExpanded((v) => !v)}
                className="w-full px-2.5 py-2 flex items-center justify-between text-[11px] font-semibold text-slate-300 hover:bg-slate-800/60"
              >
                <span className="flex items-center gap-1.5">
                  <FileCode2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>محرر السيناريو (YAML)</span>
                </span>
                <span className="text-slate-500">{yamlExpanded ? '▲' : '▼'}</span>
              </button>
              {yamlExpanded && (
                <div className="p-2 pt-0 space-y-2 border-t border-slate-800/70">
                  <textarea
                    value={yamlText}
                    onChange={(e) => onChangeYamlText(e.target.value)}
                    rows={6}
                    dir="ltr"
                    spellCheck={false}
                    className="w-full mt-2 p-2 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-200 resize-y"
                  />
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={onRunYaml}
                      className="py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold"
                    >
                      تشغيل الكود
                    </button>
                    <button
                      type="button"
                      onClick={onRequestSaveYaml}
                      className="py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-semibold flex items-center justify-center gap-1"
                    >
                      <Save className="w-3 h-3" />
                      <span>حفظ</span>
                    </button>
                    <label className="py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] flex items-center justify-center gap-1 cursor-pointer">
                      <Upload className="w-3 h-3" />
                      <span>استيراد</span>
                      <input
                        type="file"
                        accept=".yaml,.yml"
                        className="sr-only"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) onUploadYamlFile(f);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={onOpenSpecModal}
                      className="py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] flex items-center justify-center gap-1"
                    >
                      <BookOpen className="w-3 h-3 text-amber-400" />
                      <span>الدليل</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {statusNotice && (
              <div className="p-2 rounded bg-emerald-950/70 border border-emerald-600/60 text-emerald-200 text-[11px]">
                {statusNotice}
              </div>
            )}
            {yamlSyntaxError && (
              <div className="p-2 rounded bg-red-950/80 border border-red-500/70 text-red-200 text-[11px]">
                {yamlSyntaxError}
              </div>
            )}
            {issues.length > 0 && (
              <ul className="p-2 rounded bg-red-950/80 border border-red-500/70 text-red-200 text-[11px] space-y-1">
                {issues.slice(0, 4).map((iss, i) => (
                  <li key={i}>
                    [{iss.stepIndex + 1}] {iss.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
