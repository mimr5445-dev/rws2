import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MapPack } from '../core/types';
import { CountryRegistry } from './countryRegistry';
import { SEED_COUNTRIES } from './countrySeed';
import { buildRegionColorMap, formatCountryHoverSummary, resolveRegionCountry } from './countrySelection';
import { validateCountryImportPayload, validateCountryProfile } from './countryTypes';

function makeWorldMockMap(): MapPack {
  return {
    id: 'world_live',
    title: 'خريطة العالم',
    kind: 'geopolitical',
    geoLevel: 'world',
    width: 1200,
    height: 600,
    cellSize: 20,
    cols: 60,
    rows: 30,
    navGrid: new Array(60 * 30).fill(0),
    svgOrUrl: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 600"></svg>',
    unitScaleMultiplier: 1,
    anchors: {},
    zones: {},
    regions: {
      SAU: {
        id: 'SAU',
        iso3: 'SAU',
        name: 'Saudi Arabia',
        nameAr: 'المملكة العربية السعودية',
        bounds: { minX: 500, minY: 250, maxX: 580, maxY: 310 },
        center: { x: 540, y: 280 },
        polygons: [[{ x: 500, y: 250 }, { x: 580, y: 250 }, { x: 580, y: 310 }, { x: 500, y: 310 }]]
      },
      JOR: {
        id: 'JOR',
        iso3: 'JOR',
        name: 'Jordan',
        nameAr: 'الأردن',
        bounds: { minX: 480, minY: 230, maxX: 500, maxY: 250 },
        center: { x: 490, y: 240 },
        polygons: [[{ x: 480, y: 230 }, { x: 500, y: 230 }, { x: 500, y: 250 }, { x: 480, y: 250 }]]
      }
    }
  };
}

describe('Country Intelligence Data Validation', () => {
  it('validates every seed country cleanly with explicit seed_demo labeling', () => {
    assert.ok(SEED_COUNTRIES.length >= 12);
    for (const seed of SEED_COUNTRIES) {
      const res = validateCountryProfile(seed, seed.iso3);
      assert.equal(res.errors.length, 0, `${seed.iso3} validation errors: ${res.errors.join(', ')}`);
      assert.equal(res.profile?.metadata.dataSourceKind, 'seed_demo');
      assert.ok(res.profile?.metadata.sourceLabel.includes('تجريبية'));
    }
  });

  it('rejects XSS script payloads inside flag SVG and portrait SVG', () => {
    const base = structuredClone(SEED_COUNTRIES[0]);
    base.flag = {
      mode: 'svg',
      svg: '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="10" height="10"/></svg>'
    };
    const resFlag = validateCountryProfile(base);
    assert.ok(resFlag.errors.length > 0);

    const base2 = structuredClone(SEED_COUNTRIES[0]);
    base2.leader.portraitSvg = '<svg xmlns="http://www.w3.org/2000/svg" onload="fetch(1)"></svg>';
    const resPortrait = validateCountryProfile(base2);
    assert.ok(resPortrait.errors.length > 0);
  });

  it('rejects prototype pollution keys and invalid color/iso3 values', () => {
    const evil = JSON.parse(
      '{"iso3":"SAU","nameAr":"أ","nameEn":"A","capitalAr":"ع","regimeType":"ر","mapColor":"#123456","summary":"س","__proto__":{"polluted":true}}'
    ) as unknown;
    const res = validateCountryImportPayload(evil);
    assert.ok(res.errors.length > 0);

    const badColor = structuredClone(SEED_COUNTRIES[0]);
    badColor.mapColor = 'red';
    badColor.iso3 = 'bad iso!';
    const resBad = validateCountryProfile(badColor);
    assert.ok(resBad.errors.some((e) => e.includes('mapColor')));
    assert.ok(resBad.errors.some((e) => e.includes('iso3')));
  });
});

