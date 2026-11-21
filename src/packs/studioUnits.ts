import { ActorPack, ActorTemplate, UnitAbilityDef } from '../core/types';

export const STUDIO_TEMPLATES: Record<string, ActorTemplate> = {
  _person: { domain: 'land', kind: 'person', speed: 62, turnRate: 8, scale: 36, radius: 14 },
  _vehicle: { domain: 'land', kind: 'vehicle', speed: 94, turnRate: 2.8, scale: 46, radius: 20 },
  _ship: { domain: 'sea', kind: 'ship', speed: 78, turnRate: 1.5, scale: 62, radius: 24 },
  _carrier: { domain: 'sea', kind: 'ship', speed: 52, turnRate: 0.95, scale: 98, radius: 38 },
  _sub: { domain: 'sea', kind: 'ship', speed: 68, turnRate: 1.8, scale: 62, radius: 22 },
  _air: { domain: 'air', kind: 'air', speed: 220, turnRate: 3.2, scale: 54, radius: 23 },
  _heli: { domain: 'air', kind: 'air', speed: 145, turnRate: 3.8, scale: 52, radius: 22 },
  _building: { domain: 'land', kind: 'building', speed: 0, turnRate: 0, scale: 60, radius: 26 }
};

function defineUnit(
  id: string,
  label: string,
  templateName: keyof typeof STUDIO_TEMPLATES,
  overrides: Partial<ActorTemplate>,
  ability: UnitAbilityDef,
  svg: string
): ActorPack {
  return {
    id,
    label,
    extends: templateName,
    ...STUDIO_TEMPLATES[templateName],
    ...overrides,
    ability,
    svg
  };
}

