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
// Elements whose content is raw text, where escaping doesn't apply
const RAW_TEXT_ELEMENTS = new Set(['script', 'style']);
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

const WHITESPACE = /[\t\n\f\r ]/;

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
  const state = scanMarkup(prefix);

  switch (state.kind) {
    case 'text':
    case 'comment':
      return { kind: 'text' };
    case 'raw':
      throw templateError(`Interpolation inside <${state.element}> is not allowed`, strings);
    case 'tag-name':
      throw templateError('Tag names cannot be interpolated', strings);
    case 'unquoted':
      throw templateError(`Attribute "${state.name}" must be quoted when interpolated`, strings);
    case 'tag':
      throw templateError('Interpolation inside a tag must be a quoted attribute value', strings);
  }

  const { name, quote, valueSoFar } = state;

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
 * Walk a template's static markup (earlier holes appear as HOLE) following
 * the HTML tokenizer's states, and report where its end sits:
 *
 * - text:     page text
 * - comment:  inside <!-- … --> or a <!…>/<?…> bogus comment
 * - raw:      inside <script> or <style> (with element)
 * - tag-name: in a tag name, including right after < or </
 * - unquoted: after name= or in an unquoted attribute value (with name)
 * - tag:      elsewhere inside a tag (attribute names, between attributes)
 * - attr:     inside a quoted attribute value (with name, quote, valueSoFar)
 */
function scanMarkup(markup) {
  let state = 'text';
  let element = '';     // current tag name
  let closing = false;  // is the current tag a closing tag?
  let rawElement = '';
  let attrName = '';
  let quote = '';
  let valueStart = 0;
  let commentEnd = '';

  const endTag = () => {
    if (!closing && RAW_TEXT_ELEMENTS.has(element)) {
      rawElement = element;
      return 'raw';
    }
    return 'text';
  };

  for (let i = 0; i < markup.length; i++) {
    const char = markup[i];
    const next = markup[i + 1] ?? '';

    switch (state) {
      case 'text':
        if (char !== '<') break;
        if (markup.startsWith('<!--', i)) {
          state = 'comment';
          commentEnd = '-->';
          i += 3;
        } else if (next === '!' || next === '?') {
          state = 'comment';
          commentEnd = '>';
        } else if (/[a-zA-Z]/.test(next) || (next === '/' && /[a-zA-Z]/.test(markup[i + 2] ?? ''))) {
          state = 'tag-name';
          closing = next === '/';
          element = '';
          if (closing) i++;
        }
        break;

      case 'comment':
        if (markup.startsWith(commentEnd, i)) {
          state = 'text';
          i += commentEnd.length - 1;
        }
        break;

      case 'raw': {
        const end = `</${rawElement}`;
        const after = markup[i + end.length] ?? '';
        if (markup.slice(i, i + end.length).toLowerCase() === end && /[\t\n\f\r />]/.test(after)) {
          state = 'tag-name';
          closing = true;
          element = '';
          i++;
        }
        break;
      }

      case 'tag-name':
        if (WHITESPACE.test(char) || char === '/') state = 'before-attr-name';
        else if (char === '>') state = endTag();
        else element += char.toLowerCase();
        break;

      case 'before-attr-name':
      case 'after-attr-name':
        if (WHITESPACE.test(char) || char === '/') break;
        if (char === '>') state = endTag();
        else if (char === '=' && state === 'after-attr-name') state = 'before-attr-value';
        else {
          state = 'attr-name';
          attrName = char.toLowerCase();
        }
        break;

      case 'attr-name':
        if (WHITESPACE.test(char) || char === '/') state = 'after-attr-name';
        else if (char === '=') state = 'before-attr-value';
        else if (char === '>') state = endTag();
        else attrName += char.toLowerCase();
        break;

      case 'before-attr-value':
        if (WHITESPACE.test(char)) break;
        if (char === '"' || char === "'") {
          state = 'quoted';
          quote = char;
          valueStart = i + 1;
        } else if (char === '>') {
          state = endTag();
        } else {
          state = 'unquoted-value';
        }
        break;

      case 'quoted':
        if (char === quote) state = 'before-attr-name';
        break;

      case 'unquoted-value':
        if (WHITESPACE.test(char)) state = 'before-attr-name';
        else if (char === '>') state = endTag();
        break;
    }
  }

  // A hole right after < or </ would supply the tag name
  if (state === 'text' && /<\/?$/.test(markup)) {
    return { kind: 'tag-name' };
  }

  switch (state) {
    case 'quoted':
      return { kind: 'attr', name: attrName, quote, valueSoFar: markup.slice(valueStart) };
    case 'before-attr-value':
    case 'unquoted-value':
      return { kind: 'unquoted', name: attrName };
    case 'before-attr-name':
    case 'attr-name':
    case 'after-attr-name':
      return { kind: 'tag' };
    case 'raw':
      return { kind: 'raw', element: rawElement };
    default:
      return { kind: state };
  }
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
