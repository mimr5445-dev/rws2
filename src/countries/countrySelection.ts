import { GeoRegionItem, MapPack } from '../core/types';
import { CountryRegistry } from './countryRegistry';
import { CountryProfile } from './countryTypes';

export interface ResolvedRegionCountry {
  region?: GeoRegionItem;
  country?: CountryProfile;
  iso3?: string;
}

export function resolveRegionCountry(
  map: MapPack | undefined,
  regionId: string | null | undefined,
  registry: CountryRegistry
): ResolvedRegionCountry {
  if (!map) return {};
  if (map.geoLevel === 'country' && map.countryIso3 && !regionId) {
    return {
      iso3: map.countryIso3,
      country: registry.getByIso3(map.countryIso3)
    };
  }
  if (!regionId) return {};
  const region = map.regions?.[regionId];
  if (region) {
    return {
      region,
      iso3: region.iso3 ?? region.id,
      country: registry.resolveForRegion(region)
    };
  }
  const byIso = registry.getByIso3(regionId);
  return {
    iso3: byIso?.iso3 ?? regionId,
    country: byIso
  };
}

export function buildRegionColorMap(map: MapPack | undefined, registry: CountryRegistry): Record<string, string> {
  const out: Record<string, string> = {};
  if (!map || map.geoLevel !== 'world' || !map.regions) return out;
  for (const [regId, reg] of Object.entries(map.regions)) {
    const country = registry.resolveForRegion(reg);
    if (country?.mapColor) {
      out[regId] = country.mapColor;
    }
  }
  return out;
}

export function formatCountryHoverSummary(
  region: GeoRegionItem | undefined,
  country: CountryProfile | undefined
): string {
  if (!region && !country) return '';
  const displayName = country?.nameAr || region?.nameAr || region?.name || '';
  const enName = country?.nameEn || region?.name || '';
  const iso = country?.iso3 || region?.iso3 || '';
  const titlePart = enName && enName !== displayName ? `${displayName} (${enName})` : displayName;
  if (!country) {
    return `${titlePart}${iso ? ` · ${iso}` : ''} · لا يوجد ملف استخباراتي بعد`;
  }
  return `${titlePart} · ${country.iso3} · ${country.capitalAr} · استقرار ${country.stability.politicalStability}%`;
}
