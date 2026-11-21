# Studio Scenario DSL Spec (v0.2)

اكتب ملفات `.scenario.yaml` بهذه البنية فقط. استخدم أسماء المراسي (`anchors`) والمناطق (`zones`) والكيانات (`actors`) الموجودة في الفهرس المرفق (`CATALOG.md`).

## الهيكل الأساسي
- `meta`: `{ title, map, duration_hint?: "<sec>s" }` (`duration_hint` مدة موجبة أكبر من صفر)
- `timeline`: قائمة خطوات، كل خطوة تملك **إما** `at: "<sec>s"` (رقم غير سالب `>= 0`) **أو** `after: "<entity_id>.arrived" | "<entity_id>.built"` (**يُمنع** الجمع بين `at` و`after` في نفس الخطوة):
  - `<entity_id>.arrived`: لوصول وحدة متحركة إلى وجهتها بعد `move` (أو طلعة جوية). لا يُقبل للوحدات الثابتة أو المنشآت.
  - `<entity_id>.built`: لاكتمال بناء منشأة أُنشئت بأمر `construct` (يُطلق مرة واحدة عند وصول البناء إلى 100%).
- إحداثيات المواضع `{ x, y }` يجب أن تقع داخل حدود الخريطة `[0..map.width] × [0..map.height]`.
- معرّفات الوحدات (`spawn[].id`, `construct.id`) يجب أن تكون غير فارغة، بدون مسافات أو نقاط، وفريدة عبر كامل السيناريو (لا يُسمح بإعادة استخدام معرّف مكرر أو استخدام وحدة بعد `remove`).

## الأوامر المتاحة داخل كل خطوة
- `camera`: `{ focus: "<anchor_id> | {x,y}", zoom: number (0.25..4), duration?: "<sec>s" (>= 0) }`
- `caption`: `{ text: string }`
- `sound`: `"build_complete" | "alert_ping" | "move_order" | "spawn_pop" | "jet_takeoff" | "missile_launch" | "explosion" | "ship_horn"`
- `spawn`: `[{ id, actor, at: "<anchor_id> | {x,y}", faction?: "blue"|"red"|"neutral", scale?: number (0.2..4) }]`
- `move`: `{ entity: "<entity_id>", to: "<anchor_id> | {x,y}" }`
- `resize`: `{ entity: "<entity_id>", scale: number (0.2..4) }`
- `construct`: `{ id?: string, actor: "<building_actor>", at: "<anchor_id> | {x,y}", faction?: "blue"|"red"|"neutral", duration?: "<sec>s" (> 0), scale?: number (0.2..4) }`
- `remove`: `{ entity: "<entity_id>" }`
- `strike`: `{ attacker?: "<entity_id>", mode: "airstrike"|"missile", from?: "<anchor_id> | {x,y}", to: "<anchor_id> | {x,y}", radius?: number (> 0), color?: "#hex" }`
- `draw_arrow`: `{ id, from: "<anchor_id> | {x,y}", to: "<anchor_id> | {x,y}", color?: "#hex", dashed?: boolean, duration?: "<sec>s" (> 0) }`
- `zone`: `{ id: "<zone_id>", color: "#hex", opacity?: number (0..1), duration?: "<sec>s" (> 0) }`
- `callout`: `{ id, target: "<entity_id | anchor_id>", text: string, color?: "#hex", duration?: "<sec>s" (> 0) }`
- `pulse`: `{ at: "<anchor_id> | {x,y}", color?: "#hex", radius?: number (> 0) }`
