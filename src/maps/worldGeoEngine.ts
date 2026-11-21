import {
  geoArea,
  geoCentroid,
  geoGraticule10,
  geoMercator,
  geoNaturalEarth1,
  geoPath,
  GeoPermissibleObjects,
  GeoProjection
} from 'd3-geo';
import * as countriesNs from 'i18n-iso-countries';
import arLocale from 'i18n-iso-countries/langs/ar.json';
import enLocale from 'i18n-iso-countries/langs/en.json';
import { feature, mesh } from 'topojson-client';
import worldAtlas from 'world-atlas/countries-110m.json';
import { GeoRegionItem, MapPack, MapZoneDef, NavCell, Point } from '../core/types';

const countries = ((countriesNs as unknown as { default?: typeof countriesNs }).default ??
  countriesNs) as typeof countriesNs;

countries.registerLocale(arLocale as countriesNs.LocaleData);
countries.registerLocale(enLocale as countriesNs.LocaleData);

const adm1Cache = new Map<string, GeoJSON.FeatureCollection>();

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '') || 'region'
  );
}

function extractProjectedPolygons(
  geometry: GeoJSON.Geometry,
  projection: GeoProjection,
  mapWidth: number
): Point[][] {
  const result: Point[][] = [];
  const projectRing = (ring: number[][]) => {
    let segment: Point[] = [];
    let prev: Point | null = null;
    for (const coord of ring) {
      const p = projection([coord[0], coord[1]]);
      if (!p || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) continue;
      const pt = { x: p[0], y: p[1] };
      if (prev && Math.abs(pt.x - prev.x) > mapWidth * 0.45) {
        if (segment.length >= 3) result.push(segment);
        segment = [];
      }
      segment.push(pt);
      prev = pt;
    }
    if (segment.length >= 3) result.push(segment);
  };

  if (geometry.type === 'Polygon') {
    if (geometry.coordinates[0]) projectRing(geometry.coordinates[0]);
  } else if (geometry.type === 'MultiPolygon') {
    for (const poly of geometry.coordinates) {
      if (poly[0]) projectRing(poly[0]);
    }
  }
  return result;
}

function createHitTester(
  features: GeoJSON.Feature[],
  regionIds: string[],
  projection: GeoProjection,
  mapWidth: number,
  mapHeight: number
): (pt: Point) => string | null {
  const scale = 0.5;
  const hw = Math.floor(mapWidth * scale);
  const hh = Math.floor(mapHeight * scale);
  const hitCanvas = document.createElement('canvas');
  hitCanvas.width = hw;
  hitCanvas.height = hh;
  const ctx = hitCanvas.getContext('2d', { willReadFrequently: true })!;
  ctx.scale(scale, scale);

  const pathGen = geoPath(projection, ctx);
  features.forEach((f, idx) => {
    const colorNum = idx + 1;
    const r = (colorNum >> 16) & 255;
    const g = (colorNum >> 8) & 255;
    const b = colorNum & 255;
    ctx.beginPath();
    pathGen(f);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fill();
  });

  return (pt: Point) => {
    const x = Math.floor(pt.x * scale);
    const y = Math.floor(pt.y * scale);
    if (x < 0 || y < 0 || x >= hw || y >= hh) return null;
    const d = ctx.getImageData(x, y, 1, 1).data;
    if (d[3] < 128) return null;
    const idx = (d[0] << 16) | (d[1] << 8) | d[2];
    return idx > 0 ? regionIds[idx - 1] ?? null : null;
  };
}

function rasterizeLandNavGrid(
  landGeo: GeoPermissibleObjects,
  projection: GeoProjection,
  width: number,
  height: number,
  cellSize: number
): { cols: number; rows: number; navGrid: NavCell[] } {
  const cols = Math.floor(width / cellSize);
  const rows = Math.floor(height / cellSize);
  const navCanvas = document.createElement('canvas');
  navCanvas.width = cols;
  navCanvas.height = rows;
  const ctx = navCanvas.getContext('2d')!;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, cols, rows);

  ctx.save();
  ctx.scale(cols / width, rows / height);
  const pathGen = geoPath(projection, ctx);
  ctx.beginPath();
  pathGen(landGeo);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();

  const pixels = ctx.getImageData(0, 0, cols, rows).data;
  const navGrid: NavCell[] = new Array(cols * rows).fill(1); // 1 = بحر
  for (let i = 0; i < cols * rows; i++) {
    if (pixels[i * 4] > 48) navGrid[i] = 0; // 0 = يابسة
  }
  return { cols, rows, navGrid };
}

