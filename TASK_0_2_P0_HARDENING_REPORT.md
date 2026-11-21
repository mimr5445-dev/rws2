# TASK 0.2 — P0 Security & Validation Hardening Report

## 1. تثبيت نقطة البداية (Baseline Confirmation)

- **حالة بيئة العمل عند البدء:** Node.js `v22.23.2`، Bun `1.4.4`، TypeScript `7.0.2`، Vite `8.3.8` داخل `/app/applet`.
- **تقرير التدقيق المرجعي (`TASK_0_1_ENGINEERING_BASELINE.md`):** سُلّم في مخرجات التدقيق السابقة (غير مخزّن كملف فعلي في جذر المشروع `/` وفق فحص المجلد الجذري)، وقد تم التحقق من الكود الفعلي لجميع الملفات المستهدفة قبل تطبيق أي تعديل.
- **قائمة الملفات المُعدّلة وأسباب تعديلها:**
  1. `src/packs/packSchema.ts` — إضافة محلل ومعقّم XML/SVG صارم (`sanitizeSvg` و`sanitizeAssetUrl`) وإحكام التحقق من `PackBundle` (`D-01`, `D-06`).
  2. `src/renderer/studioRenderer.ts` — إغلاق ثغرة تخطي الفحص الأمني للـ SVG المضمّن في `loadSvgOrUrlTexture` (`D-01`).
  3. `src/core/engine.ts` — إضافة محلل الوقت الصارم `parseStrictSec` ومنع تنفيذ خطوات `at` المشوّهة عند `tick = 0` ومنع الكتابة فوق كيانات حيّة بمعرّفات مكررة أو فارغة (`D-02`, `D-04`).
  4. `src/core/validator.ts` — منع تكرار المعرّفات أو فراغها عبر `spawn`/`construct`، تحليل دورة حياة الكيان بعد `remove` مع مراعاة الترتيب الزمني و`after`، فرض التنافي بين `at` و`after`، وفحص حدود الخريطة والمعاملات الرقمية (`D-02`, `D-03`, `D-04`, `D-05`).
  5. `STUDIO_SPEC.md` — توثيق القيود المحدّثة (`at` مقابل `after`، الأزمنة غير السالبة، جميع الأصوات الثمانية، أوامر `strike`/`resize`، الحدود والمعاملات).
  6. `src/packs/packSchema.test.ts` و`src/core/core.test.ts` — اختبارات تغطي جميع حالات الهجوم/الرفض والتوافق مع الأصول والسيناريوهات المدمجة.
  7. `TASK_0_2_P0_HARDENING_REPORT.md` — هذا التقرير.

---

## 2. ملخص الإصلاحات حسب العيب (A–F / D-01..D-06)

### A (`D-01`) — حماية SVG والأصول المستوردة
- **في `src/packs/packSchema.ts`:**
  - تنفيذ محلل XML/AST ومعقّم بقائمة سماح صريحة (`sanitizeSvg`) لا يعتمد على `DOMParser` (يعمل في Node والمتصفح):
    - يرفض `<!DOCTYPE`، `<!ENTITY`، `<![CDATA[`، `<?xml-stylesheet`، الوسوم غير المتوازنة، النصوص/الوسوم الزائدة خارج الجذر، وتكرار الخصائص.
    - يسمح فقط بوسوم الرسم الآمنة (`svg`, `g`, `defs`, `linearGradient`, `radialGradient`, `stop`, `pattern`, `clipPath`, `mask`, `rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon`, `path`, `text`, `tspan`, `title`, `desc`).
    - يرفض `<script>`، `<foreignObject>`، جميع خصائص الأحداث `on*` بمختلف حالات الأحرف.
    - يفك ترميز الكيانات (`decodeXmlEntities`) قبل فحص الروابط وCSS لمنع التمويه مثل `&#x6a;avascript:`.
    - يقصر `href`/`xlink:href` على مراجع داخلية `#localId` داخل وسوم التدرج/الأنماط/القص فقط، ويقصر `url(...)` في الخصائص و`style` على المراجع المحلية `url(#id)`، ويرفض `javascript:` و`vbscript:` و`data:` و`http(s):` و`expression(` و`-moz-binding` و`@import`.
    - يعيد تسلسل وثيقة SVG معقّمة ونظيفة.
  - تنفيذ `sanitizeAssetUrl` (وتحديث `isSafeAssetUrl` ليعتمد عليه):
    - يعقّم الـ SVG المضمّن (`<svg` و`<?xml` مع السماح بفواصل الأسطر العادية `\n\r\t` داخل XML ومنع محارف التحكم الخطرة).
    - يفك `data:image/svg+xml` (سواء Base64 أو URL-encoded) ويعيد تعقيمه بـ `sanitizeSvg`، ويرفض أي Base64 فاسد أو SVG خبيث، ويقصر الصور النقطية على `data:image/(png|jpeg|jpg|webp|gif|bmp|avif|x-icon);base64`.
    - يرفض المسارات التي تحتوي `\` أو `//` أو `%5c` أو `..` أو أحرف تحكم/أسطر في الروابط أو مخططات URL غير مصرحة (`http:`, `https:`, `file:`, `javascript:`).
