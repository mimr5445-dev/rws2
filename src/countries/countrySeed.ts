import { COUNTRY_SCHEMA_VERSION, CountryProfile } from './countryTypes';

const DEMO_SOURCE_LABEL = 'بيانات تجريبية للمحاكاة (قابلة للتعديل)';
const DEMO_UPDATED_AT = '2026-01-15T00:00:00.000Z';
const DEMO_NOTE = 'قيم تجريبية مبدئية لأغراض المحاكاة والاختبار وليست بيانات رسمية حالية؛ يمكنك تعديلها وحفظها.';

export interface FlagPresetTemplate {
  id: string;
  label: string;
  svg: string;
}

export function buildTriBandFlagSvg(top: string, middle: string, bottom: string, emblemSvg = ''): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><rect width="90" height="20" y="0" fill="${top}"/><rect width="90" height="20" y="20" fill="${middle}"/><rect width="90" height="20" y="40" fill="${bottom}"/>${emblemSvg}</svg>`;
}

export function buildVerticalTriBandFlagSvg(left: string, center: string, right: string, emblemSvg = ''): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><rect width="30" height="60" x="0" fill="${left}"/><rect width="30" height="60" x="30" fill="${center}"/><rect width="30" height="60" x="60" fill="${right}"/>${emblemSvg}</svg>`;
}

export const FLAG_PRESET_TEMPLATES: FlagPresetTemplate[] = [
  {
    id: 'tricolor_h',
    label: 'ثلاثي أفقي (أخضر/أبيض/داكن)',
    svg: buildTriBandFlagSvg('#15803d', '#f8fafc', '#0f172a', '<circle cx="45" cy="30" r="6" fill="#d97706"/>')
  },
  {
    id: 'tricolor_v',
    label: 'ثلاثي عمودي (أزرق/أبيض/أحمر)',
    svg: buildVerticalTriBandFlagSvg('#1d4ed8', '#f8fafc', '#dc2626')
  },
  {
    id: 'crescent_banner',
    label: 'راية بهلال ونجمة',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><rect width="90" height="60" fill="#b91c1c"/><circle cx="38" cy="30" r="14" fill="#f8fafc"/><circle cx="42" cy="30" r="11" fill="#b91c1c"/><polygon points="56,23 58,28 63,28 59,31 60,36 56,33 52,36 53,31 49,28 54,28" fill="#f8fafc"/></svg>'
  },
  {
    id: 'nordic_cross',
    label: 'صليب استراتيجي',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><rect width="90" height="60" fill="#1e3a8a"/><rect width="90" height="12" y="24" fill="#facc15"/><rect width="12" height="60" x="26" fill="#facc15"/></svg>'
  },
  {
    id: 'emerald_chevron',
    label: 'مثلث جانبي وثلاثة أشرطة',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><rect width="90" height="20" y="0" fill="#0f172a"/><rect width="90" height="20" y="20" fill="#f8fafc"/><rect width="90" height="20" y="40" fill="#15803d"/><polygon points="0,0 34,30 0,60" fill="#b91c1c"/></svg>'
  }
];

function createSeedCountry(
  input: Omit<CountryProfile, 'id' | 'metadata'> & { notes?: string }
): CountryProfile {
  const { notes, ...rest } = input;
  return {
    ...rest,
    id: `country_${rest.iso3.toLowerCase()}`,
    metadata: {
      dataSourceKind: 'seed_demo',
      sourceLabel: DEMO_SOURCE_LABEL,
      updatedAt: DEMO_UPDATED_AT,
      schemaVersion: COUNTRY_SCHEMA_VERSION,
      notes: notes ?? DEMO_NOTE
    }
  };
}

