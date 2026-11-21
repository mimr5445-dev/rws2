import { ActorPack, ActorTemplate, MapPack, NavCell } from '../core/types';

// قوالب الميراث (مثل _templates في Rusted Warfare)
export const TEMPLATES: Record<string, ActorTemplate> = {
  _person: { domain: 'land', kind: 'person', speed: 62, turnRate: 8, scale: 34, radius: 14 },
  _vehicle: { domain: 'land', kind: 'vehicle', speed: 95, turnRate: 2.8, scale: 42, radius: 20 },
  _ship: { domain: 'sea', kind: 'ship', speed: 78, turnRate: 1.5, scale: 52, radius: 22 },
  _carrier: { domain: 'sea', kind: 'ship', speed: 52, turnRate: 0.95, scale: 82, radius: 34 },
  _air: { domain: 'air', kind: 'air', speed: 205, turnRate: 3.1, scale: 48, radius: 22 },
  _heli: { domain: 'air', kind: 'air', speed: 140, turnRate: 3.8, scale: 46, radius: 21 },
  _building: { domain: 'land', kind: 'building', speed: 0, turnRate: 0, scale: 50, radius: 24 }
};

function defineActor(
  id: string,
  label: string,
  templateName: keyof typeof TEMPLATES,
  overrides: Partial<ActorTemplate>,
  svg: string
): ActorPack {
  return { id, label, extends: templateName, ...TEMPLATES[templateName], ...overrides, svg };
}

