import test from 'node:test';
import assert from 'node:assert/strict';
import * as yaml from 'js-yaml';
import { isSafeAssetUrl, sanitizeAssetUrl, sanitizeSvg, validatePackBundle } from './packSchema';
import { DEMO_ACTORS, DEMO_MAPS } from './demoPacks';
import { STUDIO_ACTORS } from './studioUnits';

const goodMap = {
  id: 'm1', title: 'Map', kind: 'tactical', width: 40, height: 40, cellSize: 10,
  cols: 4, rows: 4, navGrid: new Array(16).fill(0), svgOrUrl: '<svg viewBox="0 0 40 40"></svg>',
  anchors: { a: { x: 1, y: 2 } }, zones: {},
};
const goodActor = { id: 'tank', label: 'Tank', svg: '<svg></svg>', kind: 'vehicle', domain: 'land', speed: 3 };
const validSvgB64 = 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==';

test('a well-formed bundle and all built-in DEMO_MAPS / DEMO_ACTORS pass validation', () => {
  assert.deepEqual(validatePackBundle({ maps: [goodMap], actors: [goodActor] }), []);
  assert.deepEqual(
    validatePackBundle({
      maps: Object.values(DEMO_MAPS),
      actors: Object.values(DEMO_ACTORS)
    }),
    []
  );
  for (const m of Object.values(DEMO_MAPS)) {
    assert.ok(sanitizeAssetUrl(m.svgOrUrl), `built-in map ${m.id} svgOrUrl must sanitize cleanly`);
  }
  for (const a of Object.values(DEMO_ACTORS)) {
    assert.ok(sanitizeAssetUrl(a.svg), `built-in actor ${a.id} svg must sanitize cleanly`);
  }
  assert.deepEqual(
    validatePackBundle({
      actors: Object.values(STUDIO_ACTORS)
    }),
    []
  );
  for (const a of Object.values(STUDIO_ACTORS)) {
    assert.ok(sanitizeAssetUrl(a.svg), `studio actor ${a.id} svg must sanitize cleanly`);
    assert.ok(a.ability && a.ability.label && a.ability.mode, `studio actor ${a.id} must define an ability`);
  }
});

test('external URLs, backslashes, and unsafe paths are rejected while valid local, blob, and valid data URLs are accepted', () => {
  assert.equal(isSafeAssetUrl('https://evil.example/x.svg'), false);
  assert.equal(isSafeAssetUrl('http://evil.example/x.svg'), false);
  assert.equal(isSafeAssetUrl('//evil.example/x.svg'), false);
  assert.equal(isSafeAssetUrl('\\\\evil\\share\\x.svg'), false);
  assert.equal(isSafeAssetUrl('assets\\map.svg'), false);
  assert.equal(isSafeAssetUrl('/%5cevil/x.svg'), false);
  assert.equal(isSafeAssetUrl('../secret.svg'), false);
  assert.equal(isSafeAssetUrl('javascript:alert(1)'), false);
  assert.equal(isSafeAssetUrl('blob:https://app/123'), true);
  assert.equal(isSafeAssetUrl(`data:image/svg+xml;base64,${validSvgB64}`), true);
  assert.equal(isSafeAssetUrl('data:image/svg+xml;base64,AAA'), false);
  assert.equal(isSafeAssetUrl('data:image/png;base64,iVBORw0KGgo='), true);
  assert.equal(isSafeAssetUrl('/assets/map.svg'), true);
  assert.equal(isSafeAssetUrl('<svg></svg>'), true);
});