describe('CountryRegistry CRUD, Search & Bundle Import/Export', () => {
  it('resolves seed countries by ISO3 and updates/resets cleanly', async () => {
    const reg = new CountryRegistry(false);
    await reg.init();

    const sau = reg.getByIso3('sau');
    assert.ok(sau);
    assert.equal(sau.iso3, 'SAU');
    assert.equal(reg.isSeedCountry(sau.id), true);

    const modified = structuredClone(sau);
    modified.capitalAr = 'الدرعية';
    modified.mapColor = '#0284c7';
    modified.economy.gdpBillionUsd = 1400;

    const saved = await reg.upsertCountry(modified, 'user_custom');
    assert.equal(saved.capitalAr, 'الدرعية');
    assert.equal(saved.mapColor, '#0284c7');
    assert.equal(saved.metadata.dataSourceKind, 'user_custom');

    const outcome = await reg.deleteOrResetCountry(saved.id);
    assert.equal(outcome, 'reset');
    assert.equal(reg.getByIso3('SAU')?.capitalAr, 'الرياض');
  });

  it('creates custom country drafts from unpopulated world regions and deletes custom countries', async () => {
    const reg = new CountryRegistry(false);
    await reg.init();
    const map = makeWorldMockMap();

    const unpopulated = resolveRegionCountry(map, 'JOR', reg);
    assert.equal(unpopulated.country, undefined);
    assert.equal(unpopulated.iso3, 'JOR');

    const draft = reg.createDraftFromRegion(unpopulated.region);
    draft.capitalAr = 'عمّان';
    draft.mapColor = '#0f766e';
    const created = await reg.upsertCountry(draft, 'user_custom');
    assert.equal(reg.isSeedCountry(created.id), false);

    const populatedNow = resolveRegionCountry(map, 'JOR', reg);
    assert.equal(populatedNow.country?.capitalAr, 'عمّان');

    const delOutcome = await reg.deleteOrResetCountry(created.id);
    assert.equal(delOutcome, 'deleted');
    assert.equal(reg.getByIso3('JOR'), undefined);
  });

  it('exports and imports JSON bundles with duplicate/malformed rejection', async () => {
    const reg = new CountryRegistry(false);
    await reg.init();

    const bundle = reg.exportBundle(['SAU', 'EGY']);
    assert.equal(bundle.countries.length, 2);

    bundle.countries[0].iso3 = 'KWT';
    bundle.countries[0].id = 'country_kwt';
    bundle.countries[0].nameAr = 'الكويت';
    bundle.countries[0].nameEn = 'Kuwait';
    bundle.countries[0].capitalAr = 'مدينة الكويت';
    bundle.countries[0].metadata.dataSourceKind = 'user_custom';

    const importRes = await reg.importBundle({
      schemaVersion: 1,
      countries: [bundle.countries[0]]
    });
    assert.equal(importRes.imported, 1);
    assert.equal(reg.getByIso3('KWT')?.metadata.dataSourceKind, 'imported');

    await assert.rejects(() => reg.importBundle({ countries: [] }));
  });
});

describe('Map Region Binding & Hover Summaries', () => {
  it('builds per-country map colors only for populated regions and formats hover summaries cleanly', async () => {
    const reg = new CountryRegistry(false);
    await reg.init();
    const map = makeWorldMockMap();

    const colors = buildRegionColorMap(map, reg);
    assert.equal(colors.SAU, '#15803d');
    assert.equal(colors.JOR, undefined);

    const sauSummary = formatCountryHoverSummary(map.regions!.SAU, reg.getByIso3('SAU'));
    assert.ok(sauSummary.includes('SAU'));
    assert.ok(sauSummary.includes('الرياض'));

    const jorSummary = formatCountryHoverSummary(map.regions!.JOR, reg.getByIso3('JOR'));
    assert.ok(jorSummary.includes('JOR'));
    assert.ok(jorSummary.includes('لا يوجد ملف استخباراتي'));
  });
});
