// Structural validation, prototype-pollution guards, and XML-based SVG sanitization
// for imported pack bundles and assets.
import { ActorPack, Domain, MapPack, PackBundle } from '../core/types';

const MAP_KINDS = ['geopolitical', 'tactical'] as const;
const ACTOR_KINDS = ['person', 'vehicle', 'ship', 'building', 'air'] as const;
const DOMAINS: Domain[] = ['land', 'sea', 'air'];
const KNOWN_TEMPLATES = new Set([
  '_person',
  '_vehicle',
  '_ship',
  '_carrier',
  '_sub',
  '_air',
  '_heli',
  '_building'
]);
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const SAFE_ID_RE = /^[A-Za-z0-9_-]{1,80}$/;

const SVG_ALLOWED_TAGS = new Set([
  'svg',
  'g',
  'defs',
  'linearGradient',
  'radialGradient',
  'stop',
  'pattern',
  'clipPath',
  'mask',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'path',
  'text',
  'tspan',
  'title',
  'desc'
]);

const SVG_ALLOWED_TAGS_LOWER = new Map<string, string>(
  [...SVG_ALLOWED_TAGS].map((t) => [t.toLowerCase(), t])
);

const SVG_ALLOWED_ATTRS = new Set([
  'xmlns',
  'xmlns:xlink',
  'viewbox',
  'width',
  'height',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'fx',
  'fy',
  'dx',
  'dy',
  'd',
  'points',
  'offset',
  'stop-color',
  'stop-opacity',
  'fill',
  'fill-opacity',
  'fill-rule',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-opacity',
  'opacity',
  'transform',
  'id',
  'class',
  'clip-path',
  'clip-rule',
  'mask',
  'patternunits',
  'gradientunits',
  'gradienttransform',
  'spreadmethod',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'text-anchor',
  'dominant-baseline',
  'preserveaspectratio',
  'style',
  'href',
  'xlink:href'
]);

const SVG_CANONICAL_ATTR_CASE: Record<string, string> = {
  viewbox: 'viewBox',
  patternunits: 'patternUnits',
  gradientunits: 'gradientUnits',
  gradienttransform: 'gradientTransform',
  spreadmethod: 'spreadMethod',
  preserveaspectratio: 'preserveAspectRatio'
};

const SAFE_CSS_PROPS = new Set([
  'fill',
  'fill-opacity',
  'fill-rule',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-opacity',
  'opacity',
  'stop-color',
  'stop-opacity',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'text-anchor',
  'dominant-baseline',
  'clip-rule',
  'display',
  'visibility'
]);

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isPosNum = (v: unknown): v is number => isNum(v) && v > 0;

function decodeXmlEntities(input: string): string {
  return input.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|lt|gt|amp|quot|apos);/g, (full, ent: string) => {
    switch (ent) {
      case 'lt':
        return '<';
      case 'gt':
        return '>';
      case 'amp':
        return '&';
      case 'quot':
        return '"';
      case 'apos':
        return "'";
      default: {
        const code = ent.startsWith('#x') || ent.startsWith('#X')
          ? parseInt(ent.slice(2), 16)
          : parseInt(ent.slice(1), 10);
        if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return full;
        if (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) return '';
        return String.fromCodePoint(code);
      }
    }
  });
}

