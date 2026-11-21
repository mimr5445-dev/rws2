import { ActorPack, MapPack } from './types';

export function generateCatalogMarkdown(
  maps: Record<string, MapPack>,
  actors: Record<string, ActorPack>
): string {
  const lines: string[] = ['# Studio Auto-Generated Catalog (CATALOG.md)', ''];

  lines.push('## الخرائط المتاحة (`meta.map`)');
  for (const m of Object.values(maps)) {
    lines.push(`### - \`${m.id}\` (${m.title}) [${m.kind}]`);
    const anchors = Object.entries(m.anchors)
      .map(([k, v]) => `\`${k}\`${v.label ? ` (${v.label})` : ''}`)
      .join('، ');
    const zones = Object.entries(m.zones)
      .map(([k, v]) => `\`${k}\`${v.label ? ` (${v.label})` : ''}`)
      .join('، ');
    lines.push(`  - **Anchors:** ${anchors || 'لا يوجد'}`);
    lines.push(`  - **Zones:** ${zones || 'لا يوجد'}`);
  }

  lines.push('', '## الكيانات والأدوات المتاحة (`actors`)');
  for (const a of Object.values(actors)) {
    lines.push(`- \`${a.id}\`: ${a.label} (النوع: ${a.kind}، النطاق: ${a.domain})`);
  }

  return lines.join('\n');
}

export function buildAiScenarioPrompt(
  maps: Record<string, MapPack>,
  actors: Record<string, ActorPack>,
  topic: string
): string {
  const catalog = generateCatalogMarkdown(maps, actors);
  return `أنت مخرج سيناريوهات بصرية لاستوديو محاكاة خرائط.
اكتب ملف سيناريو بصيغة YAML صالحة تمامًا يشرح/ينفذ الموضوع التالي:
"${topic}"

التزم التزامًا صارمًا بهذه القواعد فقط:
- الأوامر المسموحة في timeline: at, after ("<id>.arrived"), camera {focus, zoom, duration}, caption {text}, sound ("build_complete"|"alert_ping"|"move_order"|"spawn_pop"|"jet_takeoff"|"missile_launch"|"explosion"|"ship_horn"), spawn [{id, actor, at, faction, scale?}], move {entity, to}, construct {id, actor, at, faction, duration, scale?}, resize {entity, scale}, remove {entity}, strike {attacker?, mode ("airstrike"|"missile"), from?, to, radius?, color?}, draw_arrow {id, from, to, color, dashed, duration}, zone {id, color, opacity, duration}, callout {id, target, text, color, duration}, pulse {at, color, radius}.
- لا تخترع أسماء مراسي أو مناطق أو كيانات خارج الفهرس أدناه.
- أخرج كود YAML فقط دون شرح إضافي.

${catalog}`;
}
