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

// Stands in for earlier holes while classifying a template's static text
const HOLE = '\uE000';

// Matches `name=` (optionally followed by whitespace) at the end of some text
const ATTR_EQUALS = /([^\s"'=<>/]+)\s*=\s*$/;

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
    contexts.push(classifyHole(prefix, strings, i));
    prefix += HOLE;
  }

  contextCache.set(strings, contexts);
  return contexts;
}

function classifyHole(prefix, strings, index) {
  const insideTag = prefix.lastIndexOf('<') > prefix.lastIndexOf('>');
  if (!insideTag) {
    return { kind: 'text' };
  }

  const tag = prefix.slice(prefix.lastIndexOf('<'));
  const attribute = openAttribute(tag);

  if (!attribute) {
    const unquoted = tag.match(ATTR_EQUALS);
    if (unquoted) {
      throw templateError(`Attribute "${unquoted[1].toLowerCase()}" must be quoted when interpolated`, strings);
    }
    throw templateError('Interpolation inside a tag must be a quoted attribute value', strings);
  }

  const { name, quote, valueSoFar } = attribute;

  if (name.startsWith('on')) {
    throw templateError(`Interpolating into event handler attribute "${name}" is not allowed`, strings);
  }

  if (!URL_ATTRS.has(name)) {
    return { kind: 'attr' };
  }

  // A hole starting a URL is sanitized as a whole, so what follows it must
  // not be able to extend its scheme.
  if (valueSoFar === '') {
    const next = strings[index + 1];
    if (next !== '' && next[0] !== quote && !/^[/?#]/.test(next)) {
      throw templateError(`Static text after a hole at the start of "${name}" could change its scheme; build the URL first`, strings);
    }
    return { kind: 'url', attr: name };
  }

  // Later holes are only safe once static text has fixed the scheme.
  if (!isSchemePinned(valueSoFar, name)) {
    throw templateError(`The scheme of "${name}" must be fixed by static text (or a single leading hole) before further interpolation`, strings);
  }
  return { kind: 'attr' };
}

/**
 * If the tag text ends inside a quoted attribute value, return that
 * attribute's name, quote character and the value text so far.
 */
function openAttribute(tag) {
  let open = null;

  for (let i = 0; i < tag.length; i++) {
    const char = tag[i];
    if (open) {
      if (char === open.quote) open = null;
    } else if (char === '"' || char === "'") {
      const name = tag.slice(0, i).match(ATTR_EQUALS)?.[1];
      open = { name: name?.toLowerCase(), quote: char, start: i + 1 };
    }
  }

  if (!open || !open.name) return null;
  return { name: open.name, quote: open.quote, valueSoFar: tag.slice(open.start) };
}

/**
 * Has the URL's scheme been settled by the text so far (where earlier holes
 * appear as HOLE), so that later holes can't change it?
 */
function isSchemePinned(valueSoFar, attr) {
  // eslint-disable-next-line no-control-regex -- matching control chars is the point
  const text = valueSoFar.replace(/^[\x00-\x20]+/, '').replace(/[\t\n\r]/g, '');

  // A sanitized leading hole followed by a path/query/fragment delimiter
  if (text.startsWith(HOLE)) {
    return /^[/?#]/.test(text.slice(1));
  }

  const end = text.search(new RegExp(`[:/?#${HOLE}]`));
  if (end === -1 || text[end] === HOLE) return false;
  if (text[end] !== ':') return true;

  return isAllowedScheme(text.slice(0, end).toLowerCase(), attr);
}

function isAllowedScheme(scheme, attr) {
  return SAFE_SCHEMES.has(scheme) || (scheme === 'blob' && BLOB_ATTRS.has(attr));
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

  if (!scheme || isAllowedScheme(scheme, attr)) return url;

  return attr === 'href' ? '#' : '';
}

function isEmpty(value) {
  return value === null || value === undefined || value === false;
}

/**
 * Turn an attribute value into a plain string. Views are rejected: their
 * markup would be inserted unescaped and could close the attribute.
 */
function attributeText(value) {
  const items = Array.isArray(value) ? value : [value];
  return items.map((item) => {
    if (item instanceof HtmlView) {
      throw new TypeError('html: views can only be interpolated as text content, not inside attribute values');
    }
    return isEmpty(item) ? '' : String(item);
  }).join('');
}

function interpolate(value, context) {
  if (isEmpty(value)) {
    return '';
  }

  if (context.kind === 'url') {
    return escape(sanitizeUrl(attributeText(value), context.attr));
  }

  if (context.kind === 'attr') {
    return escape(attributeText(value));
  }

  if (value instanceof HtmlView) {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => interpolate(item, context)).join('');
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
 *   or be relative; blob: is also allowed in src/poster. Arrays there are
 *   joined before checking. Later holes in a URL need static text that fixes
 *   the scheme first (`/x/${id}`, `https://…/${p}`), otherwise html throws
 * - Nested `html` views are inserted as-is in text content; arrays are
 *   joined. Views inside attribute values throw
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
