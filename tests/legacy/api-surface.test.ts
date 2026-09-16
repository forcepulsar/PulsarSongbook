/**
 * Allowlist audit of every API the legacy app touches.
 *
 * WHY THIS EXISTS ALONGSIDE es5-syntax.test.ts
 *
 * That file does two things: parses at `ecmaVersion: 5` (catches modern
 * *syntax*), and greps for a list of post-ES5 *APIs*. The grep is a
 * **denylist** - it only catches the APIs someone thought to list. A denylist
 * cannot tell you about `String.prototype.codePointAt`, `Array.of`,
 * `Element.closest`, `URLSearchParams` or the next thing nobody predicted.
 * Each of those parses cleanly as ES5 and then throws on Safari 12.
 *
 * So this file inverts it. It walks the AST, enumerates every property access
 * and global reference the code actually makes, and asserts each one appears
 * in a reviewed allowlist below. Anything unrecognised FAILS, which forces a
 * deliberate decision - "is this available on Safari 12?" - rather than
 * letting silence pass for safety.
 *
 * When this test fails on a new entry, do not just add the name. Check it
 * against Safari 12.1 support first, then add it with the others.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'acorn';

const LEGACY_DIR = join(process.cwd(), 'public', 'legacy');
const jsFiles = readdirSync(LEGACY_DIR).filter((f) => f.endsWith('.js'));

/**
 * ES5 built-ins and DOM APIs verified available on Safari 12.1 (iOS 12.5.7).
 * Grouped so a reviewer can see what kind of surface is being relied on.
 */
const ALLOWED = new Set([
  // --- ES5 Object / Function ---
  'keys', 'hasOwnProperty', 'call', 'apply', 'prototype', 'constructor',

  // --- ES5 Array.prototype (NOT includes/find/findIndex/flat - those are ES6+) ---
  'push', 'pop', 'shift', 'unshift', 'slice', 'splice', 'concat', 'join',
  'sort', 'reverse', 'indexOf', 'lastIndexOf', 'forEach', 'map', 'filter',
  'reduce', 'every', 'some', 'length', 'isArray',

  // --- ES5 String.prototype (NOT includes/startsWith/padStart/repeat) ---
  'charAt', 'charCodeAt', 'substring', 'substr', 'toLowerCase', 'toUpperCase',
  'trim', 'split', 'replace', 'match', 'search', 'test', 'exec', 'toString',

  // --- ES5 Number / Math / JSON / Date ---
  'parse', 'stringify', 'toFixed', 'getTime', 'now', 'floor', 'ceil', 'round',
  'min', 'max', 'abs', 'random', 'fromCharCode',

  // --- RegExp match results / console ---
  'index', 'input', 'log', 'warn', 'info',

  // --- CSSStyleDeclaration properties set via element.style.X ---
  // All long-standing CSS2.1/CSS3 properties, fine on Safari 12.
  'color', 'display', 'position', 'top', 'left', 'width', 'height',
  'margin', 'padding', 'textAlign', 'whiteSpace', 'fontWeight', 'fontStyle',
  'minHeight', 'lineHeight', 'background', 'visibility', 'overflow',

  // --- Feature-detected legacy API (selftest reports on its absence) ---
  'indexedDB',

  // --- DOM: traversal and queries (Level 2/3 + Selectors API, all Safari 12 OK) ---
  'getElementById', 'getElementsByClassName', 'getElementsByTagName',
  'querySelector', 'querySelectorAll', 'createElement', 'createTextNode',
  'appendChild', 'removeChild', 'insertBefore', 'parentNode', 'childNodes',
  'firstChild', 'nextSibling', 'documentElement', 'body', 'head',

  // --- DOM: content and attributes ---
  'innerHTML', 'textContent', 'outerHTML', 'value', 'checked', 'className',
  'classList', 'add', 'remove', 'contains', 'toggle', 'id', 'title',
  'getAttribute', 'setAttribute', 'removeAttribute', 'dataset', 'style',
  'href', 'src', 'placeholder', 'disabled', 'tagName',

  // --- DOM: events (addEventListener is fine; on* handlers are properties) ---
  'addEventListener', 'removeEventListener', 'preventDefault',
  'stopPropagation', 'target', 'currentTarget', 'keyCode', 'which', 'key',
  'onclick', 'oninput', 'onkeydown', 'onchange', 'onreadystatechange',
  'ontimeout', 'onerror', 'onload', 'type', 'detail',

  // --- DOM: layout / scrolling ---
  'scrollTop', 'scrollHeight', 'scrollLeft', 'clientHeight', 'clientWidth',
  'offsetHeight', 'offsetWidth', 'offsetTop', 'getBoundingClientRect',
  'scrollTo', 'scrollBy', 'top', 'fontSize', 'styleSheets',

  // --- XHR (XHR2 properties land in Safari 6; all fine on 12) ---
  'open', 'send', 'setRequestHeader', 'getResponseHeader', 'readyState',
  'status', 'responseText', 'timeout', 'withCredentials',

  // --- Storage / navigation / timers ---
  'setItem', 'getItem', 'removeItem', 'clear', 'localStorage',
  'sessionStorage', 'location', 'reload', 'replace', 'userAgent',
  'navigator', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'requestAnimationFrame', 'cancelAnimationFrame',

  // --- App-internal namespace (not a platform API) ---
  'PulsarFirestoreREST', 'PROJECT_ID', 'PAGE_SIZE', 'MAX_PAGES',
  'FIELD_PATHS', 'ERROR_CONNECTION', 'ERROR_SERVER', 'buildUrl',
  'unwrapValue', 'extractId', 'mapDocument', 'sortByTitle', 'fetchAllSongs',

  // --- Firestore REST response shape (plain data, not APIs) ---
  'documents', 'fields', 'nextPageToken', 'name', 'error', 'message',
  'stringValue', 'booleanValue', 'integerValue', 'doubleValue',
  'timestampValue', 'nullValue', 'arrayValue', 'mapValue', 'values',

  // --- App data / state / config shape ---
  'songs', 'filteredSongs', 'currentSong', 'currentView', 'searchQuery',
  'scrollSpeed', 'isScrolling', 'scrollInterval', 'artist', 'chordProContent',
  'language', 'difficulty', 'chord', 'lyrics', 'html', 'comment', 'passed',
  'isWarning', 'results', 'chords', 'lines', 'columns', 'text',
  'SCROLL_INTERVAL_MS', 'MIN_FONT_SIZE', 'MAX_FONT_SIZE', 'FONT_STEP',
  'MIN_SCROLL_SPEED', 'MAX_SCROLL_SPEED', 'SCROLL_SPEED_STEP', 'CHORD_FIXES',
]);

