/**
 * Template generator and DOM checker for the html tag's randomised safety
 * test (html.fuzz.test.js). Kept free of test-runner imports so the same
 * cases can be run in a real browser:
 *
 *   const f = await import('/src/lib/html/fuzz.js');
 *   f.run(document, { seed: 1, iterations: 20000 })
 *
 * The generator never writes anything dangerous in static text, so any
 * event handler, injected element/attribute or dangerous URL in the DOM
 * must have come from an interpolated value.
 */
import { html } from './html.js';

export const URL_ATTRS = ['href', 'src', 'action', 'formaction', 'poster'];
const DANGEROUS_SCHEMES = ['javascript', 'vbscript', 'data'];

export function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeGenerator(random) {
  const pick = (items) => items[Math.floor(random() * items.length)];
  const chance = (p) => random() < p;
  const HOLE = { hole: true };

  // --- static building blocks (never dangerous on their own) -------------
  const staticAttrs = [
    'title="1 > 0"', "title='a <b'", 'alt="it\'s"', 'title=\'say "hi"\'',
    'data-q="x=y"', 'class=""', 'id=plain', 'hidden',
  ];
  const urlPrefixes = ['', '', '/', 'https://e.example/', 'mailto:', 'java', 'page-', '#', ' '];
  const urlSeparators = ['', '', '/', '?q=', 'script:', ':', 'x', '"'];
  const textPieces = ['', 'plain', '1 < 2', 'a > b', '<!-- c > d -->', '&amp;', ' '];
  const rawBlocks = [
    '<style>a > b { content: "<"; }</style>',
    '<script>if (a < b) {}</script>',
  ];
  const tags = ['a', 'img', 'div', 'span', 'form', 'button', 'video', 'p'];
  const VOID = new Set(['img']);

  function attribute(chunks) {
    const roll = random();
    if (roll < 0.4) {
      chunks.push(' ' + pick(staticAttrs));
      return;
    }
    const isUrl = roll < 0.8;
    const name = isUrl ? pick(URL_ATTRS) : pick(['title', 'class', 'alt', 'data-x']);
    const quote = chance(0.08) ? '' : pick(['"', "'"]);

    chunks.push(` ${name}=${quote}`);
    if (isUrl) {
      chunks.push(pick(urlPrefixes));
      const holes = pick([0, 1, 1, 1, 2]);
      for (let i = 0; i < holes; i++) {
        chunks.push(HOLE);
        const sep = pick(urlSeparators);
        if (sep !== quote) chunks.push(sep);
      }
    } else {
      chunks.push(pick(['', 'a ', 'x"y'.replace(quote || '#', '')]));
      if (chance(0.8)) chunks.push(HOLE);
      chunks.push(pick(['', ' b']));
    }
    chunks.push(quote);
  }

  function element(chunks, depth) {
    // Occasionally exercise positions html must reject
    if (chance(0.03)) {
      chunks.push('<', HOLE, '>');
      return;
    }
    const tag = pick(tags);
    chunks.push(`<${tag}`);
    const attrCount = pick([0, 1, 2, 3, 4]);
    for (let i = 0; i < attrCount; i++) attribute(chunks);
    if (chance(0.03)) chunks.push(' ', HOLE);
    chunks.push('>');
    if (!VOID.has(tag)) {
      children(chunks, depth + 1);
      chunks.push(`</${tag}>`);
    }
  }

  function children(chunks, depth) {
    const count = pick([0, 1, 2, 3]);
    for (let i = 0; i < count; i++) {
      const roll = random();
      if (roll < 0.35) chunks.push(pick(textPieces));
      else if (roll < 0.65) chunks.push(HOLE);
      else if (roll < 0.75) {
        const block = pick(rawBlocks);
        if (chance(0.15)) {
          // a hole inside script/style must be rejected
          const split = block.indexOf('>') + 1;
          chunks.push(block.slice(0, split), HOLE, block.slice(split));
        } else {
          chunks.push(block);
        }
      } else if (depth < 3) element(chunks, depth);
    }
  }

  // --- hostile values ------------------------------------------------------
  const benign = ['', 'safe', '/p', 'https://ok.example/', '1 > 0', 'a <b', 'java', 'script:alert(1)'];
  const dangerousUrls = [
    'javascript:alert(1)', ' JaVa\tScRiPt:alert(1)', '\u0001javascript:x', 'java\nscript:x',
    'data:text/html,<x-pwn>', 'vbscript:x', 'blob:http://l/x',
  ];
  const breakouts = [
    '"><x-pwn data-pwn>', "' data-pwn='1", '" data-pwn="1', ' data-pwn=1 ',
    '--><x-pwn>', '</style><x-pwn>', '</script><x-pwn>', '<x-pwn>', 'onclick=alert(1)',
  ];
  const strings = [...benign, ...dangerousUrls, ...breakouts];
  const hostile = () => {
    const roll = random();
    if (roll < 0.4) return pick(dangerousUrls);
    if (roll < 0.7) return pick(breakouts);
    return pick(benign);
  };
  const view = () => pick([
    () => html`<i>${pick(strings)}</i>`,
    () => html`<b title="${pick(strings)}">v</b>`,
    () => html`<span title="1 > 0">${pick(strings)}</span>`,
  ])();

  function value() {
    const roll = random();
    if (roll < 0.6) return hostile();
    if (roll < 0.7) return pick([null, undefined, false, 0, 42]);
    if (roll < 0.85) return Array.from({ length: pick([1, 2, 3]) }, () => (chance(0.2) ? view() : hostile()));
    return view();
  }

  return function generate() {
    const chunks = [];
    children(chunks, 0);
    if (!chunks.some((c) => c === HOLE)) chunks.push(HOLE);

    const parts = [''];
    for (const chunk of chunks) {
      if (chunk === HOLE) parts.push('');
      else parts[parts.length - 1] += chunk;
    }
    const strings = Object.assign([...parts], { raw: [...parts] });
    const values = parts.slice(1).map(() => value());
    return { strings, values };
  };
}