export const DEMO_ACTORS: Record<string, ActorPack> = {
  diplomat_person: defineActor(
    'diplomat_person',
    'مبعوث / شخصية',
    '_person',
    { speed: 56, scale: 36, radius: 14 },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">
      <defs>
        <linearGradient id="suitG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#1e293b"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
      </defs>
      <circle cx="36" cy="20" r="9.5" fill="#f3d1a4" stroke="#090f1a" stroke-width="2.2"/>
      <path d="M27.5 17 C29 10 43 10 44.5 17 C41 14.5 31 14.5 27.5 17 Z" fill="#1e293b"/>
      <path d="M19 56 C19 37 25 32 36 32 C47 32 53 37 53 56 Z" fill="url(#suitG)" stroke="#090f1a" stroke-width="2.2" stroke-linejoin="round"/>
      <polygon points="31,32 36,44 41,32" fill="#f8fafc"/>
      <polygon points="34.5,33 36,44 37.5,33" fill="#dc2626"/>
      <path d="M28 33 L33 44 M44 33 L39 44" stroke="#475569" stroke-width="1.6"/>
      <rect x="46" y="46" width="12" height="9" rx="1.5" fill="#78350f" stroke="#090f1a" stroke-width="1.6"/>
      <rect x="50" y="43.5" width="4" height="2.5" fill="none" stroke="#d97706" stroke-width="1.2"/>
    </svg>`
  ),
  infantry_squad: defineActor(
    'infantry_squad',
    'فصيل مشاة',
    '_person',
    { speed: 65, scale: 38, radius: 15 },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">
      <!-- 3-soldier tactical fireteam -->
      <g stroke="#090f1a" stroke-width="1.8">
        <!-- Rear Left -->
        <ellipse cx="22" cy="48" rx="9.5" ry="6.5" fill="#3f6212"/>
        <circle cx="22" cy="47" r="6" fill="#4d7c0f"/>
        <path d="M18 45 L26 45" stroke="#65a30d" stroke-width="1.2"/>
        <line x1="26" y1="45" x2="33" y2="38" stroke="#1e293b" stroke-width="2.4" stroke-linecap="round"/>
        <!-- Rear Right -->
        <ellipse cx="50" cy="48" rx="9.5" ry="6.5" fill="#3f6212"/>
        <circle cx="50" cy="47" r="6" fill="#4d7c0f"/>
        <path d="M46 45 L54 45" stroke="#65a30d" stroke-width="1.2"/>
        <line x1="54" y1="45" x2="61" y2="38" stroke="#1e293b" stroke-width="2.4" stroke-linecap="round"/>
        <!-- Point Soldier -->
        <ellipse cx="36" cy="26" rx="10.5" ry="7" fill="#365314"/>
        <circle cx="36" cy="25" r="6.8" fill="#65a30d"/>
        <rect x="31" y="21" width="10" height="3" rx="1" fill="#1e293b" stroke="none"/>
        <line x1="40" y1="24" x2="52" y2="17" stroke="#0f172a" stroke-width="2.8" stroke-linecap="round"/>
      </g>
    </svg>`
  ),
  heavy_tank: defineActor(
    'heavy_tank',
    'دبابة قتال ثقيلة',
    '_vehicle',
    { speed: 80, turnRate: 2.6, scale: 46, radius: 21 },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
      <defs>
        <linearGradient id="tankHull" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#3f4a3c"/>
          <stop offset="60%" stop-color="#53614d"/>
          <stop offset="100%" stop-color="#44503f"/>
        </linearGradient>
        <linearGradient id="tankTurret" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#6b7a62"/>
          <stop offset="100%" stop-color="#465241"/>
        </linearGradient>
      </defs>
      <!-- Track assemblies -->
      <rect x="10" y="15" width="52" height="10" rx="2.5" fill="#1e293b" stroke="#090f1a" stroke-width="2"/>
      <rect x="10" y="55" width="52" height="10" rx="2.5" fill="#1e293b" stroke="#090f1a" stroke-width="2"/>
      <path d="M15 15 V25 M23 15 V25 M31 15 V25 M39 15 V25 M47 15 V25 M55 15 V25 M15 55 V65 M23 55 V65 M31 55 V65 M39 55 V65 M47 55 V65 M55 55 V65" stroke="#0f172a" stroke-width="1.3"/>
      <!-- Hull & side skirts -->
      <rect x="12" y="21" width="49" height="38" rx="3" fill="url(#tankHull)" stroke="#090f1a" stroke-width="2"/>
      <!-- Engine deck grilles -->
      <rect x="14" y="25" width="12" height="30" rx="1.5" fill="#2b3329" stroke="#1e293b" stroke-width="1"/>
      <line x1="17" y1="26" x2="17" y2="54" stroke="#475569" stroke-width="1"/>
      <line x1="20" y1="26" x2="20" y2="54" stroke="#475569" stroke-width="1"/>
      <line x1="23" y1="26" x2="23" y2="54" stroke="#475569" stroke-width="1"/>
      <!-- Front composite glacis & lights -->
      <polygon points="50,22 61,25 61,55 50,58" fill="#5c6b55" stroke="#1e293b" stroke-width="1"/>
      <rect x="58" y="23" width="3" height="4" fill="#fef08a"/>
      <rect x="58" y="53" width="3" height="4" fill="#fef08a"/>
      <!-- 120mm Smoothbore barrel & bore evacuator -->
      <rect x="44" y="38" width="34" height="4" rx="1" fill="#64748b" stroke="#090f1a" stroke-width="1.5"/>
      <rect x="55" y="36.8" width="7" height="6.4" rx="1.5" fill="#788573" stroke="#090f1a" stroke-width="1.3"/>
      <rect x="75" y="37.4" width="3" height="5.2" fill="#334155"/>
      <!-- Wedge Turret -->
      <polygon points="18,28 36,24 51,32 51,48 36,56 18,52" fill="url(#tankTurret)" stroke="#090f1a" stroke-width="2" stroke-linejoin="round"/>
      <!-- Bustle rack & Optics -->
      <rect x="18" y="30" width="7" height="20" fill="#3b4537" stroke="#1e293b" stroke-width="1"/>
      <circle cx="35" cy="34" r="4.5" fill="#3f4a3c" stroke="#090f1a" stroke-width="1.4"/>
      <circle cx="35" cy="46" r="3.5" fill="#3f4a3c" stroke="#090f1a" stroke-width="1.4"/>
      <rect x="42" y="31" width="4" height="3.5" fill="#38bdf8"/>
    </svg>`
  ),
  ballistic_launcher: defineActor(
    'ballistic_launcher',
    'منظومة صواريخ بالستية',
    '_vehicle',
    { speed: 62, turnRate: 2.0, scale: 54, radius: 24 },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 64">
      <defs>
        <linearGradient id="telChassis" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#374151"/>
          <stop offset="100%" stop-color="#4b5563"/>
        </linearGradient>
        <linearGradient id="missileBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f1f5f9"/>
          <stop offset="50%" stop-color="#cbd5e1"/>
          <stop offset="100%" stop-color="#64748b"/>
        </linearGradient>
      </defs>
      <!-- 8x8 Heavy off-road tires -->
      <g fill="#0f172a" stroke="#020617" stroke-width="1.2">
        <rect x="10" y="9" width="12" height="5" rx="1.5"/><rect x="27" y="9" width="12" height="5" rx="1.5"/>
        <rect x="46" y="9" width="12" height="5" rx="1.5"/><rect x="65" y="9" width="12" height="5" rx="1.5"/>
        <rect x="10" y="50" width="12" height="5" rx="1.5"/><rect x="27" y="50" width="12" height="5" rx="1.5"/>
        <rect x="46" y="50" width="12" height="5" rx="1.5"/><rect x="65" y="50" width="12" height="5" rx="1.5"/>
      </g>
      <!-- 8x8 Chassis Frame -->
      <rect x="8" y="13" width="76" height="38" rx="4" fill="url(#telChassis)" stroke="#090f1a" stroke-width="2.2"/>
      <!-- Twin Forward Armored Cab -->
      <rect x="64" y="15" width="18" height="14" rx="2" fill="#525f50" stroke="#090f1a" stroke-width="1.5"/>
      <rect x="64" y="35" width="18" height="14" rx="2" fill="#525f50" stroke="#090f1a" stroke-width="1.5"/>
      <rect x="75" y="17" width="4" height="10" rx="1" fill="#38bdf8"/>
      <rect x="75" y="37" width="4" height="10" rx="1" fill="#38bdf8"/>
      <!-- Erector Cradle -->
      <rect x="12" y="21" width="54" height="22" rx="3" fill="#1e293b" stroke="#090f1a" stroke-width="1.5"/>
      <!-- Ballistic Missile Silhouette mounted on TEL -->
      <polygon points="10,21 18,24 18,40 10,43 13,32" fill="#475569" stroke="#090f1a" stroke-width="1.2"/>
      <rect x="14" y="25" width="54" height="14" rx="2" fill="url(#missileBody)" stroke="#090f1a" stroke-width="1.6"/>
      <rect x="34" y="25" width="4" height="14" fill="#334155"/>
      <rect x="52" y="25" width="3" height="14" fill="#ef4444"/>
      <path d="M68 25 L86 32 L68 39 Z" fill="#dc2626" stroke="#090f1a" stroke-width="1.5" stroke-linejoin="round"/>
      <line x1="22" y1="32" x2="64" y2="32" stroke="#94a3b8" stroke-width="1" opacity="0.65"/>
    </svg>`
  ),
  fighter_jet: defineActor(
    'fighter_jet',
    'مقاتلة حربية',
    '_air',
    { speed: 225, turnRate: 3.3, scale: 50, radius: 22 },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
      <defs>
        <linearGradient id="jetWing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#94a3b8"/>
          <stop offset="55%" stop-color="#64748b"/>
          <stop offset="100%" stop-color="#475569"/>
        </linearGradient>
        <linearGradient id="canopyG" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#0284c7"/>
          <stop offset="55%" stop-color="#7dd3fc"/>
          <stop offset="100%" stop-color="#fef08a"/>
        </linearGradient>
      </defs>
      <!-- Underwing air-to-air missiles -->
      <rect x="29" y="13" width="14" height="2" rx="1" fill="#e2e8f0" stroke="#0f172a" stroke-width="0.7"/>
      <rect x="29" y="65" width="14" height="2" rx="1" fill="#e2e8f0" stroke="#0f172a" stroke-width="0.7"/>
      <!-- Main swept wings + intake strakes + horizontal tails -->
      <polygon points="75,40 58,34 45,32 28,9 21,9 26,31 15,28 8,16 3,16 7,33 10,36 10,44 7,47 3,64 8,64 15,52 26,49 21,71 28,71 45,48 58,46" fill="url(#jetWing)" stroke="#090f1a" stroke-width="2" stroke-linejoin="round"/>
      <!-- Panel lines & LERX shading -->
      <polygon points="56,35 30,14 27,32 45,36" fill="#475569" opacity="0.45"/>
      <polygon points="56,45 30,66 27,48 45,44" fill="#334155" opacity="0.45"/>
      <!-- Twin canted vertical stabilizers -->
      <polygon points="20,30 8,24 10,33 22,35" fill="#334155" stroke="#090f1a" stroke-width="1.2"/>
      <polygon points="20,50 8,56 10,47 22,45" fill="#334155" stroke="#090f1a" stroke-width="1.2"/>
      <!-- Twin afterburner nozzles -->
      <rect x="7" y="34.5" width="6" height="4.5" rx="1" fill="#1e293b" stroke="#090f1a" stroke-width="1"/>
      <rect x="7" y="41" width="6" height="4.5" rx="1" fill="#1e293b" stroke="#090f1a" stroke-width="1"/>
      <circle cx="7.5" cy="36.8" r="1.8" fill="#f97316"/>
      <circle cx="7.5" cy="43.2" r="1.8" fill="#f97316"/>
      <!-- Nose radome & Bubble canopy -->
      <path d="M62 37 L74 40 L62 43 Z" fill="#334155"/>
      <ellipse cx="52" cy="40" rx="10" ry="3.4" fill="url(#canopyG)" stroke="#090f1a" stroke-width="1.4"/>
      <line x1="22" y1="40" x2="41" y2="40" stroke="#cbd5e1" stroke-width="1.1" opacity="0.7"/>
    </svg>`
  ),
  stealth_bomber: defineActor(
    'stealth_bomber',
    'قاذفة استراتيجية',
    '_air',
    { speed: 175, turnRate: 2.2, scale: 62, radius: 27 },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 88 88">
      <defs>
        <linearGradient id="b2Skin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#3f4756"/>
          <stop offset="50%" stop-color="#27303f"/>
          <stop offset="100%" stop-color="#171d28"/>
        </linearGradient>
      </defs>
      <!-- B-2 Spirit flying-wing with authentic W-sawtooth trailing edge -->
      <polygon points="74,44 33,6 21,16 32,29 20,38 30,44 20,50 32,59 21,72 33,82" fill="url(#b2Skin)" stroke="#090f1a" stroke-width="2.4" stroke-linejoin="round"/>
      <!-- Center fuselage blending & engine nacelles -->
      <polygon points="64,44 42,32 30,44 42,56" fill="#334155" opacity="0.75"/>
      <polygon points="48,34 33,26 28,31 44,37" fill="#0f172a" opacity="0.8"/>
      <polygon points="48,54 33,62 28,57 44,51" fill="#0f172a" opacity="0.8"/>
      <!-- Split stealth windshield -->
      <polygon points="61,44 55,39 51,41 55,44 51,47 55,49" fill="#38bdf8" stroke="#090f1a" stroke-width="1.1"/>
      <!-- Low-observable radar seams -->
      <path d="M50 22 L38 40 M50 66 L38 48" stroke="#475569" stroke-width="1" opacity="0.55"/>
    </svg>`
  ),
  attack_heli: defineActor(
    'attack_heli',
    'مروحية هجومية',
    '_heli',
    { speed: 145, turnRate: 3.8, scale: 50, radius: 22 },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
      <defs>
        <linearGradient id="heliBody" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#374151"/>
          <stop offset="100%" stop-color="#4b5563"/>
        </linearGradient>
      </defs>
      <!-- Tail boom & horizontal stabilizer -->
      <polygon points="10,37.5 34,36 34,44 10,42.5" fill="#3f4a3c" stroke="#090f1a" stroke-width="1.8"/>
      <rect x="8" y="30" width="5" height="20" rx="1.5" fill="#334155" stroke="#090f1a" stroke-width="1.4"/>
      <rect x="4" y="38.5" width="7" height="3" fill="#94a3b8"/>
      <!-- Stub wings + Hellfire & rocket pods -->
      <polygon points="40,17 48,19 48,61 40,63 36,56 36,24" fill="#465241" stroke="#090f1a" stroke-width="1.8"/>
      <rect x="40" y="16" width="11" height="4" rx="1.5" fill="#1e293b" stroke="#090f1a" stroke-width="1"/>
      <rect x="40" y="60" width="11" height="4" rx="1.5" fill="#1e293b" stroke="#090f1a" stroke-width="1"/>
      <rect x="42" y="23" width="9" height="4" rx="1" fill="#334155"/>
      <rect x="42" y="53" width="9" height="4" rx="1" fill="#334155"/>
      <!-- Slender fuselage & twin engine pods -->
      <ellipse cx="44" cy="34.5" rx="9" ry="3.2" fill="#334155" stroke="#090f1a" stroke-width="1.3"/>
      <ellipse cx="44" cy="45.5" rx="9" ry="3.2" fill="#334155" stroke="#090f1a" stroke-width="1.3"/>
      <path d="M29 36 C36 33 58 33 67 40 C58 47 36 47 29 44 Z" fill="url(#heliBody)" stroke="#090f1a" stroke-width="2"/>
      <!-- Tandem canopy + Nose FLIR sensor & 30mm chain gun -->
      <ellipse cx="56" cy="40" rx="7.5" ry="3.2" fill="#38bdf8" stroke="#090f1a" stroke-width="1.2"/>
      <circle cx="67.5" cy="40" r="2.6" fill="#1e293b" stroke="#64748b" stroke-width="1"/>
      <circle cx="40" cy="40" r="3.2" fill="#1e293b" stroke="#cbd5e1" stroke-width="1.2"/>
    </svg>`
  ),
  naval_corvette: defineActor(
    'naval_corvette',
    'فرقاطة بحرية',
    '_ship',
    { speed: 85, turnRate: 1.7, scale: 58, radius: 24 },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 48">
      <defs>
        <linearGradient id="corvHull" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#475569"/>
          <stop offset="100%" stop-color="#94a3b8"/>
        </linearGradient>
      </defs>
      <!-- Faceted stealth hull -->
      <polygon points="7,17 58,11 91,24 58,37 7,31" fill="url(#corvHull)" stroke="#090f1a" stroke-width="2.2" stroke-linejoin="round"/>
      <polygon points="10,19 56,14 84,24 56,34 10,29" fill="#64748b" opacity="0.5"/>
      <!-- Aft flight deck -->
      <rect x="11" y="18" width="16" height="12" rx="1" fill="#334155" stroke="#1e293b" stroke-width="1"/>
      <circle cx="19" cy="24" r="3.6" fill="none" stroke="#fef08a" stroke-width="1"/>
      <!-- Stealth bridge superstructure & mast -->
      <polygon points="32,16 56,17 62,24 56,31 32,32" fill="#475569" stroke="#090f1a" stroke-width="1.6"/>
      <rect x="44" y="19" width="7" height="10" rx="1" fill="#38bdf8" opacity="0.8"/>
      <line x1="40" y1="15" x2="40" y2="33" stroke="#e2e8f0" stroke-width="1.6"/>
      <!-- 57mm Stealth Bow Cannon -->
      <polygon points="69,21 76,22 76,26 69,27" fill="#cbd5e1" stroke="#090f1a" stroke-width="1.2"/>
      <line x1="76" y1="24" x2="84" y2="24" stroke="#0f172a" stroke-width="2"/>
    </svg>`
  ),
  destroyer_ship: defineActor(
    'destroyer_ship',
    'مدمرة صواريخ',
    '_ship',
    { speed: 78, turnRate: 1.4, scale: 70, radius: 28 },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 112 52">
      <defs>
        <linearGradient id="ddgHull" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#334155"/>
          <stop offset="55%" stop-color="#475569"/>
          <stop offset="100%" stop-color="#64748b"/>
        </linearGradient>
      </defs>
      <!-- Arleigh-Burke style steel hull -->
      <path d="M5 17 L64 10 L108 26 L64 42 L5 35 Z" fill="url(#ddgHull)" stroke="#090f1a" stroke-width="2.4" stroke-linejoin="round"/>
      <!-- Flight deck & Helipad -->
      <rect x="8" y="18" width="21" height="16" rx="1.5" fill="#1e293b" stroke="#475569" stroke-width="1"/>
      <circle cx="18" cy="26" r="5" fill="none" stroke="#fef08a" stroke-width="1.2" stroke-dasharray="3 2"/>
      <line x1="8" y1="26" x2="29" y2="26" stroke="#e2e8f0" stroke-width="0.8" opacity="0.5"/>
      <!-- Aft Hangar + Exhaust Stacks + AEGIS Deckhouse -->
      <rect x="30" y="16" width="14" height="20" rx="1.5" fill="#475569" stroke="#090f1a" stroke-width="1.5"/>
      <rect x="46" y="17" width="8" height="18" rx="1.5" fill="#334155" stroke="#090f1a" stroke-width="1.4"/>
      <circle cx="50" cy="22" r="2.2" fill="#0f172a"/><circle cx="50" cy="30" r="2.2" fill="#0f172a"/>
      <polygon points="56,15 74,17 77,26 74,35 56,37" fill="#64748b" stroke="#090f1a" stroke-width="1.6"/>
      <rect x="64" y="19" width="7" height="14" rx="1" fill="#38bdf8" opacity="0.85"/>
      <!-- Forward Mk-41 VLS Cell Grid -->
      <rect x="79" y="19" width="11" height="14" rx="1" fill="#334155" stroke="#090f1a" stroke-width="1.3"/>
      <path d="M82.5 19 V33 M86.5 19 V33 M79 23.5 H90 M79 28.5 H90" stroke="#94a3b8" stroke-width="0.9"/>
      <!-- 5-inch Naval Bow Gun -->
      <circle cx="95" cy="26" r="3.4" fill="#cbd5e1" stroke="#090f1a" stroke-width="1.4"/>
      <line x1="98" y1="26" x2="105" y2="26" stroke="#0f172a" stroke-width="2.2" stroke-linecap="round"/>
    </svg>`
  ),
  aircraft_carrier: defineActor(
    'aircraft_carrier',
    'حاملة طائرات',
    '_carrier',
    { speed: 52, turnRate: 0.9, scale: 98, radius: 40 },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 76">
      <defs>
        <linearGradient id="cvDeck" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#1e293b"/>
          <stop offset="50%" stop-color="#334155"/>
          <stop offset="100%" stop-color="#475569"/>
        </linearGradient>
      </defs>
      <!-- Lower waterline hull shadow -->
      <polygon points="6,20 116,12 154,24 154,50 116,66 6,58 3,39" fill="#0f172a"/>
      <!-- Asymmetric angled flight deck -->
      <polygon points="8,22 68,14 114,9 152,25 152,49 114,61 106,66 10,55 6,38" fill="url(#cvDeck)" stroke="#0f172a" stroke-width="2.5" stroke-linejoin="round"/>
      <!-- Angled landing runway + centerline + foul lines -->
      <line x1="16" y1="45" x2="112" y2="17" stroke="#f8fafc" stroke-width="2.2" opacity="0.85"/>
      <line x1="18" y1="50" x2="114" y2="22" stroke="#facc15" stroke-width="1.5" stroke-dasharray="6 5"/>
      <line x1="14" y1="40" x2="108" y2="13" stroke="#ef4444" stroke-width="1.2" opacity="0.8"/>
      <!-- Bow steam/EMALS catapult tracks -->
      <line x1="94" y1="36" x2="147" y2="33" stroke="#94a3b8" stroke-width="1.8"/>
      <line x1="96" y1="43" x2="147" y2="41" stroke="#94a3b8" stroke-width="1.8"/>
      <!-- Arresting wires -->
      <line x1="25" y1="38" x2="31" y2="52" stroke="#cbd5e1" stroke-width="1.2"/>
      <line x1="33" y1="35" x2="39" y2="49" stroke="#cbd5e1" stroke-width="1.2"/>
      <!-- Deck elevators & parked carrier jets -->
      <rect x="44" y="50" width="16" height="8" fill="#475569" stroke="#1e293b" stroke-width="1"/>
      <polygon points="48,25 40,22 42,25 40,28" fill="#cbd5e1"/>
      <polygon points="62,22 54,19 56,22 54,25" fill="#cbd5e1"/>
      <polygon points="28,31 20,28 22,31 20,34" fill="#94a3b8"/>
      <!-- Starboard Island Superstructure & Phased Radar -->
      <rect x="74" y="47" width="28" height="12" rx="2" fill="#64748b" stroke="#090f1a" stroke-width="1.8"/>
      <rect x="82" y="49" width="12" height="5" rx="1" fill="#38bdf8"/>
      <circle cx="79" cy="53" r="2.6" fill="#e2e8f0" stroke="#090f1a" stroke-width="1"/>
    </svg>`
  ),
  military_base: defineActor(
    'military_base',
    'قاعدة عسكرية',
    '_building',
    { scale: 64, radius: 29 },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
      <!-- Perimeter tarmac pad -->
      <rect x="5" y="7" width="70" height="66" rx="5" fill="#1e293b" stroke="#090f1a" stroke-width="2.6"/>
      <rect x="8" y="10" width="64" height="60" rx="3" fill="#283548" stroke="#475569" stroke-width="1"/>
      <!-- Main Paved Runway with threshold piano keys -->
      <rect x="11" y="13" width="58" height="16" rx="2" fill="#0f172a" stroke="#64748b" stroke-width="1.2"/>
      <path d="M13 15 V27 M16 15 V27 M64 15 V27 M67 15 V27" stroke="#f8fafc" stroke-width="1.4"/>
      <line x1="21" y1="21" x2="59" y2="21" stroke="#facc15" stroke-width="1.6" stroke-dasharray="6 4"/>
      <!-- Hardened Aircraft Shelters (HAS) -->
      <rect x="12" y="34" width="18" height="14" rx="4" fill="#475569" stroke="#090f1a" stroke-width="1.6"/>
      <path d="M15 48 V39 C15 36 27 36 27 39 V48 Z" fill="#1e293b"/>
      <rect x="12" y="52" width="18" height="14" rx="4" fill="#475569" stroke="#090f1a" stroke-width="1.6"/>
      <path d="M15 66 V57 C15 54 27 54 27 57 V66 Z" fill="#1e293b"/>
      <!-- Helipad & Control Tower -->
      <circle cx="43" cy="52" r="11" fill="#0f172a" stroke="#38bdf8" stroke-width="1.8" stroke-dasharray="4 2"/>
      <path d="M39 47 V57 M47 47 V57 M39 52 H47" stroke="#facc15" stroke-width="2" stroke-linecap="round"/>
      <rect x="57" y="36" width="12" height="12" rx="2" fill="#64748b" stroke="#090f1a" stroke-width="1.5"/>
      <circle cx="63" cy="42" r="3.5" fill="#38bdf8"/>
      <circle cx="62" cy="59" r="5" fill="#94a3b8" stroke="#090f1a" stroke-width="1.5"/>
    </svg>`
  ),
  oil_facility: defineActor(
    'oil_facility',
    'منشأة نفطية',
    '_building',
    { scale: 62, radius: 28 },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
      <rect x="6" y="8" width="68" height="64" rx="5" fill="#1e293b" stroke="#090f1a" stroke-width="2.6"/>
      <rect x="9" y="11" width="62" height="58" rx="3" fill="#273244" stroke="#475569" stroke-width="1"/>
      <!-- Pipeline Manifold -->
      <path d="M14 26 H66 M14 48 H56 M26 14 V62 M46 14 V50" stroke="#94a3b8" stroke-width="2.4" fill="none"/>
      <!-- Crude Oil Floating-Roof Storage Tanks -->
      <circle cx="24" cy="25" r="10.5" fill="#e2e8f0" stroke="#334155" stroke-width="2"/>
      <circle cx="24" cy="25" r="6.5" fill="#cbd5e1" stroke="#64748b" stroke-width="1"/>
      <circle cx="24" cy="52" r="10" fill="#cbd5e1" stroke="#334155" stroke-width="2"/>
      <circle cx="24" cy="52" r="6" fill="#94a3b8" stroke="#64748b" stroke-width="1"/>
      <!-- Fractional Distillation Columns -->
      <circle cx="46" cy="24" r="7.5" fill="#94a3b8" stroke="#0f172a" stroke-width="1.8"/>
      <circle cx="46" cy="24" r="3" fill="#334155"/>
      <rect x="39" y="38" width="16" height="14" rx="2" fill="#475569" stroke="#090f1a" stroke-width="1.6"/>
      <line x1="42" y1="41" x2="52" y2="41" stroke="#cbd5e1" stroke-width="1.5"/>
      <line x1="42" y1="46" x2="52" y2="46" stroke="#cbd5e1" stroke-width="1.5"/>
      <!-- Gas Flare Stack -->
      <circle cx="62" cy="54" r="6.5" fill="#7c2d12" stroke="#090f1a" stroke-width="1.5"/>
      <circle cx="62" cy="54" r="4.2" fill="#f97316"/>
      <circle cx="62" cy="54" r="2.2" fill="#fef08a"/>
    </svg>`
  ),
  radar_outpost: defineActor(
    'radar_outpost',
    'محطة رادار',
    '_building',
    { scale: 54, radius: 24 },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">
      <rect x="8" y="8" width="56" height="56" rx="6" fill="#1e293b" stroke="#090f1a" stroke-width="2.5"/>
      <polygon points="20,14 52,14 58,20 58,52 52,58 20,58 14,52 14,20" fill="#334155" stroke="#475569" stroke-width="1.5"/>
      <circle cx="36" cy="36" r="16" fill="#0c4a6e" stroke="#38bdf8" stroke-width="2"/>
      <circle cx="36" cy="36" r="10" fill="none" stroke="#7dd3fc" stroke-width="1" stroke-dasharray="3 2"/>
      <polygon points="36,36 50,24 53,29" fill="#38bdf8" opacity="0.45"/>
      <line x1="36" y1="36" x2="49" y2="23" stroke="#fef08a" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="36" cy="36" r="3.5" fill="#e2e8f0" stroke="#090f1a" stroke-width="1.4"/>
    </svg>`
  ),
  supply_depot: defineActor(
    'supply_depot',
    'مستودع إمداد',
    '_building',
    { scale: 54, radius: 24 },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">
      <rect x="7" y="9" width="58" height="54" rx="4" fill="#292524" stroke="#090f1a" stroke-width="2.5"/>
      <!-- Corrugated Logistics Warehouses -->
      <rect x="12" y="14" width="22" height="30" rx="2" fill="#78716c" stroke="#090f1a" stroke-width="1.6"/>
      <path d="M12 21 H34 M12 28 H34 M12 35 H34" stroke="#57534e" stroke-width="1.3"/>
      <rect x="38" y="14" width="22" height="30" rx="2" fill="#78716c" stroke="#090f1a" stroke-width="1.6"/>
      <path d="M38 21 H60 M38 28 H60 M38 35 H60" stroke="#57534e" stroke-width="1.3"/>
      <!-- Shipping Containers & Fuel Drums -->
      <rect x="12" y="48" width="16" height="9" rx="1" fill="#b45309" stroke="#090f1a" stroke-width="1.2"/>
      <rect x="31" y="48" width="16" height="9" rx="1" fill="#3f6212" stroke="#090f1a" stroke-width="1.2"/>
      <circle cx="55" cy="52.5" r="4" fill="#d97706" stroke="#090f1a" stroke-width="1.2"/>
    </svg>`
  )
};

