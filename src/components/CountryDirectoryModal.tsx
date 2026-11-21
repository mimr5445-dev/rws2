import React, { useMemo, useState } from 'react';
import { Download, Globe2, Plus, Search, Upload, X } from 'lucide-react';
import { CountryProfile } from '../countries/countryTypes';
import { CountryFlagView } from './CountryFlagView';

interface CountryDirectoryModalProps {
  open: boolean;
  countries: CountryProfile[];
  isWorldMapActive: boolean;
  onClose: () => void;
  onSelectCountry: (country: CountryProfile) => void;
  onCreateNewCountry: () => void;
  onSwitchToWorldMap: () => void;
  onExportAllJson: () => void;
  onImportJsonFile: (file: File) => Promise<{ ok: boolean; message: string }>;
}

type SourceFilter = 'all' | 'seed_demo' | 'custom';

export function CountryDirectoryModal({
  open,
  countries,
  isWorldMapActive,
  onClose,
  onSelectCountry,
  onCreateNewCountry,
  onSwitchToWorldMap,
  onExportAllJson,
  onImportJsonFile
}: CountryDirectoryModalProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SourceFilter>('all');
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return countries.filter((c) => {
      if (filter === 'seed_demo' && c.metadata.dataSourceKind !== 'seed_demo') return false;
      if (filter === 'custom' && c.metadata.dataSourceKind === 'seed_demo') return false;
      if (!q) return true;
      return (
        c.nameAr.toLowerCase().includes(q) ||
        c.nameEn.toLowerCase().includes(q) ||
        c.iso3.toLowerCase().includes(q) ||
        c.capitalAr.toLowerCase().includes(q)
      );
    });
  }, [countries, filter, query]);

  if (!open) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const res = await onImportJsonFile(file);
    setNotice({ kind: res.ok ? 'ok' : 'err', text: res.message });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="countryDirectoryTitle"
      data-testid="country-directory-modal"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
    >
      <div className="w-full max-w-4xl max-h-[90vh] bg-slate-950 border border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <Globe2 className="w-5 h-5 text-sky-400 shrink-0" />
            <div>
              <h2 id="countryDirectoryTitle" className="text-sm sm:text-base font-bold text-slate-100">
                دليل الدول والملفات الاستخباراتية
              </h2>
              <p className="text-[11px] text-slate-400">
                اختر أي دولة لفتح ملفها وتحديدها مباشرة على الخريطة العالمية، أو أضف/استورد ملفات دول بصيغة JSON
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق دليل الدول"
            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action & Search Toolbar */}
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-950 space-y-2.5 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                id="countrySearchInput"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث بالاسم العربي أو الإنجليزي أو رمز ISO3 (مثل SAU, EGY)..."
                className="w-full bg-slate-900 border border-slate-700 rounded-md pr-9 pl-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                id="newCountryBtn"
                onClick={() => {
                  onClose();
                  onCreateNewCountry();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white border border-sky-400 rounded-md whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>دولة جديدة</span>
              </button>

              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 rounded-md cursor-pointer whitespace-nowrap">
                <Upload className="w-3.5 h-3.5 text-sky-400" />
                <span>استيراد JSON</span>
                <input
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(e) => void handleFileChange(e)}
                />
              </label>

              <button
                type="button"
                id="exportAllCountriesBtn"
                onClick={onExportAllJson}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 rounded-md whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 text-slate-300" />
                <span>تصدير الكل</span>
              </button>

              {!isWorldMapActive && (
                <button
                  type="button"
                  id="switchToWorldMapBtn"
                  onClick={() => {
                    onClose();
                    onSwitchToWorldMap();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-500 rounded-md whitespace-nowrap"
                >
                  <Globe2 className="w-3.5 h-3.5" />
                  <span>فتح خريطة العالم</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              {(
                [
                  ['all', `الكل (${countries.length})`],
                  ['seed_demo', 'بيانات تجريبية'],
                  ['custom', 'مخصّصة ومستوردة']
                ] as Array<[SourceFilter, string]>
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  className={`px-2.5 py-1 rounded border text-[11px] whitespace-nowrap ${
                    filter === id
                      ? 'bg-slate-800 text-sky-300 border-sky-500/60'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-amber-300/80">
              ملاحظة: الدول الافتراضية تحتوي قيماً تجريبية للمحاكاة وقابلة للتعديل الكامل
            </span>
          </div>

          {notice && (
            <div
              role="status"
              className={`rounded-md px-3 py-2 text-xs border ${
                notice.kind === 'ok'
                  ? 'bg-emerald-950/60 border-emerald-600/60 text-emerald-100'
                  : 'bg-red-950/60 border-red-600/60 text-red-100'
              }`}
            >
              {notice.text}
            </div>
          )}
        </div>

        {/* Grid List */}
        <div className="flex-1 overflow-y-auto p-5">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              لا توجد دول مطابقة للبحث الحالي.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((country) => (
                <button
                  key={country.id}
                  type="button"
                  data-testid={`country-card-${country.iso3}`}
                  onClick={() => {
                    onClose();
                    onSelectCountry(country);
                  }}
                  className="text-right bg-slate-900/75 hover:bg-slate-900 border border-slate-800 hover:border-sky-500/60 rounded-lg p-3 flex flex-col gap-2.5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <CountryFlagView flag={country.flag} alt={country.nameAr} size="md" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-100 truncate">{country.nameAr}</div>
                        <div dir="ltr" className="text-[11px] text-slate-400 truncate text-right">
                          {country.nameEn}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="w-2.5 h-2.5 rounded-sm border border-slate-600"
                        style={{ backgroundColor: country.mapColor }}
                      />
                      <span dir="ltr" className="font-mono text-[11px] font-semibold text-sky-300">
                        {country.iso3}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 border-t border-slate-800/80 pt-2">
                    <span>{country.capitalAr}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums text-slate-300">
                      استقرار {country.stability.politicalStability}%
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums text-emerald-300">
                      اقتصاد {country.economy.economicPower}%
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