function carveNavCorridor(
  navGrid: NavCell[],
  cols: number,
  rows: number,
  projection: GeoProjection,
  cellSize: number,
  waypoints: Array<[number, number]>,
  radiusCells: number,
  cellValue: NavCell
): void {
  const stamp = (gx: number, gy: number) => {
    for (let dy = -radiusCells; dy <= radiusCells; dy++) {
      for (let dx = -radiusCells; dx <= radiusCells; dx++) {
        const nx = gx + dx;
        const ny = gy + dy;
        if (nx >= 0 && ny >= 0 && nx < cols && ny < rows) {
          navGrid[ny * cols + nx] = cellValue;
        }
      }
    }
  };

  let prevGx: number | null = null;
  let prevGy: number | null = null;
  const stampConnected = (gx: number, gy: number) => {
    if (prevGx !== null && prevGy !== null && gx !== prevGx && gy !== prevGy) {
      stamp(gx, prevGy);
    }
    stamp(gx, gy);
    prevGx = gx;
    prevGy = gy;
  };

  for (let i = 0; i < waypoints.length; i++) {
    const p1 = projection(waypoints[i]);
    if (!p1) continue;
    const x1 = p1[0] / cellSize;
    const y1 = p1[1] / cellSize;
    stampConnected(Math.floor(x1), Math.floor(y1));
    if (i + 1 < waypoints.length) {
      const p2 = projection(waypoints[i + 1]);
      if (!p2) continue;
      const x2 = p2[0] / cellSize;
      const y2 = p2[1] / cellSize;
      const steps = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) * 2));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        stampConnected(Math.floor(x1 + (x2 - x1) * t), Math.floor(y1 + (y2 - y1) * t));
      }
    }
  }
}

