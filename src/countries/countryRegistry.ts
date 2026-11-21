import { GeoRegionItem } from '../core/types';
import { studioDb } from '../storage/studioDb';
import { buildTriBandFlagSvg, SEED_COUNTRIES } from './countrySeed';
import {
  COUNTRY_SCHEMA_VERSION,
  CountryBundleExport,
  CountryProfile,
  makeCountryIdFromIso3,
  normalizeIso3,
  validateCountryImportPayload,
  validateCountryProfile
} from './countryTypes';

function cloneCountry(c: CountryProfile): CountryProfile {
  return {
    ...c,
    flag: { ...c.flag },
    leader: { ...c.leader },
    government: { ...c.government },
    stability: { ...c.stability },
    economy: { ...c.economy, primaryResources: [...c.economy.primaryResources] },
    military: { ...c.military },
    diplomacy: {
      ...c.diplomacy,
      alliances: c.diplomacy.alliances.map((a) => ({ ...a })),
      rivalries: c.diplomacy.rivalries.map((r) => ({ ...r }))
    },
    mediaAndPublic: { ...c.mediaAndPublic },
    metadata: { ...c.metadata },
    extensions: c.extensions ? { ...c.extensions } : undefined
  };
}

export class CountryRegistry {
  private byId = new Map<string, CountryProfile>();
  private byIso3 = new Map<string, string>(); // iso3 -> id
  private seedById = new Map<string, CountryProfile>();

  constructor(private useStorage = true) {
    for (const seed of SEED_COUNTRIES) {
      const cloned = cloneCountry(seed);
      this.seedById.set(cloned.id, cloneCountry(cloned));
      this.indexProfile(cloned);
    }
  }

  private indexProfile(profile: CountryProfile): void {
    const prevId = this.byIso3.get(profile.iso3);
    if (prevId && prevId !== profile.id) {
      this.byId.delete(prevId);
    }
    this.byId.set(profile.id, profile);
    this.byIso3.set(profile.iso3, profile.id);
  }

  async init(): Promise<void> {
    if (!this.useStorage) return;
    const saved = await studioDb.loadAllCountries();
    for (const raw of saved) {
      const res = validateCountryProfile(raw, `db:${raw?.id ?? '?'}`);
      if (res.errors.length === 0 && res.profile) {
        this.indexProfile(res.profile);
      }
    }
  }

  getAll(): CountryProfile[] {
    return [...this.byId.values()].sort((a, b) => a.nameAr.localeCompare(b.nameAr, 'ar'));
  }

  getById(id: string): CountryProfile | undefined {
    return this.byId.get(id);
  }

  getByIso3(iso3: string | undefined | null): CountryProfile | undefined {
    if (!iso3) return undefined;
    const norm = normalizeIso3(iso3);
    const id = this.byIso3.get(norm);
    return id ? this.byId.get(id) : undefined;
  }

  resolveForRegion(region: GeoRegionItem | undefined | null): CountryProfile | undefined {
    if (!region) return undefined;
    if (region.iso3) {
      const match = this.getByIso3(region.iso3);
      if (match) return match;
    }
    return this.getByIso3(region.id);
  }

  isSeedCountry(id: string): boolean {
    return this.seedById.has(id);
  }