- **في `src/renderer/studioRenderer.ts`:**
  - تعديل `loadSvgOrUrlTexture` لاستدعاء `sanitizeAssetUrl(src)` على **جميع** المدخلات (بما فيها الـ SVG المضمّن الذي كان يتجاوز `isSafeAssetUrl` سابقًا) وعدم تمرير أي SVG غير معقّم إلى `Image`.

### B (`D-02`) — منع المعرّفات المكررة أو الفارغة عبر كل مسارات الإنشاء
- **في `src/core/validator.ts`:**
  - رفض المعرّفات الفارغة أو المكونة من مسافات أو المحتوية على نقاط/مسافات (`isValidEntityId`) في `spawn[].id` و`construct.id`.
  - منع تكرار أي معرّف كيان بين `spawn` و`spawn` أو بين `spawn` و`construct` عبر كامل السيناريو (`seenCreatedIds`).
- **في `src/core/engine.ts`:**
  - تعديل `processOrders` لرفض تنفيذ `spawn` أو `construct` إذا كان المعرّف فارغًا أو موجودًا بالفعل في `this.entities` بدل الاستبدال الصامت.
  - ضمان عدم تصادم معرّفات `construct` التلقائية (`bld_*`) مع أي كيان موجود في `this.entities`.

### C (`D-03`) — دورة حياة الكيان بعد `remove` مع احترام دلالات المحرك
- **في `src/core/validator.ts`:**
  - تنفيذ مسح من مرحلتين يحترم ترتيب التنفيذ الحقيقي في `StudioEngine`:
    - مقارنة الخطوات الزمنية `at` حسب المفتاح الفعلي `(atSec, stepIndex)` وليس مجرد ترتيب مصفوفة YAML (يقبل سيناريوهات `at` غير المرتبة إذا كانت صالحة زمنيًا، ويرفض الاستخدام قبل الإنشاء أو بعد `remove`).
    - رفض استخدام كيان أو إعادة حذفه بعد `remove` عند اشتراك `remove` والاستخدام في نفس توقيت `at` (`stepIndex` أكبر) أو نفس المحفز الشرطي `after: "<X>.arrived"` (`stepIndex` أكبر)، وكذلك في نفس الخطوة (`callout`، `strike.attacker`، `move`، `resize`).
    - كشف حلقات الاعتماد الدورية في `after` (`A -> B -> A` أو الانتظار الذاتي لنفس الخطوة) وكذلك استخدام مخرجات `construct` في نفس الخطوة ضمن `move`/`resize`/`remove` قبل إنشائها في `executeStep`.
  - **توثيق الحالة غير المحددة إحصائيًا (Indeterminate Cross-Branch Case):** عندما يكون الحذف بمؤقت زمني `at: T` والاستخدام مشروطًا بـ `after: "<X>.arrived"` (أو العكس عبر فرعين مختلفين)، يعتمد وقت وصول `X` على فيزياء الحركة ومسار A\* في وقت التشغيل؛ لذا لا يرفض المدقق هذه الحالة خطأً ما لم يكن بالإمكان إثبات استحالة وصول `X` قبل `T` (كأن يُنشأ `X` أو يُؤمر بالحركة زمنيًا بعد `T`).