test('sanitizeSvg blocks scripts, event handlers, foreignObject, entities, and obfuscated URLs while keeping valid SVG', () => {
  assert.equal(sanitizeSvg('<svg><script>alert(1)</script></svg>'), null);
  assert.equal(sanitizeSvg('<svg onload="alert(1)"><rect width="10" height="10"/></svg>'), null);
  assert.equal(sanitizeSvg('<svg><rect OnClick="alert(1)" width="10" height="10"/></svg>'), null);
  assert.equal(sanitizeSvg('<svg><foreignObject><div>xss</div></foreignObject></svg>'), null);
  assert.equal(sanitizeSvg('<!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><svg/>'), null);
  assert.equal(sanitizeSvg('<svg><a href="javascript:alert(1)"><rect width="10" height="10"/></a></svg>'), null);
  assert.equal(sanitizeSvg('<svg><defs><linearGradient xlink:href="javascript:alert(1)"/></defs></svg>'), null);
  assert.equal(sanitizeSvg('<svg><defs><linearGradient xlink:href="&#x6a;avascript:alert(1)"/></defs></svg>'), null);
  assert.equal(sanitizeSvg('<svg><rect style="fill:url(https://evil.example/p)" width="10" height="10"/></svg>'), null);
  assert.equal(sanitizeSvg('<svg><rect style="width:expression(alert(1))" width="10" height="10"/></svg>'), null);

  const maliciousB64 = Buffer.from('<svg onload="alert(1)"></svg>', 'utf8').toString('base64');
  assert.equal(isSafeAssetUrl(`data:image/svg+xml;base64,${maliciousB64}`), false);
  assert.equal(isSafeAssetUrl('data:image/svg+xml,%3Csvg%20onload%3Dalert(1)%3E%3C/svg%3E'), false);

  const clean = sanitizeSvg(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0ea5e9"/></linearGradient></defs><rect width="64" height="64" fill="url(#g1)" style="opacity:0.9;stroke:#111"/></svg>'
  );
  assert.ok(clean && clean.startsWith('<svg ') && clean.includes('url(#g1)'));
});

test('navGrid size and map dimensions (cols × cellSize, rows × cellSize) must match', () => {
  const errsGrid = validatePackBundle({ maps: [{ ...goodMap, navGrid: [0, 0] }] });
  assert.ok(errsGrid.some((e) => e.includes('navGrid')));

  const errsDims = validatePackBundle({ maps: [{ ...goodMap, width: 99, cols: 4.5 }] });
  assert.ok(errsDims.some((e) => e.includes('cols')));
  assert.ok(errsDims.some((e) => e.includes('width')));
});

test('a bundle with a bad actor (negative speed, non-positive scale/radius, unknown extends) is rejected', () => {
  const errs = validatePackBundle({
    actors: [{ ...goodActor, speed: -1, scale: 0, radius: -4, extends: '_spaceship' }]
  });
  assert.ok(errs.some((e) => e.startsWith('actors[0]') && e.includes('speed')));
  assert.ok(errs.some((e) => e.startsWith('actors[0]') && e.includes('scale')));
  assert.ok(errs.some((e) => e.startsWith('actors[0]') && e.includes('radius')));
  assert.ok(errs.some((e) => e.startsWith('actors[0]') && e.includes('extends')));
});

test('non-object input, duplicate IDs, invalid IDs, and prototype-pollution keys are rejected', () => {
  assert.notEqual(validatePackBundle(null).length, 0);
  assert.notEqual(validatePackBundle('text').length, 0);

  const dupErrs = validatePackBundle({
    maps: [goodMap, { ...goodMap }],
    actors: [goodActor, { ...goodActor }]
  });
  assert.ok(dupErrs.some((e) => e.includes('maps[1]') && e.includes('مكرر')));
  assert.ok(dupErrs.some((e) => e.includes('actors[1]') && e.includes('مكرر')));

  const badIdErrs = validatePackBundle({
    maps: [{ ...goodMap, id: '../bad map' }],
    actors: [{ ...goodActor, id: 'tank.v1' }]
  });
  assert.ok(badIdErrs.some((e) => e.startsWith('maps[0]')));
  assert.ok(badIdErrs.some((e) => e.startsWith('actors[0]')));

  const protoPayload = JSON.parse('{"__proto__":{"polluted":true},"maps":[]}');
  assert.ok(validatePackBundle(protoPayload).some((e) => e.includes('__proto__')));

  const ctorYaml = yaml.load('constructor:\n  evil: true\nactors: []');
  assert.ok(validatePackBundle(ctorYaml).some((e) => e.includes('constructor')));
});

test('navGrid cell values, zones polygons, and unitScaleMultiplier are validated', () => {
  const badGrid = new Array(16).fill(0);
  badGrid[3] = 99;
  const errs = validatePackBundle({
    maps: [
      {
        ...goodMap,
        navGrid: badGrid,
        unitScaleMultiplier: -0.5,
        zones: { z1: { id: 'z1', label: 'bad', polygon: [{ x: 0, y: 0 }] } }
      }
    ]
  });
  assert.ok(errs.some((e) => e.includes('navGrid')));
  assert.ok(errs.some((e) => e.includes('unitScaleMultiplier')));
  assert.ok(errs.some((e) => e.includes('z1')));
});

test('air actor kind is accepted by packSchema', () => {
  const airActor = {
    id: 'recon_drone',
    label: 'طائرة استطلاع',
    svg: '<svg viewBox="0 0 64 64"></svg>',
    kind: 'air',
    domain: 'air',
    speed: 190
  };
  assert.deepEqual(validatePackBundle({ actors: [airActor] }), []);
});