export function buildWorldMapPack(): MapPack {
  const width = 1920;
  const height = 1080;
  const cellSize = 8;

  const topo = worldAtlas as any;
  const countriesFc = feature(topo, topo.objects.countries) as unknown as GeoJSON.FeatureCollection;
  const borderMesh = mesh(topo, topo.objects.countries, (a: any, b: any) => a !== b);
  const landGeom = feature(topo, topo.objects.land) as unknown as GeoPermissibleObjects;

  const projection = geoNaturalEarth1().fitExtent(
    [
      [36, 36],
      [width - 36, height - 36]
    ],
    countriesFc
  );

  // رسم الخريطة بنفس الستايل الهندسي الداكن المتوهج للاستوديو
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(width / 2, height / 2, 100, width / 2, height / 2, width * 0.65);
  grad.addColorStop(0, '#0d223a');
  grad.addColorStop(1, '#061221');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  const pathGen = geoPath(projection, ctx);

  // شبكة خطوط الطول والعرض
  ctx.beginPath();
  pathGen(geoGraticule10());
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const regions: Record<string, GeoRegionItem> = {};
  const zones: Record<string, MapZoneDef> = {};
  const anchors: Record<string, Point & { label?: string }> = {};
  const regionIds: string[] = [];

  countriesFc.features.forEach((f, i) => {
    const rawId = f.id !== undefined ? String(f.id).padStart(3, '0') : '';
    const enName = (f.properties?.name as string) || `Country_${i}`;
    const a2 = rawId ? countries.numericToAlpha2(rawId) : undefined;
    const iso3 = a2 ? countries.alpha2ToAlpha3(a2) : countries.getAlpha3Code(enName, 'en');
    const arName = iso3 ? countries.getName(iso3, 'ar') : undefined;
    const regId = iso3 || slugify(enName);
    regionIds.push(regId);

    ctx.beginPath();
    pathGen(f);
    ctx.fillStyle = i % 2 === 0 ? '#1b293b' : '#1f3044';
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const cent = pathGen.centroid(f);
    const b = pathGen.bounds(f);
    const polygons = f.geometry ? extractProjectedPolygons(f.geometry, projection, width) : [];

    if (Number.isFinite(cent[0]) && Number.isFinite(cent[1])) {
      regions[regId] = {
        id: regId,
        iso3,
        name: enName,
        nameAr: arName,
        center: { x: cent[0], y: cent[1] },
        bounds: { minX: b[0][0], minY: b[0][1], maxX: b[1][0], maxY: b[1][1] },
        polygons
      };
      anchors[regId] = { x: Math.round(cent[0]), y: Math.round(cent[1]), label: arName ?? enName };
      if (polygons[0]) {
        zones[regId] = { id: regId, label: arName ?? enName, polygon: polygons[0] };
      }
    }
  });

  // الحدود المشتركة بين الدول
  ctx.beginPath();
  pathGen(borderMesh);
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // إضافة مراسي بحرية واستراتيجية عالمية
  const strategicPoints: Array<[string, string, [number, number]]> = [
    ['suez_canal', 'قناة السويس', [32.3, 30.5]],
    ['bab_el_mandeb', 'باب المندب', [43.3, 12.6]],
    ['strait_of_hormuz', 'مضيق هرمز', [56.3, 26.6]],
    ['gibraltar', 'جبل طارق', [-5.6, 35.9]],
    ['arabian_sea', 'بحر العرب', [63.0, 15.0]],
    ['mediterranean', 'البحر المتوسط', [18.0, 35.0]],
    ['red_sea', 'البحر الأحمر', [38.5, 20.5]],
    ['riyadh', 'الرياض', [46.7, 24.7]],
    ['cairo', 'القاهرة', [31.2, 30.0]]
  ];
  for (const [id, label, ll] of strategicPoints) {
    const p = projection(ll);
    if (p) anchors[id] = { x: Math.round(p[0]), y: Math.round(p[1]), label };
  }

  // توليد شبكة الملاحة الحقيقية (يابسة=0، بحر=1، قناة/جسر مشترك=3)
  const { cols, rows, navGrid } = rasterizeLandNavGrid(landGeom, projection, width, height, cellSize);
  // فتح الممر البحري عبر باب المندب والبحر الأحمر وخليج السويس
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [50.0, 12.8],
      [43.4, 12.6],
      [41.0, 15.5],
      [38.5, 20.5],
      [34.5, 27.2],
      [33.5, 28.1],
      [32.7, 29.8]
    ],
    1,
    1
  );
  // قناة السويس (معبر ملاحي وجسور برية متصلة) + المدخل المتوسطي
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [32.7, 29.8],
      [32.4, 30.6],
      [32.3, 31.4]
    ],
    0,
    3
  );
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [32.3, 31.4],
      [32.0, 32.8]
    ],
    1,
    1
  );
  // قناة بنما (معبر ملاحي وجسور برية متصلة) + المداخل البحرية
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [-79.3, 7.8],
      [-79.5, 8.7]
    ],
    1,
    1
  );
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [-79.5, 8.7],
      [-79.9, 9.3]
    ],
    0,
    3
  );
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [-79.9, 9.3],
      [-80.4, 10.2]
    ],
    1,
    1
  );
  // مضيق هرمز والخليج العربي
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [58.5, 24.5],
      [56.5, 26.4],
      [54.5, 26.4],
      [52.0, 26.5],
      [50.2, 27.8],
      [49.4, 29.3]
    ],
    1,
    1
  );
  // مضيق جبل طارق
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [-7.0, 35.8],
      [-5.6, 35.95],
      [-4.2, 36.1]
    ],
    1,
    1
  );
  // مضيق البوسفور والدردنيل (البحر المتوسط <-> البحر الأسود)
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [24.8, 39.4],
      [25.7, 39.8]
    ],
    1,
    1
  );
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [25.7, 39.8],
      [26.5, 40.3],
      [27.9, 40.7],
      [29.1, 41.2]
    ],
    0,
    3
  );
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [29.1, 41.2],
      [30.3, 42.0]
    ],
    1,
    1
  );
  // مضيق ملقا وسنغافورة
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [97.5, 6.5],
      [99.8, 4.2],
      [101.8, 2.2],
      [103.8, 1.2],
      [105.2, 1.8]
    ],
    1,
    1
  );
  // مضيق صقلية ومضيق أوترانتو
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [9.5, 37.5],
      [11.5, 37.2],
      [13.5, 36.8]
    ],
    1,
    1
  );
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [18.2, 39.0],
      [19.0, 40.2],
      [18.5, 41.5]
    ],
    1,
    1
  );
  // المضايق الدنماركية (بحر الشمال <-> بحر البلطيق)
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [8.0, 57.5],
      [10.8, 57.6]
    ],
    1,
    1
  );
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [10.8, 57.6],
      [11.5, 56.4],
      [12.7, 55.6]
    ],
    0,
    3
  );
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [12.7, 55.6],
      [14.5, 55.2]
    ],
    1,
    1
  );
  // القنال الإنجليزي ومضيق دوفر
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [-3.0, 49.5],
      [0.5, 50.4],
      [1.6, 51.1],
      [3.0, 52.2]
    ],
    1,
    1
  );
  // مضيق بيرنغ ومضيق كوريا ومضيق تايوان
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [-171.0, 64.5],
      [-169.0, 65.8],
      [-168.0, 67.2]
    ],
    1,
    1
  );
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [126.5, 33.5],
      [129.3, 34.7],
      [131.5, 36.0]
    ],
    1,
    1
  );
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [118.0, 23.0],
      [119.8, 24.5],
      [121.2, 26.2]
    ],
    1,
    1
  );

  const hitTest = createHitTester(countriesFc.features, regionIds, projection, width, height);

  return {
    id: 'world_live',
    title: 'خريطة العالم التفاعلية',
    kind: 'geopolitical',
    width,
    height,
    cellSize,
    cols,
    rows,
    navGrid,
    svgOrUrl: canvas.toDataURL('image/png'),
    unitScaleMultiplier: 0.32,
    anchors,
    zones,
    geoLevel: 'world',
    regions,
    hitTest
  };
}

