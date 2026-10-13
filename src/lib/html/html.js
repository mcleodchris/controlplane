/**
 * HTML Templating
 *
 * Build markup with the `html` tag and write it with `render`. Every
 * interpolated value is escaped unless it is itself an `html` view, and values
 * at the start of a URL attribute have their scheme checked. `render` is the
 * only code allowed to write innerHTML (enforced by ESLint).
 *
 * See docs/adr/0001-html-tagged-template-and-single-render.md
 */

const URL_ATTRS = new Set(['href', 'src', 'action', 'formaction', 'poster']);
const SAFE_SCHEMES = new Set(['http', 'https', 'mailto']);
const BLOB_ATTRS = new Set(['src', 'poster']);

const ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

// Matches an attribute whose value starts right here: `name="`, `name='` or `name=`
const ATTR_VALUE_START = /([^\s"'=<>/]+)\s*=\s*(["']?)$/;
// Matches being somewhere inside a quoted attribute value: `name="abc`
const ATTR_VALUE_MIDDLE = /([^\s"'=<>/]+)\s*=\s*(["'])[^"']*$/;

class HtmlView {
  #markup;

  constructor(markup) {
    this.#markup = markup;
  }

  toString() {
    return this.#markup;
  }
}

/** Interpolation contexts, cached per template call site */
const contextCache = new WeakMap();

/**
 * Work out where each hole in a template sits: text, attribute value, or
 * the start of a URL attribute value.
 */
function getContexts(strings) {
  let contexts = contextCache.get(strings);
  if (contexts) return contexts;

  contexts = [];
  let prefix = '';

  for (let i = 0; i < strings.length - 1; i++) {
    prefix += strings[i];
    contexts.push(classifyHole(prefix, strings));
    prefix += 'x';
  }

  contextCache.set(strings, contexts);
  return contexts;
}

function classifyHole(prefix, strings) {
  const insideTag = prefix.lastIndexOf('<') > prefix.lastIndexOf('>');
  if (!insideTag) {
    return { kind: 'text' };
  }

  const tag = prefix.slice(prefix.lastIndexOf('<'));
  const start = tag.match(ATTR_VALUE_START);
  const middle = start ? null : tag.match(ATTR_VALUE_MIDDLE);
  const match = start || middle;

  if (!match) {
    throw templateError('Interpolation inside a tag must be a quoted attribute value', strings);
  }

  const [, rawName, quote] = match;
  const name = rawName.toLowerCase();

  if (!quote) {
    throw templateError(`Attribute "${name}" must be quoted when interpolated`, strings);
  }

  if (name.startsWith('on')) {
    throw templateError(`Interpolating into event handler attribute "${name}" is not allowed`, strings);
  }

  if (start && URL_ATTRS.has(name)) {
    return { kind: 'url', attr: name };
  }

  return { kind: 'attr' };
}

function templateError(message, strings) {
  return new Error(`html: ${message}\n  in template: ${strings.join('${…}')}`);
}

function escape(value) {
  return String(value).replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

/**
 * Return a URL safe to place at the start of the given attribute, or a
 * harmless placeholder if its scheme isn't allowed.
 */
function sanitizeUrl(value, attr) {
  const url = String(value);
  // Browsers ignore leading whitespace/control chars and tabs/newlines inside
  // the scheme, so strip them all before reading it.
  // eslint-disable-next-line no-control-regex -- matching control chars is the point
  const normalized = url.replace(/[\x00-\x20\x7f-\x9f]/g, '').toLowerCase();
  const scheme = normalized.match(/^([a-z][a-z0-9+.-]*):/)?.[1];

  if (!scheme) return url;
  if (SAFE_SCHEMES.has(scheme)) return url;
  if (scheme === 'blob' && BLOB_ATTRS.has(attr)) return url;

  return attr === 'href' ? '#' : '';
}

function interpolate(value, context) {
  if (value === null || value === undefined || value === false) {
    return '';
  }

  if (value instanceof HtmlView) {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => interpolate(item, context)).join('');
  }

  if (context.kind === 'url') {
    return escape(sanitizeUrl(value, context.attr));
  }

  return escape(value);
}

/**
 * Tagged template for building markup.
 *
 *   html`<a href="${url}">${name}</a>`
 *
 * - Values are escaped for text and quoted attributes
 * - Values starting a URL attribute (href, src, …) must use http(s), mailto,
 *   or be relative; blob: is also allowed in src/poster
 * - Nested `html` views are inserted as-is; arrays are joined
 * - null, undefined and false render as nothing
 *
 * @returns {HtmlView}
 */
export function html(strings, ...values) {
  const contexts = getContexts(strings);
  let markup = strings[0];

  for (let i = 0; i < values.length; i++) {
    markup += interpolate(values[i], contexts[i]) + strings[i + 1];
  }

  return new HtmlView(markup);
}

/**
 * Replace an element's contents with a view built by `html`.
 * @param {Element} element
 * @param {HtmlView} view
 */
export function render(element, view) {
  if (!(view instanceof HtmlView)) {
    throw new TypeError('render() requires a view built with html``');
  }
  element.innerHTML = view.toString();
}