export const STUDIO_ACTORS: Record<string, ActorPack> = {
  // ==========================================
  // 1. المشاة والقيادة (Infantry & Personnel)
  // ==========================================
  infantry_squad: defineUnit(
    'infantry_squad',
    'فرقة مشاة',
    '_person',
    { speed: 64, scale: 40, radius: 16 },
    {
      mode: 'bullet',
      label: 'إطلاق رصاص',
      shortLabel: 'رصاص',
      category: 'infantry',
      accentColor: '#f59e0b',
      radius: 16
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
      <defs>
        <linearGradient id="vestG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#65a30d"/>
          <stop offset="100%" stop-color="#365314"/>
        </linearGradient>
        <linearGradient id="helmG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#84cc16"/>
          <stop offset="100%" stop-color="#3f6212"/>
        </linearGradient>
      </defs>
      <!-- Shadow base -->
      <ellipse cx="40" cy="64" rx="26" ry="8" fill="#090f1a" opacity="0.45"/>
      <!-- Left rifleman -->
      <g stroke="#090f1a" stroke-width="2" stroke-linejoin="round">
        <rect x="13" y="42" width="16" height="17" rx="5" fill="url(#vestG)"/>
        <circle cx="21" cy="34" r="7.5" fill="url(#helmG)"/>
        <path d="M14.5 34 C16 29 26 29 27.5 34 Z" fill="#4d7c0f"/>
        <rect x="23" y="45" width="16" height="3.2" rx="1" fill="#1e293b" transform="rotate(-18 23 45)"/>
      </g>
      <!-- Right rifleman -->
      <g stroke="#090f1a" stroke-width="2" stroke-linejoin="round">
        <rect x="51" y="42" width="16" height="17" rx="5" fill="url(#vestG)"/>
        <circle cx="59" cy="34" r="7.5" fill="url(#helmG)"/>
        <path d="M52.5 34 C54 29 64 29 65.5 34 Z" fill="#4d7c0f"/>
        <rect x="46" y="45" width="16" height="3.2" rx="1" fill="#1e293b" transform="rotate(-18 46 45)"/>
      </g>
      <!-- Point Squad Leader (front center) -->
      <g stroke="#090f1a" stroke-width="2.2" stroke-linejoin="round">
        <rect x="30" y="29" width="20" height="22" rx="6" fill="url(#vestG)"/>
        <rect x="34" y="34" width="12" height="10" rx="2" fill="#4d7c0f" stroke-width="1.2"/>
        <circle cx="40" cy="20" r="8.8" fill="#f3d1a4"/>
        <!-- Tactical Helmet + Goggles -->
        <path d="M30.5 21 C30.5 11.5 49.5 11.5 49.5 21 C46 18.5 34 18.5 30.5 21 Z" fill="url(#helmG)"/>
        <rect x="33" y="15" width="14" height="3.8" rx="1.5" fill="#0f172a"/>
        <rect x="34.5" y="16" width="4.5" height="2" rx="0.5" fill="#38bdf8" stroke="none"/>
        <rect x="41" y="16" width="4.5" height="2" rx="0.5" fill="#38bdf8" stroke="none"/>
        <!-- Assault Rifle -->
        <rect x="43" y="34" width="22" height="4" rx="1.2" fill="#0f172a" transform="rotate(-20 43 34)"/>
        <rect x="55" y="29" width="7" height="2.2" fill="#64748b" stroke="none" transform="rotate(-20 43 34)"/>
      </g>
    </svg>`
  ),

  special_forces: defineUnit(
    'special_forces',
    'قوات خاصة',
    '_person',
    { speed: 74, scale: 40, radius: 16 },
    {
      mode: 'bullet',
      label: 'رشق دقيق',
      shortLabel: 'قنص/رشق',
      category: 'infantry',
      accentColor: '#38bdf8',
      radius: 15
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
      <ellipse cx="40" cy="64" rx="22" ry="7.5" fill="#090f1a" opacity="0.5"/>
      <g stroke="#090f1a" stroke-width="2" stroke-linejoin="round">
        <!-- Rear Operator -->
        <rect x="16" y="38" width="18" height="20" rx="5" fill="#1e293b"/>
        <circle cx="25" cy="28" r="8" fill="#334155"/>
        <rect x="20" y="22" width="10" height="4" rx="1.5" fill="#0284c7"/>
        <line x1="27" y1="43" x2="44" y2="35" stroke="#0f172a" stroke-width="3.6" stroke-linecap="round"/>
        <!-- Lead Operator with Quad-NVG & Suppressed Carbine -->
        <rect x="36" y="30" width="22" height="24" rx="6" fill="#0f172a"/>
        <rect x="41" y="35" width="12" height="12" rx="2" fill="#334155" stroke-width="1.3"/>
        <circle cx="47" cy="20" r="8.8" fill="#1e293b"/>
        <path d="M38 19 C39 10 55 10 56 19 Z" fill="#334155"/>
        <!-- Quad NVG lenses -->
        <circle cx="42" cy="17" r="2.2" fill="#22d3ee"/>
        <circle cx="46" cy="16.5" r="2.2" fill="#22d3ee"/>
        <circle cx="50" cy="16.5" r="2.2" fill="#22d3ee"/>
        <circle cx="54" cy="17" r="2.2" fill="#22d3ee"/>
        <!-- Suppressed rifle -->
        <rect x="48" y="35" width="22" height="4" rx="1.2" fill="#334155" transform="rotate(-14 48 35)"/>
        <rect x="65" y="34.5" width="9" height="4.8" rx="1.5" fill="#475569" transform="rotate(-14 48 35)"/>
      </g>
    </svg>`
  ),

  diplomat_envoy: defineUnit(
    'diplomat_envoy',
    'وفد دبلوماسي',
    '_person',
    { speed: 58, scale: 38, radius: 15 },
    {
      mode: 'scan',
      label: 'بيان / إشارة',
      shortLabel: 'بيان',
      category: 'infantry',
      accentColor: '#a855f7',
      radius: 90
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
      <defs>
        <linearGradient id="envoySuit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#1e293b"/>
          <stop offset="100%" stop-color="#020617"/>
        </linearGradient>
      </defs>
      <ellipse cx="40" cy="66" rx="20" ry="7" fill="#090f1a" opacity="0.45"/>
      <circle cx="40" cy="22" r="10.5" fill="#f3d1a4" stroke="#090f1a" stroke-width="2.4"/>
      <path d="M30 19 C32 10 48 10 50 19 C45 16 35 16 30 19 Z" fill="#1e293b"/>
      <path d="M20 62 C20 40 27 34 40 34 C53 34 60 40 60 62 Z" fill="url(#envoySuit)" stroke="#090f1a" stroke-width="2.4" stroke-linejoin="round"/>
      <polygon points="34,34 40,48 46,34" fill="#f8fafc"/>
      <polygon points="38.2,35 40,49 41.8,35" fill="#dc2626"/>
      <rect x="52" y="48" width="15" height="11" rx="2" fill="#92400e" stroke="#090f1a" stroke-width="2"/>
      <rect x="57" y="45" width="5" height="3" fill="none" stroke="#f59e0b" stroke-width="1.5"/>
    </svg>`
  ),

  // ==========================================
  // 2. المدرعات والمدفعية والصواريخ (Armor & Artillery)
  // ==========================================
  mbt_tank: defineUnit(
    'mbt_tank',
    'دبابة قتال (أبرامز)',
    '_vehicle',
    { speed: 82, turnRate: 2.6, scale: 50, radius: 22 },
    {
      mode: 'shell',
      label: 'قذيفة مدفع',
      shortLabel: 'قذيفة',
      category: 'armor',
      accentColor: '#f97316',
      radius: 36
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 80">
      <defs>
        <linearGradient id="abramsHull" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#a89060"/>
          <stop offset="55%" stop-color="#c2a974"/>
          <stop offset="100%" stop-color="#8c7548"/>
        </linearGradient>
        <linearGradient id="abramsTurret" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#d6be8a"/>
          <stop offset="100%" stop-color="#967f52"/>
        </linearGradient>
      </defs>
      <!-- Heavy Armored Tracks & Skirts -->
      <rect x="10" y="12" width="60" height="12" rx="3" fill="#1e293b" stroke="#090f1a" stroke-width="2.2"/>
      <rect x="10" y="56" width="60" height="12" rx="3" fill="#1e293b" stroke="#090f1a" stroke-width="2.2"/>
      <path d="M16 12 V24 M24 12 V24 M32 12 V24 M40 12 V24 M48 12 V24 M56 12 V24 M64 12 V24 M16 56 V68 M24 56 V68 M32 56 V68 M40 56 V68 M48 56 V68 M56 56 V68 M64 56 V68" stroke="#0f172a" stroke-width="1.6"/>
      <!-- Side Armor Skirts -->
      <rect x="12" y="16" width="57" height="7" rx="1.5" fill="#9c8556" stroke="#090f1a" stroke-width="1.4"/>
      <rect x="12" y="57" width="57" height="7" rx="1.5" fill="#9c8556" stroke="#090f1a" stroke-width="1.4"/>
      <!-- Main Hull & Rear Turbine Grilles -->
      <rect x="13" y="21" width="55" height="38" rx="3" fill="url(#abramsHull)" stroke="#090f1a" stroke-width="2.2"/>
      <rect x="15" y="25" width="14" height="30" rx="2" fill="#44403c" stroke="#090f1a" stroke-width="1.2"/>
      <path d="M18 27 V53 M21 27 V53 M24 27 V53 M27 27 V53" stroke="#78716c" stroke-width="1.2"/>
      <!-- Sloped Front Glacis & Headlights -->
      <polygon points="56,22 68,25 68,55 56,58" fill="#b39b66" stroke="#090f1a" stroke-width="1.4"/>
      <rect x="65" y="23" width="3" height="4.5" fill="#fef08a"/>
      <rect x="65" y="52.5" width="3" height="4.5" fill="#fef08a"/>
      <!-- 120mm M256 Smoothbore Cannon -->
      <rect x="48" y="37.8" width="44" height="4.4" rx="1" fill="#9c8556" stroke="#090f1a" stroke-width="1.6"/>
      <rect x="62" y="36.3" width="9" height="7.4" rx="1.8" fill="#b39b66" stroke="#090f1a" stroke-width="1.4"/>
      <rect x="88" y="37" width="4" height="6" rx="1" fill="#334155" stroke="#090f1a" stroke-width="1.2"/>
      <!-- Angular Wedge Turret -->
      <polygon points="18,26 42,22 57,31 57,49 42,58 18,54" fill="url(#abramsTurret)" stroke="#090f1a" stroke-width="2.2" stroke-linejoin="round"/>
      <!-- Bustle Rack, Cupola, CROWS & Thermal Optics -->
      <rect x="18" y="29" width="8" height="22" fill="#57534e" stroke="#090f1a" stroke-width="1.2"/>
      <circle cx="38" cy="33" r="4.8" fill="#8c7548" stroke="#090f1a" stroke-width="1.5"/>
      <circle cx="38" cy="47" r="4.2" fill="#8c7548" stroke="#090f1a" stroke-width="1.5"/>
      <rect x="46" y="29" width="5" height="4" rx="1" fill="#38bdf8" stroke="#090f1a" stroke-width="1"/>
      <line x1="22" y1="29" x2="10" y2="23" stroke="#090f1a" stroke-width="1.3"/>
    </svg>`
  ),

  ifv_bradley: defineUnit(
    'ifv_bradley',
    'مدرعة قتالية (برادلي)',
    '_vehicle',
    { speed: 96, turnRate: 3.1, scale: 46, radius: 20 },
    {
      mode: 'bullet',
      label: 'مدفع رشاش 25مم',
      shortLabel: 'رشاش',
      category: 'armor',
      accentColor: '#eab308',
      radius: 18
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 88 76">
      <defs>
        <linearGradient id="ifvBody" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#4d5d43"/>
          <stop offset="100%" stop-color="#6b7e5c"/>
        </linearGradient>
      </defs>
      <rect x="11" y="13" width="58" height="10" rx="2.5" fill="#1e293b" stroke="#090f1a" stroke-width="2"/>
      <rect x="11" y="53" width="58" height="10" rx="2.5" fill="#1e293b" stroke="#090f1a" stroke-width="2"/>
      <rect x="12" y="19" width="56" height="38" rx="4" fill="url(#ifvBody)" stroke="#090f1a" stroke-width="2.2"/>
      <!-- Rear Troop Hatch & Side ERA tiles -->
      <rect x="14" y="25" width="12" height="26" rx="2" fill="#3b4733" stroke="#090f1a" stroke-width="1.3"/>
      <rect x="28" y="20" width="32" height="3" fill="#7c906d" stroke="#090f1a" stroke-width="0.9"/>
      <rect x="28" y="53" width="32" height="3" fill="#7c906d" stroke="#090f1a" stroke-width="0.9"/>
      <!-- 25mm Bushmaster Autocannon -->
      <rect x="46" y="36.5" width="36" height="3" rx="1" fill="#334155" stroke="#090f1a" stroke-width="1.3"/>
      <!-- Turret + Twin TOW Launcher Box -->
      <polygon points="30,27 49,26 55,34 55,42 49,50 30,49" fill="#5e7050" stroke="#090f1a" stroke-width="2"/>
      <rect x="33" y="22" width="14" height="6" rx="1.5" fill="#3f4c36" stroke="#090f1a" stroke-width="1.4"/>
      <circle cx="40" cy="38" r="4.5" fill="#46543c" stroke="#090f1a" stroke-width="1.4"/>
      <rect x="48" y="31" width="4" height="3" fill="#38bdf8"/>
    </svg>`
  ),

  spg_artillery: defineUnit(
    'spg_artillery',
    'مدفعية ذاتية (155مم)',
    '_vehicle',
    { speed: 68, turnRate: 2.2, scale: 52, radius: 22 },
    {
      mode: 'artillery',
      label: 'قصف مدفعي',
      shortLabel: 'مدفعية',
      category: 'armor',
      accentColor: '#fb923c',
      radius: 58
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 104 80">
      <rect x="10" y="14" width="58" height="10" rx="2.5" fill="#1e293b" stroke="#090f1a" stroke-width="2"/>
      <rect x="10" y="56" width="58" height="10" rx="2.5" fill="#1e293b" stroke="#090f1a" stroke-width="2"/>
      <!-- Hull + Rear Recoil Spades -->
      <rect x="6" y="24" width="7" height="10" rx="1" fill="#334155" stroke="#090f1a" stroke-width="1.4"/>
      <rect x="6" y="46" width="7" height="10" rx="1" fill="#334155" stroke="#090f1a" stroke-width="1.4"/>
      <rect x="12" y="20" width="56" height="40" rx="3.5" fill="#5c6b50" stroke="#090f1a" stroke-width="2.2"/>
      <!-- Driver Cab + Engine Grilles -->
      <rect x="52" y="23" width="13" height="13" rx="2" fill="#475569" stroke="#090f1a" stroke-width="1.3"/>
      <rect x="58" y="25" width="4" height="9" fill="#38bdf8"/>
      <!-- Long 155mm Howitzer Barrel & Muzzle Brake -->
      <rect x="44" y="37.5" width="52" height="5" rx="1" fill="#475569" stroke="#090f1a" stroke-width="1.6"/>
      <rect x="92" y="35.5" width="7" height="9" rx="1.5" fill="#334155" stroke="#090f1a" stroke-width="1.4"/>
      <!-- Large Rear Howitzer Turret -->
      <rect x="15" y="24" width="32" height="32" rx="4" fill="#708261" stroke="#090f1a" stroke-width="2.2"/>
      <rect x="17" y="29" width="8" height="22" fill="#46523d" stroke="#090f1a" stroke-width="1.2"/>
      <circle cx="33" cy="34" r="4" fill="#3f4a37" stroke="#090f1a" stroke-width="1.3"/>
      <circle cx="33" cy="46" r="4" fill="#3f4a37" stroke="#090f1a" stroke-width="1.3"/>
    </svg>`
  ),

  sam_patriot: defineUnit(
    'sam_patriot',
    'دفاع جوي (باتريوت)',
    '_vehicle',
    { speed: 66, turnRate: 2.1, scale: 52, radius: 22 },
    {
      mode: 'interceptor',
      label: 'صاروخ اعتراضي',
      shortLabel: 'اعتراض',
      category: 'armor',
      accentColor: '#38bdf8',
      radius: 42
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 72">
      <!-- Wheels -->
      <g fill="#0f172a" stroke="#020617" stroke-width="1.2">
        <rect x="12" y="10" width="12" height="5" rx="1.5"/><rect x="34" y="10" width="12" height="5" rx="1.5"/><rect x="66" y="10" width="12" height="5" rx="1.5"/>
        <rect x="12" y="57" width="12" height="5" rx="1.5"/><rect x="34" y="57" width="12" height="5" rx="1.5"/><rect x="66" y="57" width="12" height="5" rx="1.5"/>
      </g>
      <!-- Tractor & Semi-trailer -->
      <rect x="60" y="15" width="24" height="42" rx="4" fill="#64748b" stroke="#090f1a" stroke-width="2"/>
      <rect x="76" y="19" width="5" height="34" rx="1" fill="#38bdf8" stroke="#090f1a" stroke-width="1.1"/>
      <rect x="9" y="16" width="49" height="40" rx="3" fill="#475569" stroke="#090f1a" stroke-width="2"/>
      <!-- 4 Patriot Interceptor Canisters -->
      <rect x="14" y="19" width="38" height="7" rx="1.5" fill="#94a3b8" stroke="#090f1a" stroke-width="1.4"/>
      <rect x="14" y="28" width="38" height="7" rx="1.5" fill="#cbd5e1" stroke="#090f1a" stroke-width="1.4"/>
      <rect x="14" y="37" width="38" height="7" rx="1.5" fill="#cbd5e1" stroke="#090f1a" stroke-width="1.4"/>
      <rect x="14" y="46" width="38" height="7" rx="1.5" fill="#94a3b8" stroke="#090f1a" stroke-width="1.4"/>
      <!-- Nose Caps & Phased Array Radar -->
      <line x1="48" y1="19" x2="48" y2="53" stroke="#38bdf8" stroke-width="2"/>
      <rect x="52" y="27" width="8" height="18" rx="2" fill="#0284c7" stroke="#090f1a" stroke-width="1.3"/>
    </svg>`
  ),

  ballistic_tel: defineUnit(
    'ballistic_tel',
    'راجمة صواريخ بالستية',
    '_vehicle',
    { speed: 62, turnRate: 2.0, scale: 58, radius: 25 },
    {
      mode: 'missile',
      label: 'إطلاق صاروخ بالستي',
      shortLabel: 'صاروخ بالستي',
      category: 'armor',
      accentColor: '#ef4444',
      radius: 82
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 104 68">
      <defs>
        <linearGradient id="telHullG" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#374151"/>
          <stop offset="100%" stop-color="#4b5563"/>
        </linearGradient>
        <linearGradient id="icbmBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f8fafc"/>
          <stop offset="55%" stop-color="#cbd5e1"/>
          <stop offset="100%" stop-color="#64748b"/>
        </linearGradient>
      </defs>
      <!-- 8x8 Heavy Off-road Tires -->
      <g fill="#0f172a" stroke="#020617" stroke-width="1.3">
        <rect x="10" y="9" width="13" height="6" rx="1.5"/><rect x="29" y="9" width="13" height="6" rx="1.5"/>
        <rect x="49" y="9" width="13" height="6" rx="1.5"/><rect x="70" y="9" width="13" height="6" rx="1.5"/>
        <rect x="10" y="53" width="13" height="6" rx="1.5"/><rect x="29" y="53" width="13" height="6" rx="1.5"/>
        <rect x="49" y="53" width="13" height="6" rx="1.5"/><rect x="70" y="53" width="13" height="6" rx="1.5"/>
      </g>
      <!-- 8x8 Chassis -->
      <rect x="8" y="14" width="84" height="40" rx="4" fill="url(#telHullG)" stroke="#090f1a" stroke-width="2.3"/>
      <!-- Twin Armored Forward Cab -->
      <rect x="70" y="16" width="20" height="14" rx="2.5" fill="#525f50" stroke="#090f1a" stroke-width="1.6"/>
      <rect x="70" y="38" width="20" height="14" rx="2.5" fill="#525f50" stroke="#090f1a" stroke-width="1.6"/>
      <rect x="82" y="18" width="4.5" height="10" rx="1" fill="#38bdf8"/>
      <rect x="82" y="40" width="4.5" height="10" rx="1" fill="#38bdf8"/>
      <!-- Launch Cradle -->
      <rect x="12" y="22" width="58" height="24" rx="3" fill="#1e293b" stroke="#090f1a" stroke-width="1.6"/>
      <!-- Ballistic Missile -->
      <polygon points="9,21 19,25 19,43 9,47 13,34" fill="#475569" stroke="#090f1a" stroke-width="1.4"/>
      <rect x="15" y="26" width="58" height="16" rx="2.5" fill="url(#icbmBody)" stroke="#090f1a" stroke-width="1.8"/>
      <rect x="36" y="26" width="4.5" height="16" fill="#334155"/>
      <rect x="57" y="26" width="3.5" height="16" fill="#dc2626"/>
      <path d="M73 26 L94 34 L73 42 Z" fill="#dc2626" stroke="#090f1a" stroke-width="1.7" stroke-linejoin="round"/>
      <line x1="23" y1="34" x2="70" y2="34" stroke="#94a3b8" stroke-width="1.2" opacity="0.65"/>
    </svg>`
  ),

  supply_convoy: defineUnit(
    'supply_convoy',
    'قافلة إمداد',
    '_vehicle',
    { speed: 92, turnRate: 2.9, scale: 46, radius: 19 },
    {
      mode: 'scan',
      label: 'نقطة إمداد',
      shortLabel: 'إمداد',
      category: 'armor',
      accentColor: '#10b981',
      radius: 75
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 88 64">
      <g fill="#0f172a" stroke="#020617" stroke-width="1.2">
        <rect x="14" y="10" width="11" height="5" rx="1.5"/><rect x="33" y="10" width="11" height="5" rx="1.5"/><rect x="59" y="10" width="11" height="5" rx="1.5"/>
        <rect x="14" y="49" width="11" height="5" rx="1.5"/><rect x="33" y="49" width="11" height="5" rx="1.5"/><rect x="59" y="49" width="11" height="5" rx="1.5"/>
      </g>
      <!-- Armored Cab -->
      <rect x="54" y="15" width="22" height="34" rx="4" fill="#8b7355" stroke="#090f1a" stroke-width="2"/>
      <rect x="68" y="19" width="5" height="26" rx="1.2" fill="#38bdf8" stroke="#090f1a" stroke-width="1"/>
      <!-- Canvas Cargo Bed -->
      <rect x="10" y="14" width="43" height="36" rx="3" fill="#a38a68" stroke="#090f1a" stroke-width="2.2"/>
      <path d="M18 14 V50 M27 14 V50 M36 14 V50 M45 14 V50" stroke="#756146" stroke-width="1.8"/>
      <rect x="24" y="25" width="14" height="14" rx="2" fill="#10b981" stroke="#090f1a" stroke-width="1.3"/>
      <path d="M31 28 V36 M27 32 H35" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
    </svg>`
  ),

  // ==========================================
  // 3. الطائرات والمسيّرات حقيقية الشكل (Real-Silhouette Aircraft)
  // ==========================================
  f35_stealth: defineUnit(
    'f35_stealth',
    'مقاتلة شبح (F-35/F-22)',
    '_air',
    { speed: 235, turnRate: 3.4, scale: 56, radius: 24 },
    {
      mode: 'airstrike',
      label: 'غارة جوية',
      shortLabel: 'غارة جوية',
      category: 'air',
      accentColor: '#38bdf8',
      radius: 68
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
      <defs>
        <linearGradient id="f22Body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#94a3b8"/>
          <stop offset="50%" stop-color="#64748b"/>
          <stop offset="100%" stop-color="#334155"/>
        </linearGradient>
        <linearGradient id="goldCanopy" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#d97706"/>
          <stop offset="50%" stop-color="#fcd34d"/>
          <stop offset="100%" stop-color="#f59e0b"/>
        </linearGradient>
      </defs>
      <!-- Authentic F-22/F-35 diamond cropped delta planform -->
      <polygon points="90,48 70,41 56,37 37,11 26,11 31,37 19,35 12,21 5,21 9,39 12,42 12,54 9,57 5,75 12,75 19,61 31,59 26,85 37,85 56,59 70,55" fill="url(#f22Body)" stroke="#090f1a" stroke-width="2.2" stroke-linejoin="round"/>
      <!-- Leading edge & panel seams -->
      <polygon points="68,42 38,15 33,38 55,41" fill="#475569" opacity="0.45"/>
      <polygon points="68,54 38,81 33,58 55,55" fill="#1e293b" opacity="0.45"/>
      <!-- Twin canted vertical tails -->
      <polygon points="24,36 10,27 12,38 25,41" fill="#334155" stroke="#090f1a" stroke-width="1.3"/>
      <polygon points="24,60 10,69 12,58 25,55" fill="#334155" stroke="#090f1a" stroke-width="1.3"/>
      <!-- Twin thrust-vectoring exhaust nozzles & afterburner -->
      <rect x="8" y="42" width="7" height="5" rx="1" fill="#1e293b" stroke="#090f1a" stroke-width="1.1"/>
      <rect x="8" y="49" width="7" height="5" rx="1" fill="#1e293b" stroke="#090f1a" stroke-width="1.1"/>
      <circle cx="8" cy="44.5" r="2.1" fill="#f97316"/>
      <circle cx="8" cy="51.5" r="2.1" fill="#f97316"/>
      <!-- Chined Nose Radome & Gold Stealth Canopy -->
      <polygon points="72,44 88,48 72,52" fill="#475569"/>
      <ellipse cx="61" cy="48" rx="12" ry="4.2" fill="url(#goldCanopy)" stroke="#090f1a" stroke-width="1.5"/>
      <line x1="20" y1="48" x2="48" y2="48" stroke="#cbd5e1" stroke-width="1.2" opacity="0.6"/>
    </svg>`
  ),

  f16_falcon: defineUnit(
    'f16_falcon',
    'مقاتلة (F-16 فالكون)',
    '_air',
    { speed: 225, turnRate: 3.6, scale: 52, radius: 22 },
    {
      mode: 'airstrike',
      label: 'قصف تكتيكي',
      shortLabel: 'قصف جوي',
      category: 'air',
      accentColor: '#0ea5e9',
      radius: 60
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 92 92">
      <!-- Wingtip AIM-9 Sidewinder missiles -->
      <rect x="26" y="11" width="18" height="2.4" rx="1" fill="#f8fafc" stroke="#090f1a" stroke-width="0.9"/>
      <rect x="26" y="78.6" width="18" height="2.4" rx="1" fill="#f8fafc" stroke="#090f1a" stroke-width="0.9"/>
      <!-- Authentic F-16 Cropped Delta Wing & Forebody Strakes -->
      <polygon points="86,46 66,41 53,39 34,13 26,13 28,39 18,37 11,26 6,26 10,41 10,51 6,66 11,66 18,55 28,53 26,79 34,79 53,53 66,51" fill="#94a3b8" stroke="#090f1a" stroke-width="2.1" stroke-linejoin="round"/>
      <!-- Underwing fuel/ordnance pylons -->
      <rect x="33" y="25" width="12" height="3.2" rx="1.2" fill="#cbd5e1" stroke="#090f1a" stroke-width="0.9"/>
      <rect x="33" y="63.8" width="12" height="3.2" rx="1.2" fill="#cbd5e1" stroke="#090f1a" stroke-width="0.9"/>
      <!-- Single Tail Spine & Nozzle -->
      <rect x="6" y="42.5" width="7" height="7" rx="1.5" fill="#1e293b" stroke="#090f1a" stroke-width="1.2"/>
      <circle cx="6" cy="46" r="2.4" fill="#f97316"/>
      <polygon points="10,46 28,43 28,49" fill="#334155" stroke="#090f1a" stroke-width="1"/>
      <!-- Bubble Canopy & Nose -->
      <polygon points="71,43 85,46 71,49" fill="#334155"/>
      <ellipse cx="59" cy="46" rx="11.5" ry="3.8" fill="#38bdf8" stroke="#090f1a" stroke-width="1.4"/>
    </svg>`
  ),

  b2_bomber: defineUnit(
    'b2_bomber',
    'قاذفة شبح (B-2 Spirit)',
    '_air',
    { speed: 175, turnRate: 2.2, scale: 68, radius: 29 },
    {
      mode: 'airstrike',
      label: 'قصف استراتيجي',
      shortLabel: 'قصف ثقيل',
      category: 'air',
      accentColor: '#f43f5e',
      radius: 95
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
      <defs>
        <linearGradient id="b2Real" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#475569"/>
          <stop offset="50%" stop-color="#1e293b"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
      </defs>
      <!-- Authentic Northrop B-2 Flying Wing W-Sawtooth Trailing Edge -->
      <polygon points="82,48 37,6 22,18 35,32 21,41 33,48 21,55 35,64 22,78 37,90" fill="url(#b2Real)" stroke="#020617" stroke-width="2.5" stroke-linejoin="round"/>
      <!-- Blended Center Fuselage & Twin Recessed Engine Nacelles -->
      <polygon points="72,48 47,34 32,48 47,62" fill="#334155" opacity="0.72"/>
      <polygon points="53,37 36,28 30,34 49,40" fill="#0f172a" stroke="#475569" stroke-width="0.9"/>
      <polygon points="53,59 36,68 30,62 49,56" fill="#0f172a" stroke="#475569" stroke-width="0.9"/>
      <!-- Split 4-pane Cockpit Windshield -->
      <polygon points="69,48 62,42 57,45 62,48 57,51 62,54" fill="#38bdf8" stroke="#090f1a" stroke-width="1.2"/>
      <path d="M55 22 L41 44 M55 74 L41 52" stroke="#64748b" stroke-width="1" opacity="0.45"/>
    </svg>`
  ),

  apache_heli: defineUnit(
    'apache_heli',
    'مروحية أباتشي (AH-64)',
    '_heli',
    { speed: 148, turnRate: 3.9, scale: 56, radius: 24 },
    {
      mode: 'interceptor',
      label: 'صواريخ هيلفاير',
      shortLabel: 'هيلفاير',
      category: 'air',
      accentColor: '#fb923c',
      radius: 44
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 88 88">
      <!-- Tail boom & T-stabilizer -->
      <polygon points="10,41 38,39 38,49 10,47" fill="#3f4a3c" stroke="#090f1a" stroke-width="2"/>
      <rect x="8" y="32" width="5.5" height="24" rx="1.5" fill="#334155" stroke="#090f1a" stroke-width="1.5"/>
      <!-- Stub Wings + 4x Hellfire Racks & Rocket Pods -->
      <polygon points="44,18 53,20 53,68 44,70 39,61 39,27" fill="#4d5d43" stroke="#090f1a" stroke-width="2"/>
      <rect x="44" y="16" width="13" height="5" rx="1.5" fill="#1e293b" stroke="#090f1a" stroke-width="1.2"/>
      <rect x="44" y="67" width="13" height="5" rx="1.5" fill="#1e293b" stroke="#090f1a" stroke-width="1.2"/>
      <rect x="46" y="25" width="10" height="4.5" rx="1" fill="#334155" stroke="#090f1a" stroke-width="1"/>
      <rect x="46" y="58.5" width="10" height="4.5" rx="1" fill="#334155" stroke="#090f1a" stroke-width="1"/>
      <!-- Twin T700 Engine Nacelles & Slender Fuselage -->
      <ellipse cx="48" cy="38" rx="10" ry="3.5" fill="#334155" stroke="#090f1a" stroke-width="1.4"/>
      <ellipse cx="48" cy="50" rx="10" ry="3.5" fill="#334155" stroke="#090f1a" stroke-width="1.4"/>
      <path d="M32 39 C40 35 64 35 74 44 C64 53 40 53 32 49 Z" fill="#4b5563" stroke="#090f1a" stroke-width="2.2"/>
      <!-- Tandem Canopy + Nose TADS/PNVS Sensor -->
      <ellipse cx="62" cy="44" rx="8.5" ry="3.6" fill="#38bdf8" stroke="#090f1a" stroke-width="1.3"/>
      <circle cx="75" cy="44" r="3.2" fill="#1e293b" stroke="#94a3b8" stroke-width="1.1"/>
      <circle cx="44" cy="44" r="3.5" fill="#1e293b" stroke="#cbd5e1" stroke-width="1.2"/>
    </svg>`
  ),

  reaper_drone: defineUnit(
    'reaper_drone',
    'طائرة مسيّرة (MQ-9/بيرقدار)',
    '_air',
    { speed: 165, turnRate: 3.1, scale: 54, radius: 22 },
    {
      mode: 'airstrike',
      label: 'ضربة مسيّرة',
      shortLabel: 'مسيّرة',
      category: 'air',
      accentColor: '#a855f7',
      radius: 46
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
      <!-- High-aspect ratio long slender MALE UAV wings -->
      <polygon points="52,44 41,5 36,5 40,44 40,52 36,91 41,91 52,52" fill="#cbd5e1" stroke="#090f1a" stroke-width="2" stroke-linejoin="round"/>
      <!-- Underwing guided munitions -->
      <rect x="40" y="29" width="11" height="2.6" rx="1" fill="#334155" stroke="#090f1a" stroke-width="0.8"/>
      <rect x="40" y="64.4" width="11" height="2.6" rx="1" fill="#334155" stroke="#090f1a" stroke-width="0.8"/>
      <!-- V-Tail -->
      <polygon points="18,45 9,33 14,33 23,46 23,50 14,63 9,63 18,51" fill="#94a3b8" stroke="#090f1a" stroke-width="1.6"/>
      <!-- Slender fuselage & Bulbous SATCOM Nose -->
      <path d="M16 46 L68 44 C82 44 86 48 86 48 C86 48 82 52 68 52 L16 50 Z" fill="#e2e8f0" stroke="#090f1a" stroke-width="2"/>
      <ellipse cx="73" cy="48" rx="8" ry="3.6" fill="#94a3b8" stroke="#090f1a" stroke-width="1.1"/>
      <!-- EO/IR Sensor Ball & Rear Pusher Propeller -->
      <circle cx="62" cy="48" r="2.2" fill="#38bdf8"/>
      <rect x="13" y="42" width="2.2" height="12" rx="1" fill="#1e293b"/>
    </svg>`
  ),

  // ==========================================
  // 4. الأسطول البحري (Authentic Naval Fleet)
  // ==========================================
  arleigh_destroyer: defineUnit(
    'arleigh_destroyer',
    'مدمرة صواريخ (آرلي بيرك)',
    '_ship',
    { speed: 78, turnRate: 1.4, scale: 76, radius: 30 },
    {
      mode: 'missile',
      label: 'صاروخ كروز توماهوك',
      shortLabel: 'توماهوك',
      category: 'naval',
      accentColor: '#f97316',
      radius: 72
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 54">
      <defs>
        <linearGradient id="ddgReal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#334155"/>
          <stop offset="55%" stop-color="#475569"/>
          <stop offset="100%" stop-color="#64748b"/>
        </linearGradient>
      </defs>
      <!-- Hull -->
      <path d="M5 17 L68 10 L115 27 L68 44 L5 37 Z" fill="url(#ddgReal)" stroke="#090f1a" stroke-width="2.4" stroke-linejoin="round"/>
      <!-- Aft Flight Deck & Helipad -->
      <rect x="8" y="18.5" width="22" height="17" rx="1.5" fill="#1e293b" stroke="#475569" stroke-width="1.1"/>
      <circle cx="19" cy="27" r="5.2" fill="none" stroke="#fef08a" stroke-width="1.3" stroke-dasharray="3 2"/>
      <!-- Hangar + Exhaust Stacks + AEGIS Octagonal Bridge -->
      <rect x="32" y="16" width="15" height="22" rx="1.5" fill="#475569" stroke="#090f1a" stroke-width="1.6"/>
      <rect x="49" y="17.5" width="9" height="19" rx="1.5" fill="#334155" stroke="#090f1a" stroke-width="1.4"/>
      <circle cx="53.5" cy="22.5" r="2.2" fill="#0f172a"/><circle cx="53.5" cy="31.5" r="2.2" fill="#0f172a"/>
      <polygon points="60,15 80,17 83,27 80,37 60,39" fill="#64748b" stroke="#090f1a" stroke-width="1.7"/>
      <rect x="69" y="20" width="7" height="14" rx="1" fill="#38bdf8" opacity="0.88"/>
      <!-- Mk-41 VLS Vertical Launch Grid -->
      <rect x="85" y="19.5" width="12" height="15" rx="1" fill="#334155" stroke="#090f1a" stroke-width="1.4"/>
      <path d="M89 19.5 V34.5 M93 19.5 V34.5 M85 24.5 H97 M85 29.5 H97" stroke="#94a3b8" stroke-width="1"/>
      <!-- 5-inch Naval Gun -->
      <circle cx="102" cy="27" r="3.6" fill="#cbd5e1" stroke="#090f1a" stroke-width="1.5"/>
      <line x1="105" y1="27" x2="112" y2="27" stroke="#0f172a" stroke-width="2.4" stroke-linecap="round"/>
    </svg>`
  ),

  stealth_frigate: defineUnit(
    'stealth_frigate',
    'فرقاطة شبحية',
    '_ship',
    { speed: 86, turnRate: 1.7, scale: 62, radius: 24 },
    {
      mode: 'shell',
      label: 'مدفع بحري',
      shortLabel: 'مدفع بحري',
      category: 'naval',
      accentColor: '#38bdf8',
      radius: 36
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 48">
      <polygon points="7,17 60,11 94,24 60,37 7,31" fill="#64748b" stroke="#090f1a" stroke-width="2.2" stroke-linejoin="round"/>
      <polygon points="10,19 58,14 87,24 58,34 10,29" fill="#475569" opacity="0.7"/>
      <rect x="11" y="18" width="16" height="12" rx="1" fill="#1e293b" stroke="#334155" stroke-width="1"/>
      <circle cx="19" cy="24" r="3.8" fill="none" stroke="#fef08a" stroke-width="1.1"/>
      <polygon points="33,15.5 58,17 64,24 58,31 33,32.5" fill="#94a3b8" stroke="#090f1a" stroke-width="1.6"/>
      <rect x="46" y="19" width="7" height="10" rx="1" fill="#38bdf8"/>
      <polygon points="71,21 79,22 79,26 71,27" fill="#e2e8f0" stroke="#090f1a" stroke-width="1.3"/>
      <line x1="79" y1="24" x2="87" y2="24" stroke="#0f172a" stroke-width="2.2"/>
    </svg>`
  ),

  nimitz_carrier: defineUnit(
    'nimitz_carrier',
    'حاملة طائرات (نيميتز)',
    '_carrier',
    { speed: 52, turnRate: 0.9, scale: 106, radius: 42 },
    {
      mode: 'airstrike',
      label: 'إطلاق سرب جوي',
      shortLabel: 'سرب جوي',
      category: 'naval',
      accentColor: '#38bdf8',
      radius: 75
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 168 80">
      <defs>
        <linearGradient id="cvDeckReal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#1e293b"/>
          <stop offset="50%" stop-color="#334155"/>
          <stop offset="100%" stop-color="#475569"/>
        </linearGradient>
      </defs>
      <!-- Lower Hull Waterline -->
      <polygon points="6,21 122,12 162,25 162,53 122,69 6,60 3,40" fill="#0f172a"/>
      <!-- Angled Flight Deck -->
      <polygon points="9,23 72,14 120,9 160,26 160,51 120,64 112,69 11,58 7,40" fill="url(#cvDeckReal)" stroke="#0f172a" stroke-width="2.6" stroke-linejoin="round"/>
      <!-- Runway markings & Foul lines -->
      <line x1="17" y1="47" x2="118" y2="17" stroke="#f8fafc" stroke-width="2.2" opacity="0.88"/>
      <line x1="19" y1="52" x2="120" y2="22" stroke="#facc15" stroke-width="1.6" stroke-dasharray="6 5"/>
      <line x1="15" y1="42" x2="114" y2="13" stroke="#ef4444" stroke-width="1.3" opacity="0.85"/>
      <!-- Bow EMALS Catapults -->
      <line x1="99" y1="38" x2="154" y2="34" stroke="#94a3b8" stroke-width="2"/>
      <line x1="101" y1="45" x2="154" y2="43" stroke="#94a3b8" stroke-width="2"/>
      <!-- Parked Deck Hornets -->
      <polygon points="50,26 42,23 44,26 42,29" fill="#cbd5e1"/>
      <polygon points="64,23 56,20 58,23 56,26" fill="#cbd5e1"/>
      <polygon points="30,32 22,29 24,32 22,35" fill="#94a3b8"/>
      <!-- Starboard Island -->
      <rect x="78" y="49" width="30" height="13" rx="2" fill="#64748b" stroke="#090f1a" stroke-width="1.9"/>
      <rect x="87" y="51.5" width="12" height="5" rx="1" fill="#38bdf8"/>
      <circle cx="83" cy="55.5" r="2.8" fill="#e2e8f0" stroke="#090f1a" stroke-width="1"/>
    </svg>`
  ),

  attack_sub: defineUnit(
    'attack_sub',
    'غواصة هجومية',
    '_sub',
    { speed: 68, turnRate: 1.8, scale: 68, radius: 23 },
    {
      mode: 'torpedo',
      label: 'إطلاق طوربيد',
      shortLabel: 'طوربيد',
      category: 'naval',
      accentColor: '#22d3ee',
      radius: 52
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 112 44">
      <defs>
        <linearGradient id="subHull" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#334155"/>
          <stop offset="50%" stop-color="#1e293b"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
      </defs>
      <!-- Tail Stabilizer Fins -->
      <polygon points="10,22 3,13 9,13 17,22" fill="#334155" stroke="#020617" stroke-width="1.4"/>
      <polygon points="10,22 3,31 9,31 17,22" fill="#334155" stroke="#020617" stroke-width="1.4"/>
      <!-- Teardrop Hydrodynamic Hull -->
      <path d="M12 22 C18 13 66 11 94 14 C105 16 108 22 108 22 C108 22 105 28 94 30 C66 33 18 31 12 22 Z" fill="url(#subHull)" stroke="#020617" stroke-width="2.2"/>
      <!-- Dorsal Spine & VLS Hatches -->
      <rect x="66" y="18" width="22" height="8" rx="2" fill="#0f172a" stroke="#475569" stroke-width="1"/>
      <circle cx="71" cy="20.5" r="1.2" fill="#475569"/><circle cx="77" cy="20.5" r="1.2" fill="#475569"/><circle cx="83" cy="20.5" r="1.2" fill="#475569"/>
      <circle cx="71" cy="23.5" r="1.2" fill="#475569"/><circle cx="77" cy="23.5" r="1.2" fill="#475569"/><circle cx="83" cy="23.5" r="1.2" fill="#475569"/>
      <!-- Conning Tower (Sail) + Diving Planes -->
      <rect x="46" y="10" width="5" height="24" rx="1.5" fill="#475569" stroke="#020617" stroke-width="1.2"/>
      <rect x="40" y="18.5" width="20" height="7" rx="3.5" fill="#475569" stroke="#020617" stroke-width="1.6"/>
      <circle cx="53" cy="22" r="1.8" fill="#38bdf8"/>
    </svg>`
  ),

  // ==========================================
  // 5. المباني والمنشآت الاستراتيجية (Strategic Buildings)
  // ==========================================
  command_hq: defineUnit(
    'command_hq',
    'مركز قيادة وسيطرة',
    '_building',
    { scale: 62, radius: 27 },
    {
      mode: 'scan',
      label: 'توجيه وإنذار',
      shortLabel: 'توجيه',
      category: 'building',
      accentColor: '#38bdf8',
      radius: 105
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
      <rect x="6" y="8" width="68" height="64" rx="6" fill="#1e293b" stroke="#090f1a" stroke-width="2.6"/>
      <rect x="10" y="12" width="60" height="56" rx="4" fill="#334155" stroke="#475569" stroke-width="1.2"/>
      <!-- Fortified Bunker Roof -->
      <polygon points="16,22 40,15 64,22 64,52 16,52" fill="#475569" stroke="#090f1a" stroke-width="2"/>
      <!-- SATCOM Radome -->
      <circle cx="40" cy="34" r="11" fill="#e2e8f0" stroke="#090f1a" stroke-width="1.8"/>
      <path d="M31 34 A9 9 0 0 1 49 34" fill="none" stroke="#94a3b8" stroke-width="1.4"/>
      <circle cx="40" cy="34" r="3" fill="#0284c7"/>
      <!-- Helipad & Entrance -->
      <circle cx="24" cy="58" r="7" fill="#0f172a" stroke="#facc15" stroke-width="1.3"/>
      <path d="M22 55 V61 M26 55 V61 M22 58 H26" stroke="#facc15" stroke-width="1.4"/>
      <rect x="44" y="54" width="18" height="9" rx="1.5" fill="#1e293b" stroke="#090f1a" stroke-width="1.2"/>
      <circle cx="60" cy="21" r="2.6" fill="#22c55e"/>
    </svg>`
  ),

  airbase_runway: defineUnit(
    'airbase_runway',
    'قاعدة جوية',
    '_building',
    { scale: 68, radius: 30 },
    {
      mode: 'airstrike',
      label: 'إقلاع سرب جوي',
      shortLabel: 'دعم جوي',
      category: 'building',
      accentColor: '#38bdf8',
      radius: 70
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 84 84">
      <rect x="5" y="7" width="74" height="70" rx="5" fill="#1e293b" stroke="#090f1a" stroke-width="2.6"/>
      <rect x="8" y="10" width="68" height="64" rx="3" fill="#283548" stroke="#475569" stroke-width="1"/>
      <!-- Runway -->
      <rect x="11" y="13" width="62" height="17" rx="2" fill="#0f172a" stroke="#64748b" stroke-width="1.2"/>
      <path d="M13 15 V28 M16 15 V28 M68 15 V28 M71 15 V28" stroke="#f8fafc" stroke-width="1.5"/>
      <line x1="21" y1="21.5" x2="63" y2="21.5" stroke="#facc15" stroke-width="1.8" stroke-dasharray="6 4"/>
      <!-- Hardened Aircraft Shelters -->
      <rect x="12" y="35" width="20" height="15" rx="4" fill="#475569" stroke="#090f1a" stroke-width="1.6"/>
      <path d="M16 50 V40 C16 37 28 37 28 40 V50 Z" fill="#1e293b"/>
      <rect x="12" y="54" width="20" height="15" rx="4" fill="#475569" stroke="#090f1a" stroke-width="1.6"/>
      <path d="M16 69 V59 C16 56 28 56 28 59 V69 Z" fill="#1e293b"/>
      <!-- Radar Tower & Helipad -->
      <circle cx="46" cy="54" r="11" fill="#0f172a" stroke="#38bdf8" stroke-width="1.8" stroke-dasharray="4 2"/>
      <path d="M42 49 V59 M50 49 V59 M42 54 H50" stroke="#facc15" stroke-width="2" stroke-linecap="round"/>
      <rect x="61" y="37" width="12" height="12" rx="2" fill="#64748b" stroke="#090f1a" stroke-width="1.5"/>
      <circle cx="67" cy="43" r="3.5" fill="#38bdf8"/>
    </svg>`
  ),

  missile_silo: defineUnit(
    'missile_silo',
    'صومعة صواريخ',
    '_building',
    { scale: 56, radius: 25 },
    {
      mode: 'missile',
      label: 'إطلاق صاروخ استراتيجي',
      shortLabel: 'صاروخ',
      category: 'building',
      accentColor: '#ef4444',
      radius: 90
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 76 76">
      <rect x="8" y="8" width="60" height="60" rx="6" fill="#27272a" stroke="#090f1a" stroke-width="2.6"/>
      <polygon points="18,14 58,14 62,18 62,58 58,62 18,62 14,58 14,18" fill="#3f3f46" stroke="#52525b" stroke-width="1.4"/>
      <!-- Reinforced Concrete Blast Doors -->
      <circle cx="38" cy="38" r="19" fill="#18181b" stroke="#f59e0b" stroke-width="2.4" stroke-dasharray="6 4"/>
      <circle cx="38" cy="38" r="14" fill="#09090b" stroke="#71717a" stroke-width="1.6"/>
      <!-- Missile Warhead Tip Ready Inside Silo -->
      <circle cx="38" cy="38" r="7.5" fill="#dc2626" stroke="#f8fafc" stroke-width="1.4"/>
      <circle cx="38" cy="38" r="3" fill="#fef08a"/>
    </svg>`
  ),

  radar_defense: defineUnit(
    'radar_defense',
    'محطة رادار',
    '_building',
    { scale: 54, radius: 24 },
    {
      mode: 'scan',
      label: 'مسح راداري',
      shortLabel: 'مسح راداري',
      category: 'building',
      accentColor: '#38bdf8',
      radius: 120
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">
      <rect x="8" y="8" width="56" height="56" rx="6" fill="#1e293b" stroke="#090f1a" stroke-width="2.5"/>
      <polygon points="20,14 52,14 58,20 58,52 52,58 20,58 14,52 14,20" fill="#334155" stroke="#475569" stroke-width="1.5"/>
      <circle cx="36" cy="36" r="16" fill="#0c4a6e" stroke="#38bdf8" stroke-width="2"/>
      <circle cx="36" cy="36" r="10" fill="none" stroke="#7dd3fc" stroke-width="1.1" stroke-dasharray="3 2"/>
      <polygon points="36,36 50,24 53,29" fill="#38bdf8" opacity="0.5"/>
      <line x1="36" y1="36" x2="49" y2="23" stroke="#fef08a" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="36" cy="36" r="3.5" fill="#e2e8f0" stroke="#090f1a" stroke-width="1.4"/>
    </svg>`
  ),

  oil_refinery: defineUnit(
    'oil_refinery',
    'منشأة نفطية',
    '_building',
    { scale: 62, radius: 28 },
    {
      mode: 'scan',
      label: 'تأمين المنشأة',
      shortLabel: 'تأمين',
      category: 'building',
      accentColor: '#f59e0b',
      radius: 80
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
      <rect x="6" y="8" width="68" height="64" rx="5" fill="#1e293b" stroke="#090f1a" stroke-width="2.6"/>
      <rect x="9" y="11" width="62" height="58" rx="3" fill="#273244" stroke="#475569" stroke-width="1"/>
      <path d="M14 26 H66 M14 48 H56 M26 14 V62 M46 14 V50" stroke="#94a3b8" stroke-width="2.4" fill="none"/>
      <circle cx="24" cy="25" r="10.5" fill="#e2e8f0" stroke="#334155" stroke-width="2"/>
      <circle cx="24" cy="25" r="6.5" fill="#cbd5e1" stroke="#64748b" stroke-width="1"/>
      <circle cx="24" cy="52" r="10" fill="#cbd5e1" stroke="#334155" stroke-width="2"/>
      <circle cx="24" cy="52" r="6" fill="#94a3b8" stroke="#64748b" stroke-width="1"/>
      <circle cx="46" cy="24" r="7.5" fill="#94a3b8" stroke="#0f172a" stroke-width="1.8"/>
      <circle cx="46" cy="24" r="3" fill="#334155"/>
      <rect x="39" y="38" width="16" height="14" rx="2" fill="#475569" stroke="#090f1a" stroke-width="1.6"/>
      <circle cx="62" cy="54" r="6.5" fill="#7c2d12" stroke="#090f1a" stroke-width="1.5"/>
      <circle cx="62" cy="54" r="4.2" fill="#f97316"/>
      <circle cx="62" cy="54" r="2.2" fill="#fef08a"/>
    </svg>`
  ),

  seaport_terminal: defineUnit(
    'seaport_terminal',
    'ميناء بحري استراتيجي',
    '_building',
    { scale: 64, radius: 28 },
    {
      mode: 'scan',
      label: 'حركة الميناء',
      shortLabel: 'إشارة ميناء',
      category: 'building',
      accentColor: '#0ea5e9',
      radius: 85
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
      <rect x="6" y="10" width="68" height="60" rx="4" fill="#1e293b" stroke="#090f1a" stroke-width="2.5"/>
      <!-- Concrete Pier Apron -->
      <rect x="10" y="14" width="60" height="28" rx="2" fill="#64748b" stroke="#090f1a" stroke-width="1.4"/>
      <!-- Gantry Cranes -->
      <rect x="16" y="8" width="6" height="38" rx="1" fill="#f97316" stroke="#090f1a" stroke-width="1.3"/>
      <rect x="44" y="8" width="6" height="38" rx="1" fill="#f97316" stroke="#090f1a" stroke-width="1.3"/>
      <!-- Stacked Shipping Containers -->
      <rect x="12" y="48" width="16" height="8" rx="1" fill="#dc2626" stroke="#090f1a" stroke-width="1.2"/>
      <rect x="31" y="48" width="16" height="8" rx="1" fill="#0284c7" stroke="#090f1a" stroke-width="1.2"/>
      <rect x="50" y="48" width="16" height="8" rx="1" fill="#16a34a" stroke="#090f1a" stroke-width="1.2"/>
      <rect x="16" y="58" width="16" height="8" rx="1" fill="#f59e0b" stroke="#090f1a" stroke-width="1.2"/>
      <rect x="36" y="58" width="16" height="8" rx="1" fill="#3b82f6" stroke="#090f1a" stroke-width="1.2"/>
    </svg>`
  ),

  capital_gov: defineUnit(
    'capital_gov',
    'مبنى سيادي / برلمان',
    '_building',
    { scale: 60, radius: 26 },
    {
      mode: 'scan',
      label: 'قرار سيادي',
      shortLabel: 'بيان',
      category: 'building',
      accentColor: '#eab308',
      radius: 95
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
      <rect x="10" y="14" width="60" height="52" rx="4" fill="#334155" stroke="#090f1a" stroke-width="2.4"/>
      <!-- Courtyard & Neoclassical Wings -->
      <rect x="14" y="24" width="52" height="32" rx="2" fill="#e2e8f0" stroke="#090f1a" stroke-width="1.8"/>
      <rect x="26" y="18" width="28" height="44" rx="2" fill="#f8fafc" stroke="#090f1a" stroke-width="1.8"/>
      <!-- Central Dome -->
      <circle cx="40" cy="40" r="12" fill="#cbd5e1" stroke="#090f1a" stroke-width="2"/>
      <circle cx="40" cy="40" r="7.5" fill="#f59e0b" stroke="#090f1a" stroke-width="1.4"/>
      <circle cx="40" cy="40" r="2.6" fill="#fef08a"/>
      <!-- Colonnade Steps -->
      <line x1="20" y1="60" x2="60" y2="60" stroke="#94a3b8" stroke-width="2"/>
      <line x1="23" y1="63" x2="57" y2="63" stroke="#64748b" stroke-width="2"/>
    </svg>`
  )
};