async function fetchAdm1GeoJson(iso3: string): Promise<GeoJSON.FeatureCollection> {
  if (adm1Cache.has(iso3)) return adm1Cache.get(iso3)!;

  // المحاولة 1: خادم media.githubusercontent.com مباشرة (يدعم Git LFS و CORS ويعيد GeoJSON فعلي)
  const directUrl = `https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/main/releaseData/gbOpen/${iso3}/ADM1/geoBoundaries-${iso3}-ADM1_simplified.geojson`;
  try {
    const res = await fetch(directUrl);
    if (res.ok) {
      const json = (await res.json()) as GeoJSON.FeatureCollection;
      if (json?.features?.length) {
        adm1Cache.set(iso3, json);
        return json;
      }
    }
  } catch {
    // متابعة للبديل
  }

  // المحاولة 2: API الرسمي لـ geoBoundaries مع تحويل github raw إلى media.githubusercontent لدعم CORS
  try {
    const metaRes = await fetch(`https://www.geoboundaries.org/api/current/gbOpen/${iso3}/ADM1/`);
    if (metaRes.ok) {
      const meta = await metaRes.json();
      const rawGjUrl: string | undefined = meta?.simplifiedGeometryGeoJSON || meta?.gjDownloadURL;
      const gjUrl = rawGjUrl?.replace(
        /^https:\/\/github\.com\/([^/]+\/[^/]+)\/raw\//,
        'https://media.githubusercontent.com/media/$1/'
      );
      if (gjUrl) {
        const gjRes = await fetch(gjUrl);
        if (gjRes.ok) {
          const json = (await gjRes.json()) as GeoJSON.FeatureCollection;
          if (json?.features?.length) {
            adm1Cache.set(iso3, json);
            return json;
          }
        }
      }
    }
  } catch {
    // متابعة للبديل المحلي
  }

  // البديل المضمون (للدول الصغيرة جدًا أو دون اتصال): استخدام حدود الدولة نفسها من world-atlas
  const topo = worldAtlas as any;
  const countriesFc = feature(topo, topo.objects.countries) as unknown as GeoJSON.FeatureCollection;
  const match = countriesFc.features.find((f) => {
    const rawId = f.id !== undefined ? String(f.id).padStart(3, '0') : '';
    const a2 = rawId ? countries.numericToAlpha2(rawId) : undefined;
    return (a2 ? countries.alpha2ToAlpha3(a2) : '') === iso3;
  });
  return {
    type: 'FeatureCollection',
    features: match ? [match] : []
  };
}

