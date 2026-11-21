import React from 'react';
import {
  Building2,
  Download,
  Edit3,
  Globe2,
  MapPin,
  PlusCircle,
  RotateCcw,
  Shield,
  Trash2,
  X
} from 'lucide-react';
import { GeoRegionItem } from '../core/types';
import { CountryProfile, CountryRelationType } from '../countries/countryTypes';
import { CountryFlagView, LeaderPortraitView } from './CountryFlagView';

interface CountryIntelligencePanelProps {
  open: boolean;
  country?: CountryProfile;
  region?: GeoRegionItem;
  iso3?: string;
  canOpenProvinces: boolean;
  isSeedDefault: boolean;
  onClose: () => void;
  onEditCountry: (country: CountryProfile) => void;
  onCreateCountryForRegion: (region?: GeoRegionItem) => void;
  onOpenProvinces: () => void;
  onExportCountryJson: (country: CountryProfile) => void;
  onResetOrDeleteCountry: (country: CountryProfile) => void;
  onSelectRelatedIso3: (iso3: string) => void;
  resolveCountryByIso3: (iso3?: string) => CountryProfile | undefined;
}

const RELATION_LABEL: Record<CountryRelationType, string> = {
  alliance: 'تحالف',
  defense_pact: 'دفاع مشترك',
  trade: 'شراكة تجارية',
  rivalry: 'خصومة',
  sanctions: 'عقوبات',
  tension: 'توتر'
};

function formatNumberAr(n: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(n));
}

