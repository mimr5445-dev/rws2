import { ActorPack, GeoRegionItem, MapPack, Point, SavedScenarioRecord } from '../core/types';
import { CountryProfile } from '../countries/countryTypes';

const DB_NAME = 'rw_studio_db';
const DB_VERSION = 3;

function pointInPoly(pt: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect = yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function createPolygonHitTester(regions: Record<string, GeoRegionItem>): (pt: Point) => string | null {
  const list = Object.values(regions);
  return (pt: Point) => {
    for (const r of list) {
      if (pt.x < r.bounds.minX || pt.x > r.bounds.maxX || pt.y < r.bounds.minY || pt.y > r.bounds.maxY) continue;
      for (const poly of r.polygons) {
        if (poly.length >= 3 && pointInPoly(pt, poly)) return r.id;
      }
    }
    return null;
  };
}

export function rehydrateMapPack(map: MapPack): MapPack {
  if (!map.hitTest && map.regions) {
    map.hitTest = createPolygonHitTester(map.regions);
  }
  return map;
}

class StudioDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private isSupported(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  private open(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('maps')) db.createObjectStore('maps', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('actors')) db.createObjectStore('actors', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('scenarios')) db.createObjectStore('scenarios', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
        if (!db.objectStoreNames.contains('countries')) db.createObjectStore('countries', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('world_entities')) db.createObjectStore('world_entities', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('world_relationships')) db.createObjectStore('world_relationships', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('world_events')) db.createObjectStore('world_events', { keyPath: 'id' });
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => {
          db.close();
          this.dbPromise = null;
        };
        db.onclose = () => {
          this.dbPromise = null;
        };
        resolve(db);
      };
      req.onerror = () => {
        this.dbPromise = null;
        reject(req.error);
      };
    });
    return this.dbPromise;
  }

  private async getAll<T>(storeName: string): Promise<T[]> {
    if (!this.isSupported()) return [];
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve((req.result as T[]) ?? []);
      req.onerror = () => reject(req.error);
    });
  }

  private async put(storeName: string, value: unknown): Promise<void> {
    if (!this.isSupported()) return;
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(value);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private async del(storeName: string, key: string): Promise<void> {
    if (!this.isSupported()) return;
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async loadAllMaps(): Promise<MapPack[]> {
    const list = await this.getAll<MapPack>('maps');
    return list.map(rehydrateMapPack);
  }

  async saveMap(map: MapPack): Promise<void> {
    // إزالة الدالة hitTest قبل التخزين لأن IndexedDB لا يخزن الدوال
    const { hitTest: _ignore, ...serializable } = map;
    await this.put('maps', serializable);
  }

  async loadAllActors(): Promise<ActorPack[]> {
    return this.getAll<ActorPack>('actors');
  }

  async saveActor(actor: ActorPack): Promise<void> {
    await this.put('actors', actor);
  }

  async loadAllScenarios(): Promise<SavedScenarioRecord[]> {
    const list = await this.getAll<SavedScenarioRecord>('scenarios');
    return list.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async saveScenario(rec: SavedScenarioRecord): Promise<void> {
    await this.put('scenarios', rec);
  }

  async deleteScenario(id: string): Promise<void> {
    await this.del('scenarios', id);
  }

  async getSetting<T>(key: string): Promise<T | undefined> {
    if (!this.isSupported()) return undefined;
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readonly');
      const req = tx.objectStore('settings').get(key);
      req.onsuccess = () => resolve(req.result?.value as T | undefined);
      req.onerror = () => reject(req.error);
    });
  }

  async setSetting(key: string, value: unknown): Promise<void> {
    await this.put('settings', { key, value });
  }

  async loadAllCountries(): Promise<CountryProfile[]> {
    return this.getAll<CountryProfile>('countries');
  }

  async saveCountry(country: CountryProfile): Promise<void> {
    await this.put('countries', country);
  }

  async deleteCountry(id: string): Promise<void> {
    await this.del('countries', id);
  }
}

export const studioDb = new StudioDatabase();