  search(query: string): CountryProfile[] {
    const q = query.trim().toLowerCase();
    const list = this.getAll();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.nameAr.toLowerCase().includes(q) ||
        c.nameEn.toLowerCase().includes(q) ||
        c.iso3.toLowerCase().includes(q) ||
        c.capitalAr.toLowerCase().includes(q)
    );
  }

  async upsertCountry(
    draft: unknown,
    sourceKind: 'user_custom' | 'imported' | 'preserve' = 'user_custom'
  ): Promise<CountryProfile> {
    const res = validateCountryProfile(draft, 'country');
    if (res.errors.length > 0 || !res.profile) {
      throw new Error(res.errors.join(' | '));
    }
    const existing = this.byId.get(res.profile.id) ?? this.getByIso3(res.profile.iso3);
    const profile: CountryProfile = {
      ...res.profile,
      id: existing?.id ?? res.profile.id,
      metadata: {
        ...res.profile.metadata,
        dataSourceKind:
          sourceKind === 'preserve'
            ? res.profile.metadata.dataSourceKind
            : sourceKind,
        sourceLabel:
          sourceKind === 'user_custom'
            ? 'ملف مخصّص ومحدّث محليًا'
            : res.profile.metadata.sourceLabel,
        updatedAt: new Date().toISOString(),
        schemaVersion: COUNTRY_SCHEMA_VERSION
      }
    };

    this.indexProfile(profile);
    if (this.useStorage) {
      await studioDb.saveCountry(profile);
    }
    return profile;
  }

  async deleteOrResetCountry(id: string): Promise<'deleted' | 'reset'> {
    const current = this.byId.get(id);
    if (this.useStorage) {
      await studioDb.deleteCountry(id);
    }
    if (this.seedById.has(id)) {
      const seed = cloneCountry(this.seedById.get(id)!);
      this.indexProfile(seed);
      return 'reset';
    }
    if (current) {
      this.byIso3.delete(current.iso3);
      this.byId.delete(id);
    }
    return 'deleted';
  }

  createDraftFromRegion(region?: GeoRegionItem | null): CountryProfile {
    const iso3 = region?.iso3 ? normalizeIso3(region.iso3) : region?.id ? normalizeIso3(region.id).slice(0, 8) : 'NEW';
    const nameEn = region?.name || 'New State';
    const nameAr = region?.nameAr || region?.name || 'دولة جديدة';
    return {
      id: makeCountryIdFromIso3(iso3),
      iso3,
      nameAr,
      nameEn,
      flag: {
        mode: 'svg',
        svg: buildTriBandFlagSvg('#0f766e', '#f8fafc', '#1e293b')
      },
      capitalAr: 'العاصمة',
      areaKm2: 100000,
      population: 5000000,
      regimeType: 'جمهورية',
      leader: {
        name: 'رئيس الدولة',
        title: 'رئيس الدولة'
      },
      government: {
        headOfGovernment: 'رئيس الحكومة',
        headTitle: 'رئيس مجلس الوزراء'
      },
      stability: {
        politicalStability: 60,
        internalStability: 60,
        internationalInfluence: 50
      },
      economy: {
        economicPower: 50,
        gdpBillionUsd: 100,
        annualBudgetBillionUsd: 30,
        currencyCode: 'USD',
        primaryResources: ['الطاقة', 'التجارة']
      },
      military: {
        overallPower: 50,
        landForces: 50,
        navalForces: 45,
        airForces: 50,
        activePersonnel: 50000
      },
      diplomacy: {
        alliances: [],
        rivalries: [],
        diplomaticStance: 'دبلوماسية متوازنة'
      },
      mediaAndPublic: {
        publicOpinion: 60,
        mediaInfluence: 50
      },
      mapColor: '#0f766e',
      summary: `ملف تعريفي مخصّص للدولة ${nameAr}.`,
      metadata: {
        dataSourceKind: 'user_custom',
        sourceLabel: 'إنشاء يدوي محلي',
        updatedAt: new Date().toISOString(),
        schemaVersion: COUNTRY_SCHEMA_VERSION
      }
    };
  }

  exportBundle(iso3Filter?: string[]): CountryBundleExport {
    const list = iso3Filter
      ? iso3Filter
          .map((code) => this.getByIso3(code))
          .filter((c): c is CountryProfile => Boolean(c))
      : this.getAll();
    return {
      schemaVersion: COUNTRY_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      countries: list.map(cloneCountry)
    };
  }

  async importBundle(rawPayload: unknown): Promise<{ imported: number; countries: CountryProfile[] }> {
    const res = validateCountryImportPayload(rawPayload);
    if (res.errors.length > 0) {
      throw new Error(res.errors.slice(0, 5).join(' | '));
    }
    const saved: CountryProfile[] = [];
    for (const c of res.countries) {
      const stored = await this.upsertCountry(c, 'preserve');
      saved.push(stored);
    }
    return { imported: saved.length, countries: saved };
  }
}
