import { sanitizeAssetUrl, sanitizeSvg } from '../packs/packSchema';

export type CountryDataSourceKind = 'seed_demo' | 'user_custom' | 'imported';

export type CountryRelationType =
  | 'alliance'
  | 'defense_pact'
  | 'trade'
  | 'rivalry'
  | 'sanctions'
  | 'tension';

export interface CountryFlagAsset {
  mode: 'svg' | 'emoji' | 'image';
  svg?: string;
  emoji?: string;
  imageUrl?: string;
}

export interface CountryLeaderInfo {
  name: string;
  title: string;
  portraitSvg?: string;
  portraitUrl?: string;
}

export interface CountryGovernmentInfo {
  headOfGovernment: string;
  headTitle: string;
  cabinetLabel?: string;
}

export interface CountryRelationItem {
  targetIso3?: string;
  name: string;
  type: CountryRelationType;
  notes?: string;
}

export interface CountryEconomyProfile {
  economicPower: number; // 0..100
  gdpBillionUsd: number;
  annualBudgetBillionUsd: number;
  currencyCode?: string;
  primaryResources: string[];
}

export interface CountryMilitaryProfile {
  overallPower: number; // 0..100
  landForces: number; // 0..100
  navalForces: number; // 0..100
  airForces: number; // 0..100
  activePersonnel?: number;
  doctrine?: string;
}

export interface CountryDiplomacyProfile {
  alliances: CountryRelationItem[];
  rivalries: CountryRelationItem[];
  diplomaticStance?: string;
}

export interface CountryMediaProfile {
  publicOpinion: number; // 0..100
  mediaInfluence: number; // 0..100
  narrativeSummary?: string;
}

export interface CountryStabilityProfile {
  politicalStability: number; // 0..100
  internalStability: number; // 0..100
  internationalInfluence: number; // 0..100
}

export interface CountryMetadata {
  dataSourceKind: CountryDataSourceKind;
  sourceLabel: string;
  updatedAt: string; // ISO-8601 timestamp
  schemaVersion: number;
  notes?: string;
}

export interface CountryProfile {
  id: string;
  iso3: string;
  nameAr: string;
  nameEn: string;
  flag: CountryFlagAsset;
  capitalAr: string;
  capitalEn?: string;
  areaKm2: number;
  population: number;
  regimeType: string;
  leader: CountryLeaderInfo;
  government: CountryGovernmentInfo;
  stability: CountryStabilityProfile;
  economy: CountryEconomyProfile;
  military: CountryMilitaryProfile;
  diplomacy: CountryDiplomacyProfile;
  mediaAndPublic: CountryMediaProfile;
  mapColor: string;
  summary: string;
  metadata: CountryMetadata;
  /** Extensible namespace reserved for future Leadership, Armed Forces, Economy, Media & Diplomacy engines. */
  extensions?: Record<string, unknown>;
}

export interface CountryBundleExport {
  schemaVersion: number;
  exportedAt: string;
  countries: CountryProfile[];
}

export const COUNTRY_SCHEMA_VERSION = 1;
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const ISO3_RE = /^[A-Z0-9_-]{2,12}$/;
const SAFE_ID_RE = /^[A-Za-z0-9_-]{2,80}$/;

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isFiniteNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function findDangerousKey(val: unknown, where: string, seen = new WeakSet<object>()): string | null {
  if (typeof val !== 'object' || val === null) return null;
  if (seen.has(val)) return null;
  seen.add(val);
  if (Array.isArray(val)) {
    for (let i = 0; i < val.length; i++) {
      const found = findDangerousKey(val[i], `${where}[${i}]`, seen);
      if (found) return found;
    }
    return null;
  }
  for (const key of Object.getOwnPropertyNames(val)) {
    if (DANGEROUS_KEYS.has(key)) {
      return `${where}: المفتاح الخطر "${key}" مرفوض لأسباب أمنية`;
    }
    const found = findDangerousKey((val as Record<string, unknown>)[key], `${where}.${key}`, seen);
    if (found) return found;
  }
  return null;
}

export function clampPct(val: number): number {
  if (!Number.isFinite(val)) return 0;
  return Math.max(0, Math.min(100, Math.round(val)));
}

export function normalizeIso3(raw: string): string {
  return raw.trim().toUpperCase();
}

export function makeCountryIdFromIso3(iso3: string): string {
  const clean = iso3
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_');
  return `country_${clean || 'custom'}`;
}