/** Globals the legacy code may reference. */
const ALLOWED_GLOBALS = new Set([
  'window', 'document', 'navigator', 'localStorage', 'sessionStorage',
  'location', 'console', 'XMLHttpRequest', 'JSON', 'Object', 'Array',
  'String', 'Number', 'Boolean', 'Math', 'Date', 'RegExp', 'Error',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent',
  'decodeURIComponent', 'encodeURI', 'decodeURI', 'setTimeout',
  'clearTimeout', 'setInterval', 'clearInterval', 'eval', 'undefined', 'NaN',
]);

/** Explicitly banned: parses as ES5, throws on Safari 12. */
const KNOWN_ES6_PLUS = new Set([
  'includes', 'find', 'findIndex', 'findLast', 'flat', 'flatMap', 'entries',
  'fromEntries', 'assign', 'from', 'of', 'padStart', 'padEnd', 'trimStart',
  'trimEnd', 'repeat', 'startsWith', 'endsWith', 'codePointAt', 'at',
  'closest', 'matches', 'append', 'prepend', 'replaceChildren', 'finally',
  'then', 'catch', 'fetch', 'Promise', 'Symbol', 'Map', 'Set', 'WeakMap',
  'Proxy', 'Reflect', 'URLSearchParams', 'IntersectionObserver',
]);

interface Node {
  type: string;
  [key: string]: unknown;
}

/** Minimal recursive AST walker (acorn-walk is not a dependency here). */
function walk(node: unknown, visit: (n: Node) => void): void {
  if (!node || typeof node !== 'object') return;

  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit);
    return;
  }

  const candidate = node as Node;
  if (typeof candidate.type !== 'string') return;

  visit(candidate);

  for (const key of Object.keys(candidate)) {
    if (key === 'type' || key === 'start' || key === 'end') continue;
    walk(candidate[key], visit);
  }
}

interface Surface {
  properties: Set<string>;
  globals: Set<string>;
}