function MetricBar({
  label,
  value,
  barColor
}: {
  label: string;
  value: number;
  barColor: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-slate-300">{label}</span>
        <span dir="ltr" className="font-mono tabular-nums font-semibold text-slate-100">
          {clamped}%
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-200 ${barColor}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

export function CountryIntelligencePanel({
  open,
  country,
  region,
  iso3,
  canOpenProvinces,
  isSeedDefault,
  onClose,
  onEditCountry,
  onCreateCountryForRegion,
  onOpenProvinces,
  onExportCountryJson,
  onResetOrDeleteCountry,
  onSelectRelatedIso3,
  resolveCountryByIso3
}: CountryIntelligencePanelProps) {
  if (!open) return null;

  const displayIso = country?.iso3 || iso3 || region?.iso3 || '—';
  const displayNameAr = country?.nameAr || region?.nameAr || region?.name || 'دولة غير معرّفة';
  const displayNameEn = country?.nameEn || region?.name || '';

  return (
    <aside
      id="countryIntelligencePanel"
      data-testid="country-intelligence-panel"
      aria-label={`الملف الاستخباراتي للدولة: ${displayNameAr}`}
      className="absolute top-14 left-3 bottom-3 w-[calc(100vw-24px)] sm:w-[400px] lg:w-[430px] z-30 bg-slate-950/95 backdrop-blur-md border border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden"
    >
      {/* Top Command Header */}
      <div className="px-4 py-3.5 border-b border-slate-800 bg-slate-900/75 flex items-start justify-between gap-3 shrink-0">
        <div className="flex items-start gap-3 min-w-0">
          <CountryFlagView flag={country?.flag} alt={`علم ${displayNameAr}`} size="lg" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-base font-bold text-slate-50 truncate">{displayNameAr}</h2>
            </div>
            {displayNameEn && (
              <p dir="ltr" className="text-xs text-slate-400 truncate text-right">
                {displayNameEn}
              </p>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
              <span dir="ltr" className="font-mono tabular-nums text-sky-300 font-semibold">
                {displayIso}
              </span>
              {country && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{country.capitalAr}</span>
                  <span aria-hidden="true">·</span>
                  <span>{country.regimeType}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          id="closeCountryPanelBtn"
          onClick={onClose}
          aria-label="إغلاق ملف الدولة"
          className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 shrink-0 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      {!country ? (
        <div className="flex-1 overflow-y-auto p-5 flex flex-col items-center justify-center text-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-sky-400">
            <Globe2 className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-xs">
            <h3 className="text-sm font-semibold text-slate-100">لا يوجد ملف استخباراتي محفوظ لهذه الدولة</h3>
            <p className="text-xs text-slate-400 leading-5">
              يمكنك إنشاء ملف كامل يتضمن نظام الحكم والقيادة والاقتصاد والقوات المسلحة والتحالفات لهذه المنطقة وربطه برمز{' '}
              <span dir="ltr" className="font-mono text-sky-300">{displayIso}</span>.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              id="createCountryFromRegionBtn"
              onClick={() => onCreateCountryForRegion(region)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-lg border border-sky-400 whitespace-nowrap transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>إنشاء ملف للدولة</span>
            </button>
            {canOpenProvinces && (
              <button
                type="button"
                onClick={onOpenProvinces}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg border border-slate-700 whitespace-nowrap transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-sky-400" />
                <span>عرض المحافظات</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80">
          {/* Action Strip & Source Transparency */}
          <div className="px-4 py-3 space-y-2.5 bg-slate-950">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                id="editCountryBtn"
                onClick={() => onEditCountry(country)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white border border-sky-400 rounded-md whitespace-nowrap shrink-0 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>تعديل الملف</span>
              </button>
              {canOpenProvinces && (
                <button
                  type="button"
                  id="panelOpenProvincesBtn"
                  onClick={onOpenProvinces}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-md whitespace-nowrap shrink-0 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-sky-400" />
                  <span>المحافظات</span>
                </button>
              )}
              <button
                type="button"
                id="exportSingleCountryBtn"
                onClick={() => onExportCountryJson(country)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-md whitespace-nowrap shrink-0 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-slate-300" />
                <span>تصدير JSON</span>
              </button>
              {country.metadata.dataSourceKind !== 'seed_demo' && (
                <button
                  type="button"
                  id="resetOrDeleteCountryBtn"
                  onClick={() => onResetOrDeleteCountry(country)}
                  title={isSeedDefault ? 'استعادة البيانات التجريبية الأصلية' : 'حذف هذه الدولة'}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-slate-900 hover:bg-red-950/70 text-slate-300 hover:text-red-200 border border-slate-700 rounded-md whitespace-nowrap shrink-0 transition-colors"
                >
                  {isSeedDefault ? <RotateCcw className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>{isSeedDefault ? 'استعادة الافتراضي' : 'حذف'}</span>
                </button>
              )}
            </div>

            <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className={country.metadata.dataSourceKind === 'seed_demo' ? 'text-amber-300 font-medium' : 'text-emerald-300 font-medium'}>
                {country.metadata.sourceLabel}
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <span>لون الخريطة:</span>
                <span
                  aria-label={`لون الدولة ${country.mapColor}`}
                  className="inline-block w-2.5 h-2.5 rounded-sm border border-slate-600"
                  style={{ backgroundColor: country.mapColor }}
                />
              </span>
              <span aria-hidden="true">·</span>
              <span dir="ltr" className="font-mono tabular-nums">
                {country.metadata.updatedAt.slice(0, 10)}
              </span>
            </div>
            {country.metadata.dataSourceKind === 'seed_demo' && country.metadata.notes && (
              <p className="text-[11px] text-amber-200/80 bg-amber-950/25 border border-amber-800/40 rounded-md px-2.5 py-1.5 leading-4">
                {country.metadata.notes}
              </p>
            )}
          </div>

          {/* 1. Leadership & Executive Summary */}
          <section aria-label="القيادة والملخص العام" className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <LeaderPortraitView
                name={country.leader.name}
                portraitSvg={country.leader.portraitSvg}
                portraitUrl={country.leader.portraitUrl}
              />
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="text-xs text-slate-400">{country.leader.title}</div>
                <div className="text-sm font-semibold text-slate-100 truncate">{country.leader.name}</div>
                <div className="text-xs text-slate-400 pt-0.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">
                    {country.government.headTitle}: <span className="text-slate-200">{country.government.headOfGovernment}</span>
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-5">{country.summary}</p>
          </section>

          {/* 2. Geography, Demographics & Economy */}
          <section aria-label="الاقتصاد والسكان" className="p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-200">المؤشرات الجغرافية والاقتصادية</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
              <div>
                <div className="text-[11px] text-slate-400">عدد السكان</div>
                <div dir="ltr" className="font-mono tabular-nums font-semibold text-slate-100 text-right">
                  {formatNumberAr(country.population)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">المساحة (كم²)</div>
                <div dir="ltr" className="font-mono tabular-nums font-semibold text-slate-100 text-right">
                  {formatNumberAr(country.areaKm2)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">الناتج المحلي (مليار $)</div>
                <div dir="ltr" className="font-mono tabular-nums font-semibold text-emerald-300 text-right">
                  ${formatNumberAr(country.economy.gdpBillionUsd)}B
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">الميزانية السنوية (مليار $)</div>
                <div dir="ltr" className="font-mono tabular-nums font-semibold text-sky-300 text-right">
                  ${formatNumberAr(country.economy.annualBudgetBillionUsd)}B
                </div>
              </div>
            </div>

            <MetricBar label="القوة الاقتصادية" value={country.economy.economicPower} barColor="bg-emerald-500" />

            <div className="space-y-1 pt-0.5">
              <div className="text-[11px] text-slate-400">الموارد الرئيسية:</div>
              <div className="text-xs text-slate-200 leading-5">
                {country.economy.primaryResources.length > 0
                  ? country.economy.primaryResources.join(' · ')
                  : 'غير محدد'}
              </div>
            </div>
          </section>

          {/* 3. Stability & International Influence */}
          <section aria-label="الاستقرار والنفوذ" className="p-4 space-y-2.5">
            <h3 className="text-xs font-semibold text-slate-200">الاستقرار والنفوذ الدولي</h3>
            <MetricBar label="الاستقرار السياسي" value={country.stability.politicalStability} barColor="bg-sky-500" />
            <MetricBar label="الاستقرار الداخلي" value={country.stability.internalStability} barColor="bg-teal-500" />
            <MetricBar label="النفوذ الدولي" value={country.stability.internationalInfluence} barColor="bg-indigo-400" />
          </section>

          {/* 4. Military Distribution */}
          <section aria-label="توزيع القوة العسكرية" className="p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold text-slate-200 inline-flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>توزيع القوة العسكرية</span>
              </h3>
              {country.military.activePersonnel !== undefined && (
                <span dir="ltr" className="text-[11px] font-mono tabular-nums text-slate-400">
                  {formatNumberAr(country.military.activePersonnel)} فرد
                </span>
              )}
            </div>
            <MetricBar label="القوة العسكرية الإجمالية" value={country.military.overallPower} barColor="bg-amber-500" />
            <div className="grid grid-cols-1 gap-2 pt-0.5">
              <MetricBar label="القوات البرية" value={country.military.landForces} barColor="bg-orange-400" />
              <MetricBar label="القوات البحرية" value={country.military.navalForces} barColor="bg-cyan-400" />
              <MetricBar label="القوات الجوية" value={country.military.airForces} barColor="bg-sky-400" />
            </div>
            {country.military.doctrine && (
              <p className="text-[11px] text-slate-400 pt-0.5">{country.military.doctrine}</p>
            )}
          </section>

          {/* 5. Diplomacy: Alliances & Rivalries */}
          <section aria-label="التحالفات والخصومات" className="p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-200">التحالفات والخصومات الدبلوماسية</h3>
            {country.diplomacy.diplomaticStance && (
              <p className="text-[11px] text-slate-400">{country.diplomacy.diplomaticStance}</p>
            )}

            <div className="space-y-1.5">
              <div className="text-[11px] font-medium text-emerald-300">الحلفاء والشركاء</div>
              {country.diplomacy.alliances.length === 0 ? (
                <div className="text-xs text-slate-500">لا توجد تحالفات مسجلة</div>
              ) : (
                <ul className="space-y-1">
                  {country.diplomacy.alliances.map((rel, idx) => {
                    const linked = resolveCountryByIso3(rel.targetIso3);
                    return (
                      <li key={`ally-${idx}`} className="flex items-center justify-between gap-2 text-xs py-1 border-b border-slate-900 last:border-0">
                        {linked ? (
                          <button
                            type="button"
                            onClick={() => onSelectRelatedIso3(linked.iso3)}
                            className="inline-flex items-center gap-2 text-slate-100 hover:text-sky-300 transition-colors text-right min-w-0"
                          >
                            <CountryFlagView flag={linked.flag} alt={linked.nameAr} size="sm" />
                            <span className="truncate underline-offset-2 hover:underline">{rel.name}</span>
                          </button>
                        ) : (
                          <span className="text-slate-200 truncate">{rel.name}</span>
                        )}
                        <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">
                          {RELATION_LABEL[rel.type]}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="text-[11px] font-medium text-rose-300">الخصومات والتوترات</div>
              {country.diplomacy.rivalries.length === 0 ? (
                <div className="text-xs text-slate-500">لا توجد خصومات مسجلة</div>
              ) : (
                <ul className="space-y-1">
                  {country.diplomacy.rivalries.map((rel, idx) => {
                    const linked = resolveCountryByIso3(rel.targetIso3);
                    return (
                      <li key={`rival-${idx}`} className="flex items-center justify-between gap-2 text-xs py-1 border-b border-slate-900 last:border-0">
                        {linked ? (
                          <button
                            type="button"
                            onClick={() => onSelectRelatedIso3(linked.iso3)}
                            className="inline-flex items-center gap-2 text-slate-100 hover:text-rose-300 transition-colors text-right min-w-0"
                          >
                            <CountryFlagView flag={linked.flag} alt={linked.nameAr} size="sm" />
                            <span className="truncate underline-offset-2 hover:underline">{rel.name}</span>
                          </button>
                        ) : (
                          <span className="text-slate-200 truncate">{rel.name}</span>
                        )}
                        <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">
                          {RELATION_LABEL[rel.type]}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* 6. Media Influence & Public Opinion */}
          <section aria-label="الإعلام والرأي العام" className="p-4 space-y-2.5">
            <h3 className="text-xs font-semibold text-slate-200">التأثير الإعلامي والرأي العام</h3>
            <MetricBar label="الرأي العام الداخلي" value={country.mediaAndPublic.publicOpinion} barColor="bg-violet-400" />
            <MetricBar label="مستوى التأثير الإعلامي" value={country.mediaAndPublic.mediaInfluence} barColor="bg-cyan-400" />
            {country.mediaAndPublic.narrativeSummary && (
              <p className="text-[11px] text-slate-400 leading-4 pt-0.5">{country.mediaAndPublic.narrativeSummary}</p>
            )}
          </section>
        </div>
      )}
    </aside>
  );
}