function rewindPolygonRings(rings: number[][][]): number[][][] {
  return rings.map((ring, idx) => {
    const area = geoArea({ type: 'Polygon', coordinates: [ring] });
    const isOuter = idx === 0;
    const needsReverse = isOuter ? area > 2 * Math.PI : area < 2 * Math.PI;
    return needsReverse ? [...ring].reverse() : ring;
  });
}

export function rewindGeoJsonForD3(fc: GeoJSON.FeatureCollection): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: fc.features.map((f) => {
      if (!f.geometry) return f;
      if (f.geometry.type === 'Polygon') {
        return {
          ...f,
          geometry: { ...f.geometry, coordinates: rewindPolygonRings(f.geometry.coordinates) }
        };
      }
      if (f.geometry.type === 'MultiPolygon') {
        return {
          ...f,
          geometry: {
            ...f.geometry,
            coordinates: f.geometry.coordinates.map((poly) => rewindPolygonRings(poly))
          }
        };
      }
      return f;
    })
  };
}

export async function buildCountryProvincesMapPack(iso3: string, displayTitle: string): Promise<MapPack> {
  const width = 1200;
  const height = 800;
  const cellSize = 8;

  const rawFc = await fetchAdm1GeoJson(iso3);
  if (!rawFc.features.length) {
    throw new Error(`تعذر العثور على حدود المحافظات للدولة ${iso3}`);
  }
  const fc = rewindGeoJsonForD3(rawFc);

  const [cLon] = geoCentroid(fc);
  const projection = geoMercator()
    .rotate([-cLon, 0])
    .fitExtent(
      [
        [65, 65],
        [width - 65, height - 65]
      ],
      fc
    );

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(width / 2, height / 2, 60, width / 2, height / 2, width * 0.7);
  grad.addColorStop(0, '#0d223a');
  grad.addColorStop(1, '#061221');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  const pathGen = geoPath(projection, ctx);

  ctx.beginPath();
  pathGen(geoGraticule10());
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const regions: Record<string, GeoRegionItem> = {};
  const zones: Record<string, MapZoneDef> = {};
  const anchors: Record<string, Point & { label?: string }> = {};
  const regionIds: string[] = [];
  const usedIds = new Set<string>();

  const palette = ['#1b2b3e', '#203247', '#182637', '#24384f'];

  fc.features.forEach((f, idx) => {
    const rawName = (f.properties?.shapeName as string) || (f.properties?.name as string) || `Province ${idx + 1}`;
    let id = slugify(rawName);
    while (usedIds.has(id)) id = `${id}_${idx}`;
    usedIds.add(id);
    regionIds.push(id);

    ctx.beginPath();
    pathGen(f);
    ctx.fillStyle = palette[idx % palette.length];
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    const cent = pathGen.centroid(f);
    const b = pathGen.bounds(f);
    const polygons = f.geometry ? extractProjectedPolygons(f.geometry, projection, width) : [];

    if (Number.isFinite(cent[0]) && Number.isFinite(cent[1])) {
      regions[id] = {
        id,
        name: rawName,
        center: { x: cent[0], y: cent[1] },
        bounds: { minX: b[0][0], minY: b[0][1], maxX: b[1][0], maxY: b[1][1] },
        polygons
      };
      anchors[id] = { x: Math.round(cent[0]), y: Math.round(cent[1]), label: rawName };
      if (polygons[0]) {
        zones[id] = { id, label: rawName, polygon: polygons[0] };
      }

      // كتابة اسم المحافظة أسفل نقطة المرسى لتجنب التداخل مع معرّف المرسى العلوي
      ctx.font = '600 11px "IBM Plex Sans Arabic", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(226, 232, 240, 0.85)';
      ctx.fillText(rawName, cent[0], cent[1] + 19);
    }
  });

  const { cols, rows, navGrid } = rasterizeLandNavGrid(fc, projection, width, height, cellSize);
  const hitTest = createHitTester(fc.features, regionIds, projection, width, height);

  return {
    id: `country_${iso3.toLowerCase()}`,
    title: `${displayTitle} — المحافظات`,
    kind: 'geopolitical',
    width,
    height,
    cellSize,
    cols,
    rows,
    navGrid,
    svgOrUrl: canvas.toDataURL('image/png'),
    unitScaleMultiplier: 0.55,
    anchors,
    zones,
    geoLevel: 'country',
    countryIso3: iso3,
    regions,
    hitTest
  };
}