export function validateCountryFlag(flag: unknown, where: string): { errors: string[]; sanitized?: CountryFlagAsset } {
  const errors: string[] = [];
  if (!isObj(flag)) {
    return { errors: [`${where}: بيانات العلم مطلوبة`] };
  }
  const mode = flag.mode;
  if (mode !== 'svg' && mode !== 'emoji' && mode !== 'image') {
    errors.push(`${where}.mode: نوع العلم يجب أن يكون svg أو emoji أو image`);
    return { errors };
  }

  if (mode === 'svg') {
    if (typeof flag.svg !== 'string' || !flag.svg.trim()) {
      errors.push(`${where}.svg: كود SVG للعلم مطلوب`);
      return { errors };
    }
    const safeSvg = sanitizeSvg(flag.svg);
    if (!safeSvg) {
      errors.push(`${where}.svg: كود SVG للعلم غير صالح أو يحتوي عناصر غير آمنة`);
      return { errors };
    }
    return { errors, sanitized: { mode: 'svg', svg: safeSvg, emoji: typeof flag.emoji === 'string' ? flag.emoji.slice(0, 12) : undefined } };
  }

  if (mode === 'image') {
    if (typeof flag.imageUrl !== 'string' || !flag.imageUrl.trim()) {
      errors.push(`${where}.imageUrl: رابط أو صورة العلم مطلوبة`);
      return { errors };
    }
    const safeUrl = sanitizeAssetUrl(flag.imageUrl);
    if (!safeUrl) {
      errors.push(`${where}.imageUrl: مسار صورة العلم غير آمن أو غير صالح`);
      return { errors };
    }
    return { errors, sanitized: { mode: 'image', imageUrl: safeUrl, emoji: typeof flag.emoji === 'string' ? flag.emoji.slice(0, 12) : undefined } };
  }

  const emoji = typeof flag.emoji === 'string' ? flag.emoji.trim() : '';
  if (!emoji || emoji.length > 16) {
    errors.push(`${where}.emoji: رمز العلم مطلوب`);
    return { errors };
  }
  return { errors, sanitized: { mode: 'emoji', emoji } };
}

function validateRelationList(
  list: unknown,
  where: string,
  defaultType: CountryRelationType
): { errors: string[]; normalized: CountryRelationItem[] } {
  const errors: string[] = [];
  const normalized: CountryRelationItem[] = [];
  if (!Array.isArray(list)) {
    errors.push(`${where}: يجب أن يكون قائمة`);
    return { errors, normalized };
  }
  const allowedTypes = new Set<CountryRelationType>([
    'alliance',
    'defense_pact',
    'trade',
    'rivalry',
    'sanctions',
    'tension'
  ]);
  list.forEach((item, idx) => {
    if (!isObj(item) || typeof item.name !== 'string' || !item.name.trim()) {
      errors.push(`${where}[${idx}]: اسم الطرف مطلوب`);
      return;
    }
    const relType =
      typeof item.type === 'string' && allowedTypes.has(item.type as CountryRelationType)
        ? (item.type as CountryRelationType)
        : defaultType;
    const iso = typeof item.targetIso3 === 'string' && item.targetIso3.trim() ? normalizeIso3(item.targetIso3) : undefined;
    if (iso && !ISO3_RE.test(iso)) {
      errors.push(`${where}[${idx}].targetIso3: رمز ISO3 غير صالح`);
      return;
    }
    normalized.push({
      targetIso3: iso,
      name: item.name.trim(),
      type: relType,
      notes: typeof item.notes === 'string' && item.notes.trim() ? item.notes.trim() : undefined
    });
  });
  return { errors, normalized };
}