function escapeXmlText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeXmlAttr(s: string): string {
  return escapeXmlText(s).replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function hasDangerousSchemeOrUrl(decoded: string): boolean {
  const collapsed = decoded.replace(/[\s\u0000-\u001f]+/g, '').toLowerCase();
  if (
    collapsed.includes('javascript:') ||
    collapsed.includes('vbscript:') ||
    collapsed.includes('data:') ||
    collapsed.includes('http:') ||
    collapsed.includes('https:') ||
    collapsed.includes('file:') ||
    collapsed.includes('ftp:') ||
    collapsed.includes('expression(') ||
    collapsed.includes('-moz-binding') ||
    collapsed.includes('@import') ||
    collapsed.includes('\\\\') ||
    collapsed.includes('//')
  ) {
    return true;
  }
  // Check every url(...) reference: allow only strictly local fragment url(#id)
  const urlRe = /url\s*\(([^)]*)\)/gi;
  let m: RegExpExecArray | null;
  while ((m = urlRe.exec(decoded)) !== null) {
    const inner = m[1].trim().replace(/^['"]|['"]$/g, '').trim();
    if (!/^#[A-Za-z_][A-Za-z0-9_-]*$/.test(inner)) {
      return true;
    }
  }
  return false;
}

function validateSafeCssStyle(rawDecoded: string): string | null {
  if (hasDangerousSchemeOrUrl(rawDecoded)) return null;
  const parts = rawDecoded.split(';');
  const safeParts: string[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const colon = trimmed.indexOf(':');
    if (colon <= 0) return null;
    const prop = trimmed.slice(0, colon).trim().toLowerCase();
    const val = trimmed.slice(colon + 1).trim();
    if (!SAFE_CSS_PROPS.has(prop) || !val) return null;
    if (hasDangerousSchemeOrUrl(val) || /[{}<>\\]/.test(val)) return null;
    safeParts.push(`${prop}:${val}`);
  }
  return safeParts.join(';');
}

function validateSvgAttribute(tagName: string, attrNameRaw: string, attrValueRaw: string): [string, string] | null {
  const lower = attrNameRaw.toLowerCase();
  if (lower.startsWith('on')) return null;
  if (!SVG_ALLOWED_ATTRS.has(lower)) return null;

  const decoded = decodeXmlEntities(attrValueRaw);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(decoded)) return null;

  if (lower === 'xmlns') {
    if (tagName !== 'svg' || decoded.trim() !== 'http://www.w3.org/2000/svg') return null;
    return ['xmlns', 'http://www.w3.org/2000/svg'];
  }
  if (lower === 'xmlns:xlink') {
    if (decoded.trim() !== 'http://www.w3.org/1999/xlink') return null;
    return ['xmlns:xlink', 'http://www.w3.org/1999/xlink'];
  }
  if (lower === 'href' || lower === 'xlink:href') {
    if (tagName !== 'linearGradient' && tagName !== 'radialGradient' && tagName !== 'pattern' && tagName !== 'clipPath') {
      return null;
    }
    if (!/^#[A-Za-z_][A-Za-z0-9_-]*$/.test(decoded.trim())) return null;
    return [lower, decoded.trim()];
  }
  if (lower === 'style') {
    const sanitizedCss = validateSafeCssStyle(decoded);
    if (sanitizedCss === null) return null;
    return ['style', sanitizedCss];
  }
  if (hasDangerousSchemeOrUrl(decoded)) return null;

  const canonicalName = SVG_CANONICAL_ATTR_CASE[lower] ?? attrNameRaw;
  return [canonicalName, decoded];
}

interface SvgNode {
  tag: string;
  attrs: Array<[string, string]>;
  children: Array<SvgNode | string>;
}

/**
 * Parses and sanitizes an XML SVG document using an explicit tag/attribute allowlist.
 * Returns canonical sanitized SVG markup, or null if invalid or containing unsafe constructs.
 */
export function sanitizeSvg(raw: string): string | null {
  if (typeof raw !== 'string') return null;
  let src = raw.replace(/^\uFEFF/, '').trim();
  if (!src) return null;

  // Optional leading XML declaration (reject stylesheet/external PIs)
  if (src.startsWith('<?xml')) {
    const endPi = src.indexOf('?>');
    if (endPi === -1) return null;
    const pi = src.slice(0, endPi + 2);
    if (/stylesheet|href|encoding\s*=\s*["']utf-16/i.test(pi)) return null;
    src = src.slice(endPi + 2).trim();
  }

  if (/<!DOCTYPE|<!ENTITY|<!\[CDATA\[|<\?/i.test(src)) return null;

  let pos = 0;
  const len = src.length;
  const stack: SvgNode[] = [];
  let root: SvgNode | null = null;

  const skipWs = () => {
    while (pos < len && /\s/.test(src[pos])) pos++;
  };

  while (pos < len) {
    if (src[pos] === '<') {
      if (src.startsWith('<!--', pos)) {
        const endC = src.indexOf('-->', pos + 4);
        if (endC === -1) return null;
        pos = endC + 3;
        continue;
      }
      if (src.startsWith('</', pos)) {
        pos += 2;
        const m = /^[A-Za-z_][A-Za-z0-9:_-]*/.exec(src.slice(pos));
        if (!m) return null;
        const closeTag = m[0];
        pos += closeTag.length;
        skipWs();
        if (src[pos] !== '>') return null;
        pos++;
        const top = stack.pop();
        if (!top || top.tag !== closeTag) return null;
        continue;
      }

      // Opening or self-closing tag
      if (src[pos + 1] === '!' || src[pos + 1] === '?') return null;
      pos++;
      const tagMatch = /^[A-Za-z_][A-Za-z0-9:_-]*/.exec(src.slice(pos));
      if (!tagMatch) return null;
      const rawTag = tagMatch[0];
      const canonicalTag = SVG_ALLOWED_TAGS_LOWER.get(rawTag.toLowerCase());
      if (!canonicalTag || rawTag !== canonicalTag) return null;
      if (stack.length === 0 && (root !== null || canonicalTag !== 'svg')) return null;

      pos += rawTag.length;
      const attrs: Array<[string, string]> = [];
      const seenAttrs = new Set<string>();
      let selfClosing = false;

      while (pos < len) {
        const beforeWs = pos;
        skipWs();
        if (src.startsWith('/>', pos)) {
          selfClosing = true;
          pos += 2;
          break;
        }
        if (src[pos] === '>') {
          pos++;
          break;
        }
        if (pos === beforeWs) return null; // Missing whitespace between attributes

        const attrMatch = /^([A-Za-z_][A-Za-z0-9:_-]*)\s*=\s*("([^"]*)"|'([^']*)')/.exec(src.slice(pos));
        if (!attrMatch) return null;
        const attrName = attrMatch[1];
        const attrVal = attrMatch[3] ?? attrMatch[4] ?? '';
        pos += attrMatch[0].length;

        const lowerAttr = attrName.toLowerCase();
        if (seenAttrs.has(lowerAttr)) return null;
        seenAttrs.add(lowerAttr);

        const validated = validateSvgAttribute(canonicalTag, attrName, attrVal);
        if (!validated) return null;
        attrs.push(validated);
      }

      if (pos > len) return null;

      const node: SvgNode = { tag: canonicalTag, attrs, children: [] };
      if (stack.length === 0) {
        root = node;
      } else {
        stack[stack.length - 1].children.push(node);
      }
      if (!selfClosing) {
        stack.push(node);
        if (stack.length > 64) return null;
      }
    } else {
      const nextLt = src.indexOf('<', pos);
      const textChunk = src.slice(pos, nextLt === -1 ? len : nextLt);
      pos = nextLt === -1 ? len : nextLt;
      if (stack.length === 0) {
        if (textChunk.trim() !== '') return null;
      } else {
        const decodedText = decodeXmlEntities(textChunk);
        if (decodedText.trim()) {
          if (stack[stack.length - 1].tag !== 'text' && stack[stack.length - 1].tag !== 'tspan' &&
              stack[stack.length - 1].tag !== 'title' && stack[stack.length - 1].tag !== 'desc') {
            // Ignore harmless whitespace; reject unexpected stray text outside text containers
            if (textChunk.trim() !== '') return null;
          } else {
            stack[stack.length - 1].children.push(decodedText);
          }
        }
      }
    }
  }

  if (stack.length !== 0 || !root || root.tag !== 'svg') return null;

  const serialize = (n: SvgNode): string => {
    const attrStr = n.attrs.map(([k, v]) => ` ${k}="${escapeXmlAttr(v)}"`).join('');
    if (n.children.length === 0) return `<${n.tag}${attrStr}/>`;
    const body = n.children
      .map((c) => (typeof c === 'string' ? escapeXmlText(c) : serialize(c)))
      .join('');
    return `<${n.tag}${attrStr}>${body}</${n.tag}>`;
  };

  return serialize(root);
}

function decodeBase64Utf8(b64: string): string | null {
  const clean = b64.replace(/\s+/g, '');
  if (!clean || clean.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(clean)) {
    return null;
  }
  try {
    const bin = atob(clean);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/**
 * Validates and sanitizes an asset source (inline SVG, data: URL, blob: URL, or local relative path).
 * Returns a sanitized URL/SVG string ready for safe loading, or null if unsafe/malformed.
 */
export function sanitizeAssetUrl(src: string): string | null {
  if (typeof src !== 'string') return null;
  const s = src.trim();
  if (!s || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(s)) return null;

  // Inline SVG markup or XML prolog (allows normal \t, \n, \r formatting inside XML)
  if (/^(?:<\?xml\b|<svg\b)/i.test(s)) {
    return sanitizeSvg(s);
  }

  // Non-inline URLs must not contain CR/LF/TAB or any control characters
  if (/[\t\r\n]/.test(s)) return null;

  // Reject all backslashes and UNC / protocol-relative URLs
  if (s.includes('\\') || s.startsWith('//') || /%5c/i.test(s)) return null;

  // data:image/* handling
  if (/^data:/i.test(s)) {
    const commaIdx = s.indexOf(',');
    if (commaIdx === -1) return null;
    const header = s.slice(5, commaIdx).toLowerCase();
    const payload = s.slice(commaIdx + 1);
    const isB64 = /;base64(?:;|$)/.test(header);

    if (header.startsWith('image/svg+xml')) {
      let decodedSvg: string | null = null;
      if (isB64) {
        decodedSvg = decodeBase64Utf8(payload);
      } else {
        try {
          decodedSvg = decodeURIComponent(payload);
        } catch {
          return null;
        }
      }
      if (!decodedSvg) return null;
      const safeSvg = sanitizeSvg(decodedSvg);
      if (!safeSvg) return null;
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(safeSvg)}`;
    }

    if (/^image\/(?:png|jpeg|jpg|webp|gif|bmp|avif|x-icon);base64$/.test(header)) {
      const cleanB64 = payload.replace(/\s+/g, '');
      if (!cleanB64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(cleanB64)) return null;
      return s;
    }

    return null;
  }

  // blob: URL handling
  if (/^blob:/i.test(s)) {
    try {
      const parsed = new URL(s);
      if (parsed.protocol !== 'blob:' || !parsed.pathname) return null;
      return s;
    } catch {
      return null;
    }
  }

  // Reject any other explicit URL scheme (http:, https:, javascript:, file:, etc.)
  if (/^[a-z][a-z0-9+.-]*:/i.test(s) || s.includes(':')) return null;

  // Safe local relative paths only (no spaces, no '..' traversal, no query/hash smuggling)
  if (!/^(?:\/|\.\/)?[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/.test(s)) return null;
  if (s.split('/').some((seg) => seg === '..')) return null;

  return s;
}

export function isSafeAssetUrl(src: string): boolean {
  return sanitizeAssetUrl(src) !== null;
}

function findDangerousKey(val: unknown, where: string, seen = new WeakSet<object>()): string | null {
  if (typeof val !== 'object' || val === null) return null;
  if (seen.has(val)) return null;
  seen.add(val);

  if (Array.isArray(val)) {
    for (let i = 0; i < val.length; i++) {
      const found = findDangerousKey(val[i], `${where}[${i}]`, seen);
      if (found) return found;
    }
    return null;
  }

  for (const key of Object.getOwnPropertyNames(val)) {
    if (DANGEROUS_KEYS.has(key)) {
      return `${where}: المفتاح الخطر "${key}" مرفوض لأسباب أمنية`;
    }
    const found = findDangerousKey((val as Record<string, unknown>)[key], `${where}.${key}`, seen);
    if (found) return found;
  }
  return null;
}

export function validateMapPack(m: unknown, where: string): string[] {
  const errs: string[] = [];
  if (!isObj(m)) return [`${where}: يجب أن تكون الخريطة كائنًا`];
  const id = m.id;
  const at = `${where} (${typeof id === 'string' ? id : '?'})`;

  if (typeof m.id !== 'string' || !SAFE_ID_RE.test(m.id) || DANGEROUS_KEYS.has(m.id)) {
    errs.push(`${at}: معرّف الخريطة غير صالح (استخدم أحرفًا وأرقامًا و _ و - فقط)`);
  }
  if (typeof m.title !== 'string' || m.title.trim().length === 0) errs.push(`${at}: العنوان مطلوب`);
  if (!MAP_KINDS.includes(m.kind as (typeof MAP_KINDS)[number])) {
    errs.push(`${at}: kind يجب أن يكون geopolitical أو tactical`);
  }

  for (const k of ['width', 'height', 'cellSize', 'cols', 'rows'] as const) {
    if (!isPosNum(m[k])) errs.push(`${at}: ${k} يجب أن يكون رقمًا موجبًا`);
  }
  if (isPosNum(m.cols) && !Number.isInteger(m.cols)) errs.push(`${at}: cols يجب أن يكون عددًا صحيحًا موجبًا`);
  if (isPosNum(m.rows) && !Number.isInteger(m.rows)) errs.push(`${at}: rows يجب أن يكون عددًا صحيحًا موجبًا`);

  if (isPosNum(m.width) && isPosNum(m.cellSize) && isPosNum(m.cols) && Math.abs(m.cols * m.cellSize - m.width) > 1e-6) {
    errs.push(`${at}: width (${m.width}) لا يطابق cols × cellSize (${m.cols * m.cellSize})`);
  }
  if (isPosNum(m.height) && isPosNum(m.cellSize) && isPosNum(m.rows) && Math.abs(m.rows * m.cellSize - m.height) > 1e-6) {
    errs.push(`${at}: height (${m.height}) لا يطابق rows × cellSize (${m.rows * m.cellSize})`);
  }

  if (isPosNum(m.cols) && isPosNum(m.rows)) {
    if (!Array.isArray(m.navGrid) || m.navGrid.length !== m.cols * m.rows) {
      errs.push(`${at}: navGrid يجب أن يحتوي cols × rows عنصرًا`);
    } else if (!m.navGrid.every((c) => c === 0 || c === 1 || c === 2 || c === 3)) {
      errs.push(`${at}: خلايا navGrid يجب أن تكون من القيم 0 أو 1 أو 2 أو 3`);
    }
  } else if (!Array.isArray(m.navGrid)) {
    errs.push(`${at}: navGrid مطلوب`);
  }

  if (m.unitScaleMultiplier !== undefined && !isPosNum(m.unitScaleMultiplier)) {
    errs.push(`${at}: unitScaleMultiplier يجب أن يكون رقمًا موجبًا`);
  }
  if (typeof m.svgOrUrl !== 'string' || !m.svgOrUrl) {
    errs.push(`${at}: svgOrUrl مطلوب`);
  } else if (!isSafeAssetUrl(m.svgOrUrl)) {
    errs.push(`${at}: svgOrUrl غير آمن أو غير صالح (يجب أن يكون SVG معقّمًا أو رابطًا محليًا آمنًا)`);
  }

  if (!isObj(m.anchors)) {
    errs.push(`${at}: anchors يجب أن يكون كائنًا`);
  } else {
    for (const [name, p] of Object.entries(m.anchors)) {
      if (!SAFE_ID_RE.test(name) || DANGEROUS_KEYS.has(name)) {
        errs.push(`${at}: معرّف المرساة "${name}" غير صالح`);
      }
      if (!isObj(p) || !isNum(p.x) || !isNum(p.y)) {
        errs.push(`${at}: المرساة ${name} يجب أن تحمل x و y رقميين`);
      }
    }
  }

  if (!isObj(m.zones)) {
    errs.push(`${at}: zones يجب أن يكون كائنًا`);
  } else {
    for (const [zName, z] of Object.entries(m.zones)) {
      if (!SAFE_ID_RE.test(zName) || DANGEROUS_KEYS.has(zName)) {
        errs.push(`${at}: معرّف المنطقة "${zName}" غير صالح`);
      }
      if (
        !isObj(z) ||
        !Array.isArray(z.polygon) ||
        z.polygon.length < 3 ||
        !z.polygon.every((p) => isObj(p) && isNum(p.x) && isNum(p.y))
      ) {
        errs.push(`${at}: المنطقة ${zName} يجب أن تحتوي مضلعًا من 3 نقاط صالحة على الأقل`);
      }
    }
  }
  return errs;
}

export function validateActorPack(a: unknown, where: string): string[] {
  const errs: string[] = [];
  if (!isObj(a)) return [`${where}: يجب أن يكون الكيان كائنًا`];
  const at = `${where} (${typeof a.id === 'string' ? a.id : '?'})`;

  if (typeof a.id !== 'string' || !SAFE_ID_RE.test(a.id) || DANGEROUS_KEYS.has(a.id)) {
    errs.push(`${at}: معرّف الكيان غير صالح (استخدم أحرفًا وأرقامًا و _ و - فقط)`);
  }
  if (typeof a.label !== 'string' || a.label.trim().length === 0) errs.push(`${at}: label مطلوب`);
  if (typeof a.svg !== 'string' || !a.svg) {
    errs.push(`${at}: svg مطلوب`);
  } else if (!isSafeAssetUrl(a.svg)) {
    errs.push(`${at}: svg غير آمن أو غير صالح (يجب أن يكون SVG معقّمًا أو رابطًا محليًا آمنًا)`);
  }
  if (a.extends !== undefined && (typeof a.extends !== 'string' || !KNOWN_TEMPLATES.has(a.extends))) {
    errs.push(`${at}: قالب الوراثة extends "${String(a.extends)}" غير معروف`);
  }
  if (a.kind !== undefined && !ACTOR_KINDS.includes(a.kind as (typeof ACTOR_KINDS)[number])) {
    errs.push(`${at}: kind غير معروف`);
  }
  if (a.domain !== undefined && !DOMAINS.includes(a.domain as Domain)) errs.push(`${at}: domain غير معروف`);
  for (const k of ['speed', 'turnRate'] as const) {
    if (a[k] !== undefined && !(isNum(a[k]) && (a[k] as number) >= 0)) {
      errs.push(`${at}: ${k} يجب أن يكون رقمًا غير سالب`);
    }
  }
  for (const k of ['scale', 'radius'] as const) {
    if (a[k] !== undefined && !isPosNum(a[k])) {
      errs.push(`${at}: ${k} يجب أن يكون رقمًا موجبًا أكبر من صفر`);
    }
  }
  return errs;
}

/** Returns a list of human-readable errors; an empty list means the bundle is safe to store. */
export function validatePackBundle(bundle: unknown): string[] {
  if (!isObj(bundle)) return ['الملف لا يحتوي على حزمة صالحة'];
  const dangerous = findDangerousKey(bundle, 'bundle');
  if (dangerous) return [dangerous];

  const errs: string[] = [];
  if (bundle.maps !== undefined) {
    if (!Array.isArray(bundle.maps)) errs.push('maps يجب أن تكون قائمة');
    else {
      const seenMapIds = new Set<string>();
      bundle.maps.forEach((m, i) => {
        errs.push(...validateMapPack(m, `maps[${i}]`));
        if (isObj(m) && typeof m.id === 'string' && SAFE_ID_RE.test(m.id)) {
          if (seenMapIds.has(m.id)) {
            errs.push(`maps[${i}] (${m.id}): معرّف الخريطة مكرر داخل الحزمة`);
          } else {
            seenMapIds.add(m.id);
          }
        }
      });
    }
  }
  if (bundle.actors !== undefined) {
    if (!Array.isArray(bundle.actors)) errs.push('actors يجب أن تكون قائمة');
    else {
      const seenActorIds = new Set<string>();
      bundle.actors.forEach((a, i) => {
        errs.push(...validateActorPack(a, `actors[${i}]`));
        if (isObj(a) && typeof a.id === 'string' && SAFE_ID_RE.test(a.id)) {
          if (seenActorIds.has(a.id)) {
            errs.push(`actors[${i}] (${a.id}): معرّف الكيان مكرر داخل الحزمة`);
          } else {
            seenActorIds.add(a.id);
          }
        }
      });
    }
  }
  return errs;
}

export type { ActorPack, MapPack, PackBundle };