function collectSurface(source: string): Surface {
  const ast = parse(source, { ecmaVersion: 5, sourceType: 'script' });

  const properties = new Set<string>();
  const referenced = new Set<string>();
  const declared = new Set<string>();

  // Pass 1: every locally bound name. This must complete before filtering,
  // or a name used above its declaration is misreported as a global - which
  // is exactly what happened when this was a single pass.
  walk(ast, (node) => {
    if (node.type === 'VariableDeclarator') {
      const id = node.id as Node | undefined;
      if (id?.type === 'Identifier') declared.add(id.name as string);
    }
    if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
      const id = node.id as Node | undefined;
      if (id?.type === 'Identifier') declared.add(id.name as string);
      for (const p of (node.params as Node[]) ?? []) {
        if (p.type === 'Identifier') declared.add(p.name as string);
      }
    }
    if (node.type === 'CatchClause') {
      const param = node.param as Node | undefined;
      if (param?.type === 'Identifier') declared.add(param.name as string);
    }
  });

  // Pass 2: the surface actually touched.
  walk(ast, (node) => {
    // Non-computed member access: obj.foo
    if (node.type === 'MemberExpression' && node.computed === false) {
      const prop = node.property as Node;
      if (prop.type === 'Identifier') properties.add(prop.name as string);

      const object = node.object as Node;
      if (object?.type === 'Identifier') referenced.add(object.name as string);
    }

    // Object literal keys are data, not APIs, but a banned name must not be
    // able to hide there either (e.g. defining a method called `includes`).
    if (node.type === 'Property') {
      const key = node.key as Node;
      if (key.type === 'Identifier') properties.add(key.name as string);
    }

    if (node.type === 'NewExpression' || node.type === 'CallExpression') {
      const callee = node.callee as Node;
      if (callee?.type === 'Identifier') referenced.add(callee.name as string);
    }
  });

  const globals = new Set(
    Array.from(referenced).filter((name) => !declared.has(name))
  );

  return { properties, globals };
}

describe('legacy API surface is ES5 / Safari 12 safe', () => {
  it('has files to audit', () => {
    expect(jsFiles.length).toBeGreaterThan(0);
  });

  it.each(jsFiles)('%s touches no unreviewed API', (file) => {
    const { properties } = collectSurface(
      readFileSync(join(LEGACY_DIR, file), 'utf8')
    );

    const unreviewed = Array.from(properties)
      .filter((name) => !ALLOWED.has(name))
      .sort();

    // A failure here is not necessarily a bug - it means this file started
    // using an API nobody has checked against Safari 12 yet. Verify support,
    // then add it to ALLOWED.
    expect(unreviewed).toEqual([]);
  });

  it.each(jsFiles)('%s references no unreviewed global', (file) => {
    const { globals } = collectSurface(
      readFileSync(join(LEGACY_DIR, file), 'utf8')
    );

    const unreviewed = Array.from(globals)
      .filter((name) => !ALLOWED_GLOBALS.has(name))
      .sort();

    expect(unreviewed).toEqual([]);
  });

  it.each(jsFiles)('%s uses no known ES6+ API', (file) => {
    const { properties, globals } = collectSurface(
      readFileSync(join(LEGACY_DIR, file), 'utf8')
    );

    const banned = [...properties, ...globals]
      .filter((name) => KNOWN_ES6_PLUS.has(name))
      .sort();

    expect(banned).toEqual([]);
  });

  it('the allowlist and the ES6+ banlist do not overlap', () => {
    // If a name appeared in both, one check would pass it and the other fail
    // it, and which one won would depend on test order.
    const overlap = Array.from(ALLOWED).filter((n) => KNOWN_ES6_PLUS.has(n));
    expect(overlap).toEqual([]);
  });

  it('actually detects a planted ES6 API', () => {
    // Guards the guard: if the walker silently stopped finding member
    // expressions, every audit above would pass vacuously.
    const { properties } = collectSurface(
      'var a = [1,2]; if (a.includes(1)) { Object.assign({}, a); }'
    );

    expect(properties.has('includes')).toBe(true);
    expect(properties.has('assign')).toBe(true);
    expect(Array.from(properties).filter((n) => KNOWN_ES6_PLUS.has(n)).sort())
      .toEqual(['assign', 'includes']);
  });
});