export function validateCountryProfile(
  raw: unknown,
  where = 'country'
): { errors: string[]; profile?: CountryProfile } {
  if (!isObj(raw)) {
    return { errors: [`${where}: بيانات الدولة يجب أن تكون كائنًا صالحًا`] };
  }
  const dangerous = findDangerousKey(raw, where);
  if (dangerous) return { errors: [dangerous] };

  const errors: string[] = [];

  const iso3Raw = typeof raw.iso3 === 'string' ? normalizeIso3(raw.iso3) : '';
  if (!iso3Raw || !ISO3_RE.test(iso3Raw)) {
    errors.push(`${where}.iso3: رمز الدولة (مثل SAU أو EGY) مطلوب بصيغة أحرف/أرقام إنجليزية`);
  }

  const idRaw = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : iso3Raw ? makeCountryIdFromIso3(iso3Raw) : '';
  if (!idRaw || !SAFE_ID_RE.test(idRaw) || DANGEROUS_KEYS.has(idRaw)) {
    errors.push(`${where}.id: المعرّف الداخلي غير صالح`);
  }

  const nameAr = typeof raw.nameAr === 'string' ? raw.nameAr.trim() : '';
  const nameEn = typeof raw.nameEn === 'string' ? raw.nameEn.trim() : '';
  if (!nameAr) errors.push(`${where}.nameAr: الاسم بالعربية مطلوب`);
  if (!nameEn) errors.push(`${where}.nameEn: الاسم بالإنجليزية مطلوب`);

  const capitalAr = typeof raw.capitalAr === 'string' ? raw.capitalAr.trim() : '';
  if (!capitalAr) errors.push(`${where}.capitalAr: اسم العاصمة مطلوب`);

  const flagRes = validateCountryFlag(raw.flag, `${where}.flag`);
  errors.push(...flagRes.errors);

  if (!isFiniteNum(raw.areaKm2) || raw.areaKm2 < 0) {
    errors.push(`${where}.areaKm2: المساحة يجب أن تكون رقمًا غير سالب`);
  }
  if (!isFiniteNum(raw.population) || raw.population < 0) {
    errors.push(`${where}.population: عدد السكان يجب أن يكون رقمًا غير سالب`);
  }

  const regimeType = typeof raw.regimeType === 'string' ? raw.regimeType.trim() : '';
  if (!regimeType) errors.push(`${where}.regimeType: نظام الحكم مطلوب`);

  if (!isObj(raw.leader) || typeof raw.leader.name !== 'string' || !raw.leader.name.trim()) {
    errors.push(`${where}.leader.name: اسم رئيس الدولة مطلوب`);
  }
  const leaderTitle =
    isObj(raw.leader) && typeof raw.leader.title === 'string' && raw.leader.title.trim()
      ? raw.leader.title.trim()
      : '';
  if (!leaderTitle) errors.push(`${where}.leader.title: منصب رئيس الدولة مطلوب`);

  let safePortraitSvg: string | undefined;
  let safePortraitUrl: string | undefined;
  if (isObj(raw.leader)) {
    if (typeof raw.leader.portraitSvg === 'string' && raw.leader.portraitSvg.trim()) {
      const s = sanitizeSvg(raw.leader.portraitSvg);
      if (!s) errors.push(`${where}.leader.portraitSvg: صورة SVG لرئيس الدولة غير صالحة`);
      else safePortraitSvg = s;
    }
    if (typeof raw.leader.portraitUrl === 'string' && raw.leader.portraitUrl.trim()) {
      const u = sanitizeAssetUrl(raw.leader.portraitUrl);
      if (!u) errors.push(`${where}.leader.portraitUrl: رابط صورة رئيس الدولة غير آمن`);
      else safePortraitUrl = u;
    }
  }

  if (!isObj(raw.government) || typeof raw.government.headOfGovernment !== 'string' || !raw.government.headOfGovernment.trim()) {
    errors.push(`${where}.government.headOfGovernment: اسم رئيس الحكومة أو الجهة التنفيذية مطلوب`);
  }
  const headGovTitle =
    isObj(raw.government) && typeof raw.government.headTitle === 'string' && raw.government.headTitle.trim()
      ? raw.government.headTitle.trim()
      : 'رئيس الحكومة';

  const checkPct = (obj: unknown, key: string, label: string): number => {
    if (!isObj(obj) || !isFiniteNum(obj[key]) || (obj[key] as number) < 0 || (obj[key] as number) > 100) {
      errors.push(`${where}.${label}: يجب أن يكون قيمة بين 0 و 100`);
      return 0;
    }
    return Math.round(obj[key] as number);
  };

  const politicalStability = checkPct(raw.stability, 'politicalStability', 'stability.politicalStability');
  const internalStability = checkPct(raw.stability, 'internalStability', 'stability.internalStability');
  const internationalInfluence = checkPct(raw.stability, 'internationalInfluence', 'stability.internationalInfluence');

  const economicPower = checkPct(raw.economy, 'economicPower', 'economy.economicPower');
  const gdpBillionUsd =
    isObj(raw.economy) && isFiniteNum(raw.economy.gdpBillionUsd) && raw.economy.gdpBillionUsd >= 0
      ? raw.economy.gdpBillionUsd
      : (errors.push(`${where}.economy.gdpBillionUsd: الناتج المحلي يجب أن يكون رقمًا غير سالب`), 0);
  const annualBudgetBillionUsd =
    isObj(raw.economy) && isFiniteNum(raw.economy.annualBudgetBillionUsd) && raw.economy.annualBudgetBillionUsd >= 0
      ? raw.economy.annualBudgetBillionUsd
      : (errors.push(`${where}.economy.annualBudgetBillionUsd: الميزانية يجب أن تكون رقمًا غير سالب`), 0);

  let primaryResources: string[] = [];
  if (!isObj(raw.economy) || !Array.isArray(raw.economy.primaryResources)) {
    errors.push(`${where}.economy.primaryResources: قائمة الموارد الرئيسية مطلوبة`);
  } else {
    primaryResources = raw.economy.primaryResources
      .filter((r): r is string => typeof r === 'string' && r.trim().length > 0)
      .map((r) => r.trim());
  }

  const overallPower = checkPct(raw.military, 'overallPower', 'military.overallPower');
  const landForces = checkPct(raw.military, 'landForces', 'military.landForces');
  const navalForces = checkPct(raw.military, 'navalForces', 'military.navalForces');
  const airForces = checkPct(raw.military, 'airForces', 'military.airForces');

  const alliancesRes = isObj(raw.diplomacy)
    ? validateRelationList(raw.diplomacy.alliances ?? [], `${where}.diplomacy.alliances`, 'alliance')
    : { errors: [`${where}.diplomacy: بيانات الدبلوماسية مطلوبة`], normalized: [] };
  const rivalriesRes = isObj(raw.diplomacy)
    ? validateRelationList(raw.diplomacy.rivalries ?? [], `${where}.diplomacy.rivalries`, 'rivalry')
    : { errors: [], normalized: [] };
  errors.push(...alliancesRes.errors, ...rivalriesRes.errors);

  const publicOpinion = checkPct(raw.mediaAndPublic, 'publicOpinion', 'mediaAndPublic.publicOpinion');
  const mediaInfluence = checkPct(raw.mediaAndPublic, 'mediaInfluence', 'mediaAndPublic.mediaInfluence');

  const mapColor = typeof raw.mapColor === 'string' ? raw.mapColor.trim() : '';
  if (!HEX_COLOR_RE.test(mapColor)) {
    errors.push(`${where}.mapColor: لون الدولة على الخريطة يجب أن يكون بصيغة Hex مثل #15803d`);
  }

  const summary = typeof raw.summary === 'string' ? raw.summary.trim() : '';
  if (!summary) errors.push(`${where}.summary: الملخص العام مطلوب`);

  const metaObj = isObj(raw.metadata) ? raw.metadata : null;
  const sourceKindRaw = metaObj?.dataSourceKind;
  const dataSourceKind: CountryDataSourceKind =
    sourceKindRaw === 'seed_demo' || sourceKindRaw === 'user_custom' || sourceKindRaw === 'imported'
      ? sourceKindRaw
      : 'user_custom';
  const sourceLabel =
    metaObj && typeof metaObj.sourceLabel === 'string' && metaObj.sourceLabel.trim()
      ? metaObj.sourceLabel.trim()
      : 'تعديل محلي';
  const updatedAt =
    metaObj && typeof metaObj.updatedAt === 'string' && !Number.isNaN(Date.parse(metaObj.updatedAt))
      ? metaObj.updatedAt
      : new Date().toISOString();

  if (errors.length > 0 || !flagRes.sanitized) {
    return { errors };
  }

  const profile: CountryProfile = {
    id: idRaw,
    iso3: iso3Raw,
    nameAr,
    nameEn,
    flag: flagRes.sanitized,
    capitalAr,
    capitalEn: typeof raw.capitalEn === 'string' && raw.capitalEn.trim() ? raw.capitalEn.trim() : undefined,
    areaKm2: Math.round(raw.areaKm2 as number),
    population: Math.round(raw.population as number),
    regimeType,
    leader: {
      name: ((raw.leader as Record<string, unknown>).name as string).trim(),
      title: leaderTitle,
      portraitSvg: safePortraitSvg,
      portraitUrl: safePortraitUrl
    },
    government: {
      headOfGovernment: ((raw.government as Record<string, unknown>).headOfGovernment as string).trim(),
      headTitle: headGovTitle,
      cabinetLabel:
        typeof (raw.government as Record<string, unknown>).cabinetLabel === 'string' &&
        ((raw.government as Record<string, unknown>).cabinetLabel as string).trim()
          ? ((raw.government as Record<string, unknown>).cabinetLabel as string).trim()
          : undefined
    },
    stability: {
      politicalStability,
      internalStability,
      internationalInfluence
    },
    economy: {
      economicPower,
      gdpBillionUsd,
      annualBudgetBillionUsd,
      currencyCode:
        typeof (raw.economy as Record<string, unknown>).currencyCode === 'string' &&
        ((raw.economy as Record<string, unknown>).currencyCode as string).trim()
          ? ((raw.economy as Record<string, unknown>).currencyCode as string).trim().toUpperCase()
          : undefined,
      primaryResources
    },
    military: {
      overallPower,
      landForces,
      navalForces,
      airForces,
      activePersonnel:
        isFiniteNum((raw.military as Record<string, unknown>).activePersonnel) &&
        ((raw.military as Record<string, unknown>).activePersonnel as number) >= 0
          ? Math.round((raw.military as Record<string, unknown>).activePersonnel as number)
          : undefined,
      doctrine:
        typeof (raw.military as Record<string, unknown>).doctrine === 'string' &&
        ((raw.military as Record<string, unknown>).doctrine as string).trim()
          ? ((raw.military as Record<string, unknown>).doctrine as string).trim()
          : undefined
    },
    diplomacy: {
      alliances: alliancesRes.normalized,
      rivalries: rivalriesRes.normalized,
      diplomaticStance:
        isObj(raw.diplomacy) && typeof raw.diplomacy.diplomaticStance === 'string' && raw.diplomacy.diplomaticStance.trim()
          ? raw.diplomacy.diplomaticStance.trim()
          : undefined
    },
    mediaAndPublic: {
      publicOpinion,
      mediaInfluence,
      narrativeSummary:
        isObj(raw.mediaAndPublic) &&
        typeof raw.mediaAndPublic.narrativeSummary === 'string' &&
        raw.mediaAndPublic.narrativeSummary.trim()
          ? raw.mediaAndPublic.narrativeSummary.trim()
          : undefined
    },
    mapColor,
    summary,
    metadata: {
      dataSourceKind,
      sourceLabel,
      updatedAt,
      schemaVersion: COUNTRY_SCHEMA_VERSION,
      notes: metaObj && typeof metaObj.notes === 'string' && metaObj.notes.trim() ? metaObj.notes.trim() : undefined
    },
    extensions: isObj(raw.extensions) ? { ...raw.extensions } : undefined
  };

  return { errors: [], profile };
}