export const SEED_COUNTRIES: CountryProfile[] = [
  createSeedCountry({
    iso3: 'SAU',
    nameAr: 'المملكة العربية السعودية',
    nameEn: 'Saudi Arabia',
    flag: {
      mode: 'svg',
      emoji: '🇸🇦',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><rect width="90" height="60" fill="#15803d"/><rect x="18" y="18" width="54" height="10" rx="2" fill="#f8fafc" opacity="0.9"/><rect x="20" y="38" width="50" height="4" rx="2" fill="#f8fafc"/><polygon points="66,35 74,40 66,45" fill="#f8fafc"/></svg>'
    },
    capitalAr: 'الرياض',
    capitalEn: 'Riyadh',
    areaKm2: 2149690,
    population: 36400000,
    regimeType: 'ملكية مركزية (إطار تجريبي)',
    leader: {
      name: 'القيادة العليا — ملف تجريبي',
      title: 'رئيس الدولة'
    },
    government: {
      headOfGovernment: 'مجلس الوزراء — ملف تجريبي',
      headTitle: 'رئاسة مجلس الوزراء',
      cabinetLabel: 'الحكومة المركزية'
    },
    stability: {
      politicalStability: 82,
      internalStability: 84,
      internationalInfluence: 78
    },
    economy: {
      economicPower: 80,
      gdpBillionUsd: 1060,
      annualBudgetBillionUsd: 330,
      currencyCode: 'SAR',
      primaryResources: ['النفط الخام', 'الغاز الطبيعي', 'البتروكيماويات', 'الطاقة الشمسية', 'الفوسفات']
    },
    military: {
      overallPower: 74,
      landForces: 72,
      navalForces: 64,
      airForces: 81,
      activePersonnel: 257000,
      doctrine: 'ردع جوي وبحري متعدد المسارح (تجريبي)'
    },
    diplomacy: {
      alliances: [
        { targetIso3: 'ARE', name: 'الإمارات العربية المتحدة', type: 'alliance', notes: 'تنسيق استراتيجي واقتصادي' },
        { targetIso3: 'EGY', name: 'جمهورية مصر العربية', type: 'defense_pact', notes: 'أمن البحر الأحمر' },
        { targetIso3: 'USA', name: 'الولايات المتحدة الأمريكية', type: 'trade', notes: 'شراكة طاقة ودفاع' }
      ],
      rivalries: [
        { name: 'توترات إقليمية مفتوحة', type: 'tension', notes: 'قابل للتخصيص حسب السيناريو' }
      ],
      diplomaticStance: 'توازن إقليمي وتحالفات طاقة'
    },
    mediaAndPublic: {
      publicOpinion: 79,
      mediaInfluence: 76,
      narrativeSummary: 'تركيز إعلامي على مشروعات التحول الاقتصادي وأمن الممرات البحرية (تجريبي).'
    },
    mapColor: '#15803d',
    summary: 'قوة إقليمية محورية في شبه الجزيرة العربية وممر البحر الأحمر والخليج، تتميز بثقل في أسواق الطاقة وقدرات جوية متقدمة (بيانات محاكاة تجريبية).'
  }),

  createSeedCountry({
    iso3: 'EGY',
    nameAr: 'جمهورية مصر العربية',
    nameEn: 'Egypt',
    flag: {
      mode: 'svg',
      emoji: '🇪🇬',
      svg: buildTriBandFlagSvg('#dc2626', '#f8fafc', '#0f172a', '<circle cx="45" cy="30" r="5" fill="#d97706"/>')
    },
    capitalAr: 'القاهرة',
    capitalEn: 'Cairo',
    areaKm2: 1002450,
    population: 109000000,
    regimeType: 'جمهورية رئاسية (إطار تجريبي)',
    leader: {
      name: 'رئيس الجمهورية — ملف تجريبي',
      title: 'رئيس الدولة'
    },
    government: {
      headOfGovernment: 'رئيس مجلس الوزراء — ملف تجريبي',
      headTitle: 'رئيس الوزراء',
      cabinetLabel: 'الحكومة التنفيذية'
    },
    stability: {
      politicalStability: 68,
      internalStability: 70,
      internationalInfluence: 72
    },
    economy: {
      economicPower: 64,
      gdpBillionUsd: 400,
      annualBudgetBillionUsd: 115,
      currencyCode: 'EGP',
      primaryResources: ['قناة السويس', 'الغاز الطبيعي', 'الزراعة', 'السياحة', 'المعادن']
    },
    military: {
      overallPower: 76,
      landForces: 82,
      navalForces: 71,
      airForces: 75,
      activePersonnel: 440000,
      doctrine: 'تأمين الممر الملاحي والدفاع المشترك (تجريبي)'
    },
    diplomacy: {
      alliances: [
        { targetIso3: 'SAU', name: 'المملكة العربية السعودية', type: 'defense_pact', notes: 'أمن البحر الأحمر' },
        { targetIso3: 'ARE', name: 'الإمارات العربية المتحدة', type: 'alliance', notes: 'استثمارات وتنسيق إقليمي' },
        { targetIso3: 'FRA', name: 'فرنسا', type: 'trade', notes: 'شراكة بحرية وتسليح' }
      ],
      rivalries: [
        { name: 'نزاعات الموارد المائية', type: 'tension', notes: 'ملف قابل للتخصيص في السيناريو' }
      ],
      diplomaticStance: 'محورية شرق المتوسط والبحر الأحمر'
    },
    mediaAndPublic: {
      publicOpinion: 66,
      mediaInfluence: 74,
      narrativeSummary: 'تغطية تركز على البنية التحتية وأمن قناة السويس والدور الدبلوماسي الإقليمي (تجريبي).'
    },
    mapColor: '#b45309',
    summary: 'دولة محورية تتحكم في قناة السويس وتربط بين المتوسط والبحر الأحمر مع كتلة سكانية وبشرية كبيرة (بيانات محاكاة تجريبية).'
  }),

  createSeedCountry({
    iso3: 'ARE',
    nameAr: 'الإمارات العربية المتحدة',
    nameEn: 'United Arab Emirates',
    flag: {
      mode: 'svg',
      emoji: '🇦🇪',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><rect width="90" height="20" y="0" fill="#15803d"/><rect width="90" height="20" y="20" fill="#f8fafc"/><rect width="90" height="20" y="40" fill="#0f172a"/><rect width="24" height="60" x="0" fill="#dc2626"/></svg>'
    },
    capitalAr: 'أبوظبي',
    capitalEn: 'Abu Dhabi',
    areaKm2: 83600,
    population: 9900000,
    regimeType: 'اتحاد دستوري (إطار تجريبي)',
    leader: {
      name: 'رئيس الدولة — ملف تجريبي',
      title: 'رئيس الاتحاد'
    },
    government: {
      headOfGovernment: 'رئيس مجلس الوزراء — ملف تجريبي',
      headTitle: 'رئيس مجلس الوزراء'
    },
    stability: {
      politicalStability: 88,
      internalStability: 90,
      internationalInfluence: 74
    },
    economy: {
      economicPower: 82,
      gdpBillionUsd: 510,
      annualBudgetBillionUsd: 165,
      currencyCode: 'AED',
      primaryResources: ['النفط والغاز', 'الموانئ اللوجستية', 'التجارة المالية', 'التقنية والطاقة النظيفة']
    },
    military: {
      overallPower: 66,
      landForces: 62,
      navalForces: 64,
      airForces: 76,
      activePersonnel: 65000,
      doctrine: 'قوة سريعة الانتشار ومنظومات دفاعية حديثة (تجريبي)'
    },
    diplomacy: {
      alliances: [
        { targetIso3: 'SAU', name: 'المملكة العربية السعودية', type: 'alliance' },
        { targetIso3: 'EGY', name: 'جمهورية مصر العربية', type: 'alliance' },
        { targetIso3: 'IND', name: 'الهند', type: 'trade' }
      ],
      rivalries: [],
      diplomaticStance: 'شبكات تجارة وموانئ متعددة الأقطاب'
    },
    mediaAndPublic: {
      publicOpinion: 84,
      mediaInfluence: 71,
      narrativeSummary: 'صورة رقمية وتجارية عالية التأثير مع تركيز على الموانئ والابتكار (تجريبي).'
    },
    mapColor: '#0f766e',
    summary: 'مركز تجاري وملاحي متقدم على مضيق هرمز وخليج عُمان مع مرونة مالية عالية (بيانات محاكاة تجريبية).'
  }),

  createSeedCountry({
    iso3: 'TUR',
    nameAr: 'تركيا',
    nameEn: 'Turkey',
    flag: {
      mode: 'svg',
      emoji: '🇹🇷',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><rect width="90" height="60" fill="#dc2626"/><circle cx="38" cy="30" r="14" fill="#f8fafc"/><circle cx="42" cy="30" r="11" fill="#dc2626"/><polygon points="55,24 57,28 62,28 58,31 59,36 55,33 51,36 52,31 48,28 53,28" fill="#f8fafc"/></svg>'
    },
    capitalAr: 'أنقرة',
    capitalEn: 'Ankara',
    areaKm2: 783562,
    population: 85000000,
    regimeType: 'جمهورية رئاسية (إطار تجريبي)',
    leader: {
      name: 'رئيس الجمهورية — ملف تجريبي',
      title: 'رئيس الدولة'
    },
    government: {
      headOfGovernment: 'مجلس الوزراء التنفيذي — ملف تجريبي',
      headTitle: 'رئيس الهيئة التنفيذية'
    },
    stability: {
      politicalStability: 64,
      internalStability: 66,
      internationalInfluence: 76
    },
    economy: {
      economicPower: 71,
      gdpBillionUsd: 1020,
      annualBudgetBillionUsd: 290,
      currencyCode: 'TRY',
      primaryResources: ['الصناعات الدفاعية', 'التصنيع', 'الزراعة', 'مضائق البوسفور']
    },
    military: {
      overallPower: 79,
      landForces: 82,
      navalForces: 73,
      airForces: 78,
      activePersonnel: 355000,
      doctrine: 'سيطرة على المضائق ومسيّرات تكتيكية (تجريبي)'
    },
    diplomacy: {
      alliances: [
        { targetIso3: 'USA', name: 'الولايات المتحدة الأمريكية', type: 'alliance', notes: 'شراكة دفاعية تقليدية' },
        { targetIso3: 'GBR', name: 'المملكة المتحدة', type: 'trade' }
      ],
      rivalries: [
        { name: 'ملفات شرق المتوسط', type: 'tension', notes: 'تحديات حدود بحرية تجريبية' }
      ],
      diplomaticStance: 'دبلوماسية توازن بين الكتل والمضائق'
    },
    mediaAndPublic: {
      publicOpinion: 62,
      mediaInfluence: 73,
      narrativeSummary: 'حضور إعلامي عابر للحدود يركز على التصنيع الدفاعي والدور الإقليمي (تجريبي).'
    },
    mapColor: '#be123c',
    summary: 'نقطة التقاء بين البحر الأسود والمتوسط تتحكم بمضائق البوسفور والدردنيل مع قاعدة صناعية دفاعية (بيانات محاكاة تجريبية).'
  }),

  createSeedCountry({
    iso3: 'USA',
    nameAr: 'الولايات المتحدة الأمريكية',
    nameEn: 'United States',
    flag: {
      mode: 'svg',
      emoji: '🇺🇸',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><rect width="90" height="60" fill="#f8fafc"/><rect width="90" height="10" y="0" fill="#dc2626"/><rect width="90" height="10" y="20" fill="#dc2626"/><rect width="90" height="10" y="40" fill="#dc2626"/><rect width="40" height="32" fill="#1e3a8a"/><circle cx="12" cy="10" r="2" fill="#f8fafc"/><circle cx="24" cy="10" r="2" fill="#f8fafc"/><circle cx="18" cy="18" r="2" fill="#f8fafc"/><circle cx="12" cy="24" r="2" fill="#f8fafc"/><circle cx="24" cy="24" r="2" fill="#f8fafc"/></svg>'
    },
    capitalAr: 'واشنطن العاصمة',
    capitalEn: 'Washington, D.C.',
    areaKm2: 9833517,
    population: 335000000,
    regimeType: 'جمهورية فيدرالية (إطار تجريبي)',
    leader: {
      name: 'رئيس الدولة — ملف تجريبي',
      title: 'رئيس الولايات المتحدة'
    },
    government: {
      headOfGovernment: 'الإدارة التنفيذية الفيدرالية — ملف تجريبي',
      headTitle: 'السلطة التنفيذية'
    },
    stability: {
      politicalStability: 74,
      internalStability: 71,
      internationalInfluence: 94
    },
    economy: {
      economicPower: 96,
      gdpBillionUsd: 27000,
      annualBudgetBillionUsd: 6500,
      currencyCode: 'USD',
      primaryResources: ['التكنولوجيا والبرمجيات', 'الطاقة الصخرية', 'الأسواق المالية', 'الزراعة الصناعية']
    },
    military: {
      overallPower: 96,
      landForces: 90,
      navalForces: 97,
      airForces: 98,
      activePersonnel: 1328000,
      doctrine: 'انتشار بحري وجوي عالمي بحاملات الطائرات (تجريبي)'
    },
    diplomacy: {
      alliances: [
        { targetIso3: 'GBR', name: 'المملكة المتحدة', type: 'defense_pact' },
        { targetIso3: 'FRA', name: 'فرنسا', type: 'alliance' },
        { targetIso3: 'JPN', name: 'اليابان', type: 'defense_pact' },
        { targetIso3: 'DEU', name: 'ألمانيا', type: 'alliance' }
      ],
      rivalries: [
        { targetIso3: 'CHN', name: 'الصين', type: 'rivalry', notes: 'تنافس تجاري وتقني وبحري' },
        { targetIso3: 'RUS', name: 'روسيا', type: 'rivalry', notes: 'تنافس أمني واستراتيجي' }
      ],
      diplomaticStance: 'شبكة تحالفات بحرية وأمنية عابرة للمحيطات'
    },
    mediaAndPublic: {
      publicOpinion: 61,
      mediaInfluence: 92,
      narrativeSummary: 'منظومة إعلامية وتقنية عالمية التأثير مع استقطاب داخلي ملحوظ (تجريبي).'
    },
    mapColor: '#1d4ed8',
    summary: 'قوة محيطية واقتصادية كبرى ذات انتشار بحري وجوي واسع وشبكة تحالفات في الأطلسي والهادئ (بيانات محاكاة تجريبية).'
  }),

  createSeedCountry({
    iso3: 'CHN',
    nameAr: 'الصين',
    nameEn: 'China',
    flag: {
      mode: 'svg',
      emoji: '🇨🇳',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><rect width="90" height="60" fill="#dc2626"/><polygon points="18,10 20,16 26,16 21,19 23,25 18,21 13,25 15,19 10,16 16,16" fill="#facc15"/><circle cx="32" cy="12" r="2" fill="#facc15"/><circle cx="35" cy="18" r="2" fill="#facc15"/><circle cx="32" cy="24" r="2" fill="#facc15"/></svg>'
    },
    capitalAr: 'بكين',
    capitalEn: 'Beijing',
    areaKm2: 9596961,
    population: 1410000000,
    regimeType: 'جمهورية مركزية (إطار تجريبي)',
    leader: {
      name: 'رئيس الدولة — ملف تجريبي',
      title: 'رئيس الجمهورية'
    },
    government: {
      headOfGovernment: 'رئيس مجلس الدولة — ملف تجريبي',
      headTitle: 'رئيس الوزراء'
    },
    stability: {
      politicalStability: 80,
      internalStability: 78,
      internationalInfluence: 90
    },
    economy: {
      economicPower: 93,
      gdpBillionUsd: 18000,
      annualBudgetBillionUsd: 4200,
      currencyCode: 'CNY',
      primaryResources: ['التصنيع الثقيل', 'المعادن النادرة', 'الإلكترونيات', 'الموانئ وسلاسل الإمداد']
    },
    military: {
      overallPower: 91,
      landForces: 90,
      navalForces: 89,
      airForces: 88,
      activePersonnel: 2035000,
      doctrine: 'منع الوصول البحري وتحديث الأساطيل (تجريبي)'
    },
    diplomacy: {
      alliances: [
        { targetIso3: 'RUS', name: 'روسيا', type: 'trade', notes: 'شراكة طاقة وتنسيق أوراسي' },
        { targetIso3: 'BRA', name: 'البرازيل', type: 'trade', notes: 'شراكة موارد وتجارة' }
      ],
      rivalries: [
        { targetIso3: 'USA', name: 'الولايات المتحدة الأمريكية', type: 'rivalry', notes: 'تنافس استراتيجي وتقني' },
        { targetIso3: 'IND', name: 'الهند', type: 'tension', notes: 'منافسة حدودية وبحرية' }
      ],
      diplomaticStance: 'مبادرات ممرات تجارية وشبكة موانئ عالمية'
    },
    mediaAndPublic: {
      publicOpinion: 75,
      mediaInfluence: 82,
      narrativeSummary: 'خطاب إعلامي يركز على النمو الصناعي والشراكات التجارية الدولية (تجريبي).'
    },
    mapColor: '#b91c1c',
    summary: 'قطب تصنيعي وبحري رئيسي في شرق آسيا يتمتع بسلاسل إمداد ضخمة ونفوذ تجاري عابر للقارات (بيانات محاكاة تجريبية).'
  }),

  createSeedCountry({
    iso3: 'RUS',
    nameAr: 'روسيا',
    nameEn: 'Russia',
    flag: {
      mode: 'svg',
      emoji: '🇷🇺',
      svg: buildTriBandFlagSvg('#f8fafc', '#1d4ed8', '#dc2626')
    },
    capitalAr: 'موسكو',
    capitalEn: 'Moscow',
    areaKm2: 17098242,
    population: 144000000,
    regimeType: 'جمهورية فيدرالية (إطار تجريبي)',
    leader: {
      name: 'رئيس الدولة — ملف تجريبي',
      title: 'رئيس الاتحاد'
    },
    government: {
      headOfGovernment: 'رئيس الحكومة — ملف تجريبي',
      headTitle: 'رئيس الوزراء'
    },
    stability: {
      politicalStability: 66,
      internalStability: 65,
      internationalInfluence: 81
    },
    economy: {
      economicPower: 69,
      gdpBillionUsd: 2050,
      annualBudgetBillionUsd: 490,
      currencyCode: 'RUB',
      primaryResources: ['الغاز الطبيعي', 'النفط', 'الحبوب', 'التيتانيوم واليورانيوم']
    },
    military: {
      overallPower: 88,
      landForces: 89,
      navalForces: 80,
      airForces: 85,
      activePersonnel: 1150000,
      doctrine: 'ردع صاروخي استراتيجي ومدرعات برية (تجريبي)'
    },
    diplomacy: {
      alliances: [
        { targetIso3: 'CHN', name: 'الصين', type: 'trade', notes: 'تعاون طاقة واقتصاد' }
      ],
      rivalries: [
        { targetIso3: 'USA', name: 'الولايات المتحدة الأمريكية', type: 'rivalry' },
        { targetIso3: 'GBR', name: 'المملكة المتحدة', type: 'sanctions' }
      ],
      diplomaticStance: 'محاور أوراسية وسياسة طاقة استراتيجية'
    },
    mediaAndPublic: {
      publicOpinion: 64,
      mediaInfluence: 74,
      narrativeSummary: 'رسائل إعلامية موجهة حول الأمن القومي وتوازن الأقطاب (تجريبي).'
    },
    mapColor: '#4338ca',
    summary: 'أكبر دولة مساحة في العالم بموارد طاقة ومعادن وفيرة وقدرات صاروخية وبرية واسعة (بيانات محاكاة تجريبية).'
  }),

  createSeedCountry({
    iso3: 'GBR',
    nameAr: 'المملكة المتحدة',
    nameEn: 'United Kingdom',
    flag: {
      mode: 'svg',
      emoji: '🇬🇧',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><rect width="90" height="60" fill="#1e3a8a"/><line x1="0" y1="0" x2="90" y2="60" stroke="#f8fafc" stroke-width="10"/><line x1="90" y1="0" x2="0" y2="60" stroke="#f8fafc" stroke-width="10"/><rect width="90" height="16" y="22" fill="#f8fafc"/><rect width="16" height="60" x="37" fill="#f8fafc"/><rect width="90" height="10" y="25" fill="#dc2626"/><rect width="10" height="60" x="40" fill="#dc2626"/></svg>'
    },
    capitalAr: 'لندن',
    capitalEn: 'London',
    areaKm2: 243610,
    population: 68000000,
    regimeType: 'ملكية برلمانية (إطار تجريبي)',
    leader: {
      name: 'العاهل — ملف تجريبي',
      title: 'رأس الدولة'
    },
    government: {
      headOfGovernment: 'رئيس الوزراء — ملف تجريبي',
      headTitle: 'رئيس مجلس الوزراء'
    },
    stability: {
      politicalStability: 79,
      internalStability: 80,
      internationalInfluence: 84
    },
    economy: {
      economicPower: 83,
      gdpBillionUsd: 3350,
      annualBudgetBillionUsd: 1380,
      currencyCode: 'GBP',
      primaryResources: ['الخدمات المالية', 'الطاقة البحرية', 'الصناعات الدوائية', 'التقنية الفائقة']
    },
    military: {
      overallPower: 78,
      landForces: 71,
      navalForces: 83,
      airForces: 80,
      activePersonnel: 148000,
      doctrine: 'قوة بحرية وجوية استطلاعية وحاملات مرافقة (تجريبي)'
    },
    diplomacy: {
      alliances: [
        { targetIso3: 'USA', name: 'الولايات المتحدة الأمريكية', type: 'defense_pact' },
        { targetIso3: 'FRA', name: 'فرنسا', type: 'alliance' }
      ],
      rivalries: [
        { targetIso3: 'RUS', name: 'روسيا', type: 'sanctions' }
      ],
      diplomaticStance: 'تحالف أطلسي وتعاون أمني بحري'
    },
    mediaAndPublic: {
      publicOpinion: 68,
      mediaInfluence: 86,
      narrativeSummary: 'تأثير إعلامي دولي عالٍ عبر الشبكات الناطقة بالإنجليزية (تجريبي).'
    },
    mapColor: '#0369a1',
    summary: 'مركز مالي وبحري في شمال الأطلسي بقدرات استطلاعية وإعلامية عابرة للقارات (بيانات محاكاة تجريبية).'
  }),

  createSeedCountry({
    iso3: 'FRA',
    nameAr: 'فرنسا',
    nameEn: 'France',
    flag: {
      mode: 'svg',
      emoji: '🇫🇷',
      svg: buildVerticalTriBandFlagSvg('#1d4ed8', '#f8fafc', '#dc2626')
    },
    capitalAr: 'باريس',
    capitalEn: 'Paris',
    areaKm2: 551695,
    population: 68200000,
    regimeType: 'جمهورية شبه رئاسية (إطار تجريبي)',
    leader: {
      name: 'رئيس الجمهورية — ملف تجريبي',
      title: 'رئيس الدولة'
    },
    government: {
      headOfGovernment: 'رئيس الوزراء — ملف تجريبي',
      headTitle: 'رئيس الحكومة'
    },
    stability: {
      politicalStability: 75,
      internalStability: 73,
      internationalInfluence: 85
    },
    economy: {
      economicPower: 82,
      gdpBillionUsd: 3050,
      annualBudgetBillionUsd: 1620,
      currencyCode: 'EUR',
      primaryResources: ['الطاقة النووية', 'الطيران والفضاء', 'الزراعة', 'الصناعات الفاخرة']
    },
    military: {
      overallPower: 81,
      landForces: 77,
      navalForces: 82,
      airForces: 83,
      activePersonnel: 205000,
      doctrine: 'استقلالية دفاعية وانتشار متوسطي وبحري (تجريبي)'
    },
    diplomacy: {
      alliances: [
        { targetIso3: 'DEU', name: 'ألمانيا', type: 'alliance', notes: 'المحور الأوروبي' },
        { targetIso3: 'GBR', name: 'المملكة المتحدة', type: 'alliance' },
        { targetIso3: 'EGY', name: 'جمهورية مصر العربية', type: 'trade' }
      ],
      rivalries: [],
      diplomaticStance: 'محور أوروبي وحضور متوسطي وأطلسي'
    },
    mediaAndPublic: {
      publicOpinion: 65,
      mediaInfluence: 81,
      narrativeSummary: 'دبلوماسية ثقافية وإعلامية أوروبية نشطة في المتوسط وأفريقيا (تجريبي).'
    },
    mapColor: '#2563eb',
    summary: 'قوة أوروبية ذات قاعدة صناعية دفاعية وطاقة نووية وحضور بحري في المتوسط والمحيطات (بيانات محاكاة تجريبية).'
  }),

  createSeedCountry({
    iso3: 'DEU',
    nameAr: 'ألمانيا',
    nameEn: 'Germany',
    flag: {
      mode: 'svg',
      emoji: '🇩🇪',
      svg: buildTriBandFlagSvg('#0f172a', '#dc2626', '#facc15')
    },
    capitalAr: 'برلين',
    capitalEn: 'Berlin',
    areaKm2: 357588,
    population: 84500000,
    regimeType: 'جمهورية برلمانية فيدرالية (إطار تجريبي)',
    leader: {
      name: 'الرئيس الاتحادي — ملف تجريبي',
      title: 'رئيس الدولة'
    },
    government: {
      headOfGovernment: 'المستشار الاتحادي — ملف تجريبي',
      headTitle: 'رئيس الحكومة'
    },
    stability: {
      politicalStability: 83,
      internalStability: 82,
      internationalInfluence: 84
    },
    economy: {
      economicPower: 89,
      gdpBillionUsd: 4450,
      annualBudgetBillionUsd: 2100,
      currencyCode: 'EUR',
      primaryResources: ['الهندسة الميكانيكية', 'السيارات', 'الكيماويات', 'الطاقة المتجددة']
    },
    military: {
      overallPower: 74,
      landForces: 75,
      navalForces: 65,
      airForces: 76,
      activePersonnel: 183000,
      doctrine: 'دفاع إقليمي أوروبي وبنية لوجستية (تجريبي)'
    },
    diplomacy: {
      alliances: [
        { targetIso3: 'FRA', name: 'فرنسا', type: 'alliance' },
        { targetIso3: 'USA', name: 'الولايات المتحدة الأمريكية', type: 'alliance' }
      ],
      rivalries: [],
      diplomaticStance: 'تكامل صناعي أوروبي ودبلوماسية تجارية'
    },
    mediaAndPublic: {
      publicOpinion: 74,
      mediaInfluence: 78,
      narrativeSummary: 'تركيز على الاستقرار الصناعي والتحول في قطاع الطاقة (تجريبي).'
    },
    mapColor: '#475569',
    summary: 'المحرك الصناعي والمالي الأكبر في وسط أوروبا بشبكة نقل وإمداد عالية الكفاءة (بيانات محاكاة تجريبية).'
  }),

  createSeedCountry({
    iso3: 'JPN',
    nameAr: 'اليابان',
    nameEn: 'Japan',
    flag: {
      mode: 'svg',
      emoji: '🇯🇵',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><rect width="90" height="60" fill="#f8fafc"/><circle cx="45" cy="30" r="16" fill="#dc2626"/></svg>'
    },
    capitalAr: 'طوكيو',
    capitalEn: 'Tokyo',
    areaKm2: 377975,
    population: 124500000,
    regimeType: 'ملكية دستورية برلمانية (إطار تجريبي)',
    leader: {
      name: 'الإمبراطور — ملف تجريبي',
      title: 'رمز الدولة'
    },
    government: {
      headOfGovernment: 'رئيس الوزراء — ملف تجريبي',
      headTitle: 'رئيس مجلس الوزراء'
    },
    stability: {
      politicalStability: 86,
      internalStability: 89,
      internationalInfluence: 82
    },
    economy: {
      economicPower: 88,
      gdpBillionUsd: 4250,
      annualBudgetBillionUsd: 1650,
      currencyCode: 'JPY',
      primaryResources: ['الروبوتات وأشباه الموصلات', 'السيارات', 'الصناعات البحرية', 'الابتكار التقني']
    },
    military: {
      overallPower: 79,
      landForces: 72,
      navalForces: 84,
      airForces: 82,
      activePersonnel: 247000,
      doctrine: 'دفاع بحري وجوي متقدم للجزر (تجريبي)'
    },
    diplomacy: {
      alliances: [
        { targetIso3: 'USA', name: 'الولايات المتحدة الأمريكية', type: 'defense_pact' },
        { targetIso3: 'IND', name: 'الهند', type: 'trade' }
      ],
      rivalries: [],
      diplomaticStance: 'أمن الممرات البحرية في غرب الهادئ'
    },
    mediaAndPublic: {
      publicOpinion: 78,
      mediaInfluence: 80,
      narrativeSummary: 'تأثير ثقافي وتقني واسع مع تركيز على استقرار شرق آسيا (تجريبي).'
    },
    mapColor: '#0284c7',
    summary: 'قوة بحرية وتقنية متقدمة في المحيط الهادئ بأسطول حديث وبنية صناعية دقيقة (بيانات محاكاة تجريبية).'
  }),

  createSeedCountry({
    iso3: 'IND',
    nameAr: 'الهند',
    nameEn: 'India',
    flag: {
      mode: 'svg',
      emoji: '🇮🇳',
      svg: buildTriBandFlagSvg('#f97316', '#f8fafc', '#15803d', '<circle cx="45" cy="30" r="7" fill="none" stroke="#1e3a8a" stroke-width="2"/>')
    },
    capitalAr: 'نيودلهي',
    capitalEn: 'New Delhi',
    areaKm2: 3287263,
    population: 1425000000,
    regimeType: 'جمهورية برلمانية فيدرالية (إطار تجريبي)',
    leader: {
      name: 'رئيس الجمهورية — ملف تجريبي',
      title: 'رئيس الدولة'
    },
    government: {
      headOfGovernment: 'رئيس الوزراء — ملف تجريبي',
      headTitle: 'رئيس الوزراء'
    },
    stability: {
      politicalStability: 76,
      internalStability: 72,
      internationalInfluence: 83
    },
    economy: {
      economicPower: 85,
      gdpBillionUsd: 3800,
      annualBudgetBillionUsd: 980,
      currencyCode: 'INR',
      primaryResources: ['البرمجيات والخدمات الرقمية', 'الأدوية', 'الزراعة', 'التصنيع المتنامي']
    },
    military: {
      overallPower: 84,
      landForces: 86,
      navalForces: 80,
      airForces: 83,
      activePersonnel: 1455000,
      doctrine: 'تأمين المحيط الهندي والحدود الجبلية (تجريبي)'
    },
    diplomacy: {
      alliances: [
        { targetIso3: 'ARE', name: 'الإمارات العربية المتحدة', type: 'trade' },
        { targetIso3: 'JPN', name: 'اليابان', type: 'trade' },
        { targetIso3: 'FRA', name: 'فرنسا', type: 'alliance' }
      ],
      rivalries: [
        { targetIso3: 'CHN', name: 'الصين', type: 'tension', notes: 'منافسة إقليمية وبحرية' }
      ],
      diplomaticStance: 'تعددية استراتيجية في المحيط الهندي'
    },
    mediaAndPublic: {
      publicOpinion: 74,
      mediaInfluence: 77,
      narrativeSummary: 'خطاب يركز على النمو السكاني والتقني وتأمين ممرات المحيط الهندي (تجريبي).'
    },
    mapColor: '#ea580c',
    summary: 'أكبر كتلة سكانية على المحيط الهندي بنمو تقني وصناعي سريع وأسطول محيطي متصاعد (بيانات محاكاة تجريبية).'
  }),

  createSeedCountry({
    iso3: 'BRA',
    nameAr: 'البرازيل',
    nameEn: 'Brazil',
    flag: {
      mode: 'svg',
      emoji: '🇧🇷',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><rect width="90" height="60" fill="#15803d"/><polygon points="45,8 80,30 45,52 10,30" fill="#facc15"/><circle cx="45" cy="30" r="12" fill="#1e3a8a"/></svg>'
    },
    capitalAr: 'برازيليا',
    capitalEn: 'Brasilia',
    areaKm2: 8515767,
    population: 215000000,
    regimeType: 'جمهورية فيدرالية رئاسية (إطار تجريبي)',
    leader: {
      name: 'رئيس الجمهورية — ملف تجريبي',
      title: 'رئيس الدولة والحكومة'
    },
    government: {
      headOfGovernment: 'مجلس الوزراء الاتحادي — ملف تجريبي',
      headTitle: 'القيادة التنفيذية'
    },
    stability: {
      politicalStability: 71,
      internalStability: 70,
      internationalInfluence: 75
    },
    economy: {
      economicPower: 77,
      gdpBillionUsd: 2150,
      annualBudgetBillionUsd: 780,
      currencyCode: 'BRL',
      primaryResources: ['المنتجات الزراعية', 'النفط البحري', 'خام الحديد', 'الطاقة الكهرومائية']
    },
    military: {
      overallPower: 68,
      landForces: 71,
      navalForces: 66,
      airForces: 67,
      activePersonnel: 360000,
      doctrine: 'تأمين الأمازون والسواحل الأطلسية الجنوبية (تجريبي)'
    },
    diplomacy: {
      alliances: [
        { targetIso3: 'CHN', name: 'الصين', type: 'trade' }
      ],
      rivalries: [],
      diplomaticStance: 'قيادة إقليمية في أمريكا الجنوبية وتجارة الغذاء والطاقة'
    },
    mediaAndPublic: {
      publicOpinion: 67,
      mediaInfluence: 70,
      narrativeSummary: 'تركيز على الأمن الغذائي والطاقة المتجددة وحوض الأمازون (تجريبي).'
    },
    mapColor: '#16a34a',
    summary: 'الركيزة الاقتصادية والجغرافية الأكبر في أمريكا الجنوبية بموارد زراعية ومعدنية واسعة (بيانات محاكاة تجريبية).'
  })
];