### D (`D-04`) — تحليل الوقت الصارم ومنع الجمع بين `at` و`after`
- **في `src/core/engine.ts`:**
  - إضافة وتصدير `parseStrictSec`: يقبل فقط الأرقام المنتهية غير السالبة أو النصوص بالصيغة `/^(?:\d+(?:\.\d+)?|\.\d+)(?:\s*s)?$/i`، ويرفض القيم السالبة و`NaN` و`Infinity` و`"12abc"` و`"5ms"` و`""`.
  - تحديث `parseSec` و`estimateDurationSec` و`evaluateTimeline` لاستخدام `parseStrictSec` بحيث لا تنفذ خطوة `at` مشوّهة عند `tick = 0`.
- **في `src/core/validator.ts` و`STUDIO_SPEC.md`:**
  - فرض وجود **أحد** `at` أو `after` فقط، ورفض الجمع بينهما في نفس الخطوة (`at/after`).
  - التحقق من `meta.duration_hint` ومن مدة كل من `camera.duration` (`>= 0`) و`construct.duration`, `draw_arrow.duration`, `zone.duration`, `callout.duration` (`> 0`).

### E (`D-05`) — حدود الإحداثيات والمعاملات الرقمية
- **في `src/core/validator.ts`:**
  - التحقق في `checkPointRef` من أن أي إحداثي `{ x, y }` رقمي منتهٍ ويقع ضمن `[0, map.width] × [0, map.height]`.
  - التحقق من صحة النطاقات والأنواع: `camera.zoom` ضمن `[0.25, 4]`، `zone.opacity` ضمن `[0, 1]`، `scale` ضمن `[0.2, 4]`، `pulse.radius` و`strike.radius` قيم موجبة منتهية ضمن `Math.max(map.width, map.height) * 2`، والتحقق من نصوص `caption.text` و`callout.text` ومعرّفات `draw_arrow.id` و`callout.id`.

### F (`D-06`) — إحكام `PackBundle`
- **في `src/packs/packSchema.ts`:**
  - التحقق من أن `cols` و`rows` أعداد صحيحة موجبة، ومن تطابق `width === cols * cellSize` و`height === rows * cellSize`.
  - فرض `scale > 0` و`radius > 0` (مع السماح بـ `speed >= 0` و`turnRate >= 0` للمنشآت الثابتة).
  - منع تكرار معرّفات الخرائط والكيانات داخل الحزمة الواحدة، وفحص المعرّفات عبر `SAFE_ID_RE`، والتحقق من `actor.extends` مقابل القوالب المعروفة (`KNOWN_TEMPLATES`).
  - إضافة فحص `findDangerousKey` عبر `Object.getOwnPropertyNames` لرفض مفاتيح تلويث النموذج الأولي (`__proto__`, `constructor`, `prototype`) على أي مستوى داخل الحزمة.

---

## 3. الملفات المعدّلة (Modified Files)

- `/src/packs/packSchema.ts`
- `/src/renderer/studioRenderer.ts`
- `/src/core/engine.ts`
- `/src/core/validator.ts`
- `/STUDIO_SPEC.md`
- `/src/packs/packSchema.test.ts`
- `/src/core/core.test.ts`
- `/TASK_0_2_P0_HARDENING_REPORT.md` (ملف التقرير الجديد)

---

## 4. الاختبارات المضافة والمحدّثة

- `src/packs/packSchema.test.ts` (8 اختبارات): تعقيم SVG، حظر XSS و`foreignObject` والكيانات وCSS الخطرة، حظر Base64/SVG المعطوب و`\\` و`//` و`..`، مطابقة `DEMO_MAPS` و`DEMO_ACTORS`، مطابقة `width/height` مع `cols*cellSize` و`rows*cellSize`، رفض `scale/radius <= 0` و`extends` المجهول، رفض المعرّفات المكررة ومفاتيح `__proto__`/`constructor`.
- `src/core/core.test.ts` (16 اختبارًا — 12 أساسيًا + 4 جديدة لـ P0): التحقق من السيناريوهات الأربعة المدمجة، رفض المعرّفات المكررة/الفارغة في المدقق والمحرك، قواعد دورة الحياة بعد `remove` وحالات الترتيب الزمني والشرطي المشترك والمتقاطع، صرامة `parseStrictSec` وتعارض `at+after`، حدود الخريطة، وحدود المعاملات الرقمية.