function buildStraitMap(): MapPack {
  const width = 1200;
  const height = 800;
  const cellSize = 20;
  const cols = width / cellSize;
  const rows = height / cellSize;
  const navGrid: NavCell[] = new Array(cols * rows).fill(0);

  // ممر بحري (ماء = 1) ينحني حول شبه الجزيرة في المنتصف
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const wx = x * cellSize + 10;
      const wy = y * cellSize + 10;
      const inWestSea = wx < 420 && wy > 320;
      const inStrait = wx >= 380 && wx <= 820 && wy > 460 && wy < 640;
      const inEastSea = wx > 780 && wy > 250;
      if (inWestSea || inStrait || inEastSea) navGrid[y * cols + x] = 1;
    }
  }

  const svgOrUrl = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
    <defs>
      <pattern id="gridStrait" width="60" height="60" patternUnits="userSpaceOnUse">
        <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#94a3b8" stroke-width="0.6" opacity="0.14"/>
      </pattern>
    </defs>
    <rect width="1200" height="800" fill="#1b2636"/>
    <path d="M0,320 L420,320 L420,460 L780,460 L780,250 L1200,250 L1200,800 L0,800 Z" fill="#0b2842"/>
    <path d="M380,640 L820,640 L820,800 L380,800 Z" fill="#253344"/>
    <rect width="1200" height="800" fill="url(#gridStrait)"/>
    <path d="M0,320 L420,320 L420,460 L780,460 L780,250 L1200,250" fill="none" stroke="#38bdf8" stroke-width="3" opacity="0.55"/>
    <path d="M380,800 L380,640 L820,640 L820,800" fill="none" stroke="#38bdf8" stroke-width="2.5" opacity="0.45"/>
    <line x1="220" y1="0" x2="280" y2="320" stroke="#64748b" stroke-width="2.5" stroke-dasharray="10 8"/>
    <line x1="650" y1="0" x2="620" y2="460" stroke="#64748b" stroke-width="2.5" stroke-dasharray="10 8"/>
    <text x="150" y="130" fill="#94a3b8" font-size="22" font-family="IBM Plex Sans Arabic, system-ui, sans-serif">الإقليم الغربي</text>
    <text x="510" y="130" fill="#94a3b8" font-size="22" font-family="IBM Plex Sans Arabic, system-ui, sans-serif">شبه الجزيرة</text>
    <text x="950" y="130" fill="#94a3b8" font-size="22" font-family="IBM Plex Sans Arabic, system-ui, sans-serif">الساحل الشرقي</text>
    <text x="540" y="560" fill="#38bdf8" font-size="20" font-family="IBM Plex Sans Arabic, system-ui, sans-serif" opacity="0.75">المضيق البحري</text>
  </svg>`;

  return {
    id: 'geopolitics_strait',
    title: 'خريطة سياسية: المضيق البحري',
    kind: 'geopolitical',
    width,
    height,
    cellSize,
    cols,
    rows,
    navGrid,
    svgOrUrl,
    unitScaleMultiplier: 0.72,
    anchors: {
      capital_north: { x: 180, y: 200, label: 'العاصمة' },
      peninsula_center: { x: 560, y: 280, label: 'وسط الجزيرة' },
      coast_point_1: { x: 580, y: 420, label: 'نقطة المراقبة' },
      port_south: { x: 180, y: 540, label: 'الميناء الغربي' },
      strait_gate: { x: 600, y: 550, label: 'بوابة المضيق' },
      port_east: { x: 1020, y: 420, label: 'الميناء الشرقي' }
    },
    zones: {
      corridor_south: {
        id: 'corridor_south',
        label: 'ممر المضيق',
        polygon: [
          { x: 400, y: 470 },
          { x: 800, y: 470 },
          { x: 800, y: 635 },
          { x: 400, y: 635 }
        ]
      },
      north_sector: {
        id: 'north_sector',
        label: 'الإقليم الشمالي',
        polygon: [
          { x: 260, y: 40 },
          { x: 630, y: 40 },
          { x: 615, y: 450 },
          { x: 425, y: 450 },
          { x: 425, y: 310 },
          { x: 280, y: 310 }
        ]
      }
    }
  };
}

function buildValleyMap(): MapPack {
  const width = 1200;
  const height = 800;
  const cellSize = 20;
  const cols = width / cellSize;
  const rows = height / cellSize;
  const navGrid: NavCell[] = new Array(cols * rows).fill(0);

  // نهر يقسم الخريطة عموديًا مع جسر واحد في المنتصف + تلال صلبة
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const wx = x * cellSize + 10;
      const wy = y * cellSize + 10;
      const isRiver = wx >= 540 && wx <= 640;
      const isBridge = wy >= 350 && wy <= 430;
      if (isRiver && !isBridge) navGrid[y * cols + x] = 1;
      if (wx >= 760 && wx <= 860 && wy >= 100 && wy <= 280) navGrid[y * cols + x] = 2;
    }
  }

  const svgOrUrl = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
    <defs>
      <pattern id="gridValley" width="60" height="60" patternUnits="userSpaceOnUse">
        <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#e7e5e4" stroke-width="0.6" opacity="0.1"/>
      </pattern>
    </defs>
    <rect width="1200" height="800" fill="#3a4732"/>
    <rect width="1200" height="800" fill="url(#gridValley)"/>
    <path d="M160,400 L530,390 M650,390 L1000,480" stroke="#a8a29e" stroke-width="18" stroke-linecap="round" fill="none" opacity="0.4"/>
    <path d="M450,230 L535,380 M645,380 L950,170" stroke="#a8a29e" stroke-width="10" stroke-linecap="round" fill="none" opacity="0.28"/>
    <rect x="540" y="0" width="100" height="800" fill="#1d4ed8" opacity="0.72"/>
    <line x1="540" y1="0" x2="540" y2="800" stroke="#60a5fa" stroke-width="2" opacity="0.5"/>
    <line x1="640" y1="0" x2="640" y2="800" stroke="#60a5fa" stroke-width="2" opacity="0.5"/>
    <rect x="530" y="350" width="120" height="80" rx="4" fill="#78716c" stroke="#e7e5e4" stroke-width="3.5"/>
    <line x1="534" y1="390" x2="646" y2="390" stroke="#d6d3d1" stroke-width="2" stroke-dasharray="10 8" opacity="0.7"/>
    <rect x="760" y="100" width="100" height="180" rx="20" fill="#57534e" stroke="#292524" stroke-width="4"/>
    <rect x="774" y="122" width="72" height="136" rx="14" fill="#44403c" stroke="#78716c" stroke-width="1.5" opacity="0.7"/>
    <text x="562" y="338" fill="#fef08a" font-size="16" font-family="IBM Plex Sans Arabic, system-ui, sans-serif">الجسر</text>
    <text x="790" y="195" fill="#e7e5e4" font-size="16" font-family="IBM Plex Sans Arabic, system-ui, sans-serif">جبل</text>
  </svg>`;

  return {
    id: 'tactical_valley',
    title: 'خريطة ميدان: الوادي والجسر',
    kind: 'tactical',
    width,
    height,
    cellSize,
    cols,
    rows,
    navGrid,
    svgOrUrl,
    unitScaleMultiplier: 1.0,
    anchors: {
      base_blue: { x: 180, y: 400, label: 'القاعدة الغربية' },
      bridge_mid: { x: 590, y: 390, label: 'الجسر الأوسط' },
      outpost_site: { x: 450, y: 230, label: 'موقع الإمداد' },
      hill_east: { x: 980, y: 490, label: 'المرتفع الشرقي' },
      north_flank: { x: 950, y: 170, label: 'الجناح الشمالي' }
    },
    zones: {
      east_sector: {
        id: 'east_sector',
        label: 'القطاع الشرقي',
        polygon: [
          { x: 660, y: 60 },
          { x: 1140, y: 60 },
          { x: 1140, y: 740 },
          { x: 660, y: 740 }
        ]
      }
    }
  };
}

export const DEMO_MAPS: Record<string, MapPack> = {
  geopolitics_strait: buildStraitMap(),
  tactical_valley: buildValleyMap()
};
