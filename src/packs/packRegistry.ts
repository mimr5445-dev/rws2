import { ActorPack, ActorTemplate, MapPack, PackBundle, SavedScenarioRecord } from '../core/types';
import { buildWorldMapPack } from '../maps/worldGeoEngine';
import { studioDb } from '../storage/studioDb';
import { STUDIO_ACTORS, STUDIO_TEMPLATES } from './studioUnits';
import { validatePackBundle } from './packSchema';

export const ACTOR_TEMPLATES: Record<string, ActorTemplate> = STUDIO_TEMPLATES;

const LEGACY_PRESET_IDS = new Set([
  'preset_air_sea',
  'preset_world',
  'preset_strait',
  'preset_valley'
]);

export class PackRegistry {
  public maps: Record<string, MapPack> = {};
  public actors: Record<string, ActorPack> = {};
  public scenarios: SavedScenarioRecord[] = [];

  constructor(private useStorage = true) {
    if (typeof document !== 'undefined') {
      const worldMap = buildWorldMapPack();
      this.maps[worldMap.id] = worldMap;
    }
    for (const [k, a] of Object.entries(STUDIO_ACTORS)) {
      this.actors[k] = { ...a };
    }
  }

  async init(presetScenarios: SavedScenarioRecord[] = []): Promise<void> {
    if (typeof document !== 'undefined' && !this.maps.world_live) {
      const worldMap = buildWorldMapPack();
      this.maps[worldMap.id] = worldMap;
    }

    if (!this.useStorage) {
      this.scenarios = [...presetScenarios];
      return;
    }

    // تحميل محافظات الدول فقط (مع تجاهل الخرائط القديمة غير العالمية)
    const savedMaps = await studioDb.loadAllMaps();
    for (const m of savedMaps) {
      if (m.geoLevel === 'country') {
        this.maps[m.id] = m;
      }
    }

    // الإبقاء على السيناريوهات التي أنشأها المستخدم فقط وحذف أي سيناريوهات مسبقة قديمة
    const savedScenarios = await studioDb.loadAllScenarios();
    const userScenarios: SavedScenarioRecord[] = [];
    for (const s of savedScenarios) {
      if (s.source === 'preset' || LEGACY_PRESET_IDS.has(s.id)) {
        await studioDb.deleteScenario(s.id);
      } else {
        userScenarios.push(s);
      }
    }
    this.scenarios = userScenarios.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async saveCustomMap(map: MapPack): Promise<void> {
    this.maps[map.id] = map;
    if (this.useStorage) {
      await studioDb.saveMap(map);
    }
  }

  async saveCustomActor(
    actor: Partial<ActorPack> & { id: string; label: string; svg: string }
  ): Promise<ActorPack> {
    const tpl = actor.extends ? ACTOR_TEMPLATES[actor.extends] : ACTOR_TEMPLATES._person;
    const resolved: ActorPack = { ...(tpl ?? ACTOR_TEMPLATES._person), ...actor };
    this.actors[resolved.id] = resolved;
    if (this.useStorage) {
      await studioDb.saveActor(resolved);
    }
    return resolved;
  }

  async saveScenarioRecord(rec: SavedScenarioRecord): Promise<void> {
    if (this.useStorage) {
      await studioDb.saveScenario(rec);
    }
    this.scenarios = [rec, ...this.scenarios.filter((s) => s.id !== rec.id)].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async deleteScenarioRecord(id: string): Promise<void> {
    if (this.useStorage) {
      await studioDb.deleteScenario(id);
    }
    this.scenarios = this.scenarios.filter((s) => s.id !== id);
  }

  async importBundle(bundle: PackBundle): Promise<{ mapsAdded: number; actorsAdded: number }> {
    const errors = validatePackBundle(bundle);
    if (errors.length > 0) throw new Error(errors.slice(0, 5).join(' | '));
    for (const m of bundle.maps ?? []) await this.saveCustomMap(m);
    for (const a of bundle.actors ?? []) await this.saveCustomActor(a);
    return { mapsAdded: bundle.maps?.length ?? 0, actorsAdded: bundle.actors?.length ?? 0 };
  }

  exportCurrentBundle(): PackBundle {
    const maps = Object.values(this.maps)
      .filter((m) => !m.geoLevel)
      .map(({ hitTest: _ht, regions: _regs, ...rest }) => rest);
    return {
      maps,
      actors: Object.values(this.actors)
    };
  }
}