---

## 5. التحقق من التوافق (Compatibility)

- جميع الخرائط المدمجة (`DEMO_MAPS`: `geopolitics_strait`, `tactical_valley`) وجميع الكيانات المدمجة الـ 14 (`DEMO_ACTORS`) تجتاز `validatePackBundle` و`sanitizeAssetUrl` بصفر أخطاء.
- جميع ملفات السيناريو الأربعة (`strait_crisis`, `valley_advance`, `air_sea_strike`, `world_demo`) تجتاز `validateScenario` بصفر أخطاء (تم تمرير مرجع `world_live` بمرساياته لملف `world_demo.scenario.yaml` داخل الاختبار لأن `world_live` تُولّد ديناميكيًا في المتصفح عبر `worldGeoEngine.ts`).
- فحص التشغيل الفعلي في المتصفح عبر `playwright-cli` على `http://localhost:3000`: تحميل الخرائط والآليات المعقّمة ورسمها في PixiJS بنجاح وبصفر أخطاء أو تحذيرات في الكونسول.

---

## 6. الأوامر المنفّذة ونتائجها (Commands & Outputs)

| الأمر | النتيجة | المخرج المختصر |
|---|---|---|
| `bun install --frozen-lockfile` | نجح (Exit 0) | `Checked 205 installs across 294 packages (no changes)` |
| `bun run lint` (`tsc --noEmit`) | نجح (Exit 0) | لا توجد أخطاء TypeScript |
| `bun run test` (`tsx --test src/core/core.test.ts src/packs/packSchema.test.ts`) | نجح (Exit 0) | `tests 24, pass 24, fail 0` |
| `bun run build && rm -rf dist` | نجح (Exit 0) | اكتمل بناء الإنتاج في `850ms` وأُزيل مجلد `dist/` المؤقت |
| `playwright-cli open http://localhost:3000` + `console` + `screenshot` | نجح (Exit 0) | `Errors: 0, Warnings: 0`، وظهر المشهد كاملاً دون أخطاء أصول |

---

## 7. ملاحظات السلوك المشدّد عمدًا (Intentional Hardening Notes)

- في `src/packs/packSchema.test.ts` (السطر 21 سابقًا)، كانت القيمة الاختبارية `'data:image/svg+xml;base64,AAA'` تُمرَّر كحالة صالحة رغم أنها ليست Base64 SVG صالحة (تفك إلى بايتات تالفة). بعد تطبيق فحص وفك تعقيم الـ SVG الفعلي لروابط `data:image/svg+xml`، جرى تحديث الاختبار لاستخدام SVG مرمّز بـ Base64 صالح مع إضافة تأكيد صريح برفض `'data:image/svg+xml;base64,AAA'`.

---

## 8. تأكيد الالتزام بنطاق المهمة (Out-of-Scope Confirmation)

لم يتم إجراء أي تعديل خارج نطاق TASK 0.2:
- لم يُعاد تصميم أو هيكلة `src/App.tsx` أو الواجهة الرسومية.
- لم تُغيّر فيزياء الحركة أو A\* في `src/core/pathfinding.ts` أو بنية عارض PixiJS.
- لم تُعدّل دورة حياة `MediaRecorder` أو `SoundSynth`، ولا تصميم `studioDb`/`PackRegistry`، ولا الحزم أو `package.json`/`bun.lock`، ولا مصادر GeoJSON في `worldGeoEngine.ts`.

---

## 9. الحالة النهائية والخطوة التالية

اكتملت جميع إصلاحات P0 (A–F) ونجحت اختبارات التحقق والبناء والفحص البصري دون أخطاء. العمل متوقف الآن بانتظار مراجعة قائد المشروع قبل الانتقال إلى **TASK 0.3**.