export function validateCountryImportPayload(
  parsed: unknown
): { errors: string[]; countries: CountryProfile[] } {
  const dangerous = findDangerousKey(parsed, 'import');
  if (dangerous) return { errors: [dangerous], countries: [] };

  let rawList: unknown[] | null = null;
  if (Array.isArray(parsed)) {
    rawList = parsed;
  } else if (isObj(parsed) && Array.isArray(parsed.countries)) {
    rawList = parsed.countries;
  } else if (isObj(parsed) && typeof parsed.iso3 === 'string') {
    rawList = [parsed];
  }

  if (!rawList || rawList.length === 0) {
    return {
      errors: ['الملف المستورد لا يحتوي على دول صالحة (يجب أن يكون مصفوفة دول أو كائن { countries: [...] } أو كائن دولة واحدة)'],
      countries: []
    };
  }

  const errors: string[] = [];
  const countries: CountryProfile[] = [];
  const seenIso = new Set<string>();

  rawList.forEach((item, idx) => {
    const res = validateCountryProfile(item, `countries[${idx}]`);
    if (res.errors.length > 0 || !res.profile) {
      errors.push(...res.errors);
      return;
    }
    if (seenIso.has(res.profile.iso3)) {
      errors.push(`countries[${idx}]: رمز الدولة "${res.profile.iso3}" مكرر داخل الملف المستورد`);
      return;
    }
    seenIso.add(res.profile.iso3);
    countries.push({
      ...res.profile,
      metadata: {
        ...res.profile.metadata,
        dataSourceKind: res.profile.metadata.dataSourceKind === 'seed_demo' ? 'seed_demo' : 'imported',
        sourceLabel:
          res.profile.metadata.sourceLabel && res.profile.metadata.dataSourceKind !== 'seed_demo'
            ? res.profile.metadata.sourceLabel
            : 'ملف JSON مستورد'
      }
    });
  });

  return { errors, countries };
}