function urlScheme(url) {
  // eslint-disable-next-line no-control-regex -- browsers strip these before reading the scheme
  const normalized = url.replace(/^[\x00-\x20]+/, '').replace(/[\t\n\r]/g, '').toLowerCase();
  return normalized.match(/^([a-z][a-z0-9+.-]*):/)?.[1] ?? null;
}

/** Return a description of the first unsafe thing in the DOM, or null */
export function findInjection(root) {
  for (const el of root.querySelectorAll('*')) {
    const tag = el.tagName.toLowerCase();
    if (tag === 'x-pwn') return 'injected <x-pwn> element';

    for (const { name, value } of el.attributes) {
      if (name.startsWith('on')) return `event handler attribute ${name}`;
      if (name === 'data-pwn') return 'injected data-pwn attribute';
      if (URL_ATTRS.includes(name)) {
        const scheme = urlScheme(value);
        if (DANGEROUS_SCHEMES.includes(scheme)) return `${scheme}: URL in ${name}`;
        if (scheme === 'blob' && name === 'href') return 'blob: URL in href';
      }
    }
  }
  return null;
}


/**
 * Generate and check `iterations` cases. Returns the first failure (or null)
 * and how many templates html accepted.
 */
export function run(doc, { seed, iterations }) {
  const generate = makeGenerator(prng(seed));
  let accepted = 0;

  for (let i = 0; i < iterations; i++) {
    const { strings, values } = generate();
    let view;
    try {
      view = html(strings, ...values);
    } catch {
      continue; // rejected templates are safe
    }
    accepted++;

    // <template> parses without running scripts or loading resources
    const container = doc.createElement('template');
    container.innerHTML = view.toString(); // eslint-disable-line no-restricted-syntax -- parsing for inspection only
    const problem = findInjection(container.content);

    if (problem) {
      return {
        accepted,
        failure: [
          `case ${i} (seed ${seed}): ${problem}`,
          `template: ${strings.join('${…}')}`,
          `values:   ${JSON.stringify(values.map(String))}`,
          `output:   ${view.toString()}`,
        ].join('\n'),
      };
    }
  }

  return { accepted, failure: null };
}
