import { describe, it, expect } from 'vitest';
import { html, render } from './html.js';

const str = (view) => view.toString();

describe('html', () => {
  describe('text', () => {
    it('escapes markup characters', () => {
      expect(str(html`<p>${'<script>alert(1)</script> & co'}</p>`))
        .toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt; &amp; co</p>');
    });

    it('renders numbers including zero', () => {
      expect(str(html`<span>${0}</span><span>${42}</span>`)).toBe('<span>0</span><span>42</span>');
    });

    it('renders null, undefined and false as nothing', () => {
      expect(str(html`<i>${null}${undefined}${false}</i>`)).toBe('<i></i>');
    });
  });

  describe('attributes', () => {
    it('escapes quotes so values cannot break out', () => {
      expect(str(html`<img alt="${'x" onerror="alert(1)'}">`))
        .toBe('<img alt="x&quot; onerror=&quot;alert(1)">');
      expect(str(html`<img alt='${"x' onerror='alert(1)"}'>`))
        .toBe("<img alt='x&#39; onerror=&#39;alert(1)'>");
    });

    it('escapes values in the middle of an attribute', () => {
      expect(str(html`<div class="card ${'a" b'}">`)).toBe('<div class="card a&quot; b">');
    });

    it('rejects unquoted attribute values', () => {
      expect(() => html`<div class=${'x'}>`).toThrow(/must be quoted/);
    });

    it('rejects interpolation in tag position', () => {
      expect(() => html`<div ${'onclick="x"'}>`).toThrow(/quoted attribute value/);
    });

    it('rejects interpolation into event handlers', () => {
      expect(() => html`<button onclick="${'go()'}">`).toThrow(/event handler/);
    });
  });

  describe('URL attributes', () => {
    it.each([
      'https://example.com/a?b=c',
      'http://example.com',
      'mailto:me@example.com',
      '/relative/path',
      '../up',
      '#anchor',
      '//cdn.example.com/x.png',
    ])('allows %s in href', (url) => {
      expect(str(html`<a href="${url}">`)).toBe(`<a href="${url}">`);
    });

    it.each([
      'javascript:alert(1)',
      'JaVaScRiPt:alert(1)',
      ' javascript:alert(1)',
      '\u0001javascript:alert(1)',
      'java\tscript:alert(1)',
      'java\nscript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      'blob:https://example.com/uuid',
    ])('replaces %j in href with #', (url) => {
      expect(str(html`<a href="${url}">`)).toBe('<a href="#">');
    });

    it('replaces unsafe src with empty string', () => {
      expect(str(html`<img src="${'javascript:alert(1)'}">`)).toBe('<img src="">');
      expect(str(html`<img src="${'data:image/svg+xml,<svg/>'}">`)).toBe('<img src="">');
    });

    it('allows blob: in src and poster', () => {
      expect(str(html`<img src="${'blob:http://localhost/abc'}">`)).toBe('<img src="blob:http://localhost/abc">');
      expect(str(html`<video poster="${'blob:http://localhost/abc'}">`)).toBe('<video poster="blob:http://localhost/abc">');
    });

    it('checks action and formaction', () => {
      expect(str(html`<form action="${'javascript:x'}">`)).toBe('<form action="">');
      expect(str(html`<button formaction="${'javascript:x'}">`)).toBe('<button formaction="">');
    });

    it('escapes allowed URLs', () => {
      expect(str(html`<a href="${'https://x.com/?a=1&b="2"'}">`)).toBe('<a href="https://x.com/?a=1&amp;b=&quot;2&quot;">');
    });

    it('only checks the start of the value; later parts are escaped', () => {
      expect(str(html`<a href="/hobby/${'javascript:x'}">`)).toBe('<a href="/hobby/javascript:x">');
    });

    it('does not check non-URL attributes', () => {
      expect(str(html`<a title="${'javascript:x'}">`)).toBe('<a title="javascript:x">');
    });

    it('works in multi-hole tags', () => {
      const view = html`<img src="${'javascript:x'}" alt="${'a<b'}" loading="lazy" />`;
      expect(str(view)).toBe('<img src="" alt="a&lt;b" loading="lazy" />');
    });
  });

  describe('composition', () => {
    it('inserts nested views without escaping them again', () => {
      const inner = html`<b>${'<i>'}</b>`;
      expect(str(html`<p>${inner}</p>`)).toBe('<p><b>&lt;i&gt;</b></p>');
    });

    it('joins arrays of views and values', () => {
      const items = ['a', '<b>'];
      expect(str(html`<ul>${items.map((i) => html`<li>${i}</li>`)}</ul>`))
        .toBe('<ul><li>a</li><li>&lt;b&gt;</li></ul>');
      expect(str(html`<p>${['<x>', 1, null]}</p>`)).toBe('<p>&lt;x&gt;1</p>');
    });

    it('supports conditional fragments', () => {
      const show = (flag) => html`<div>${flag && html`<span>yes</span>`}</div>`;
      expect(str(show(true))).toBe('<div><span>yes</span></div>');
      expect(str(show(false))).toBe('<div></div>');
    });

    it('does not treat plain strings as markup', () => {
      expect(str(html`<p>${'<b>bold</b>'}</p>`)).toBe('<p>&lt;b&gt;bold&lt;/b&gt;</p>');
    });
  });
});

describe('render', () => {
  // happy-dom is only needed here; html() itself is pure
  it('writes a view into an element', async () => {
    const { Window } = await import('happy-dom');
    const { document } = new Window();
    const el = document.createElement('div');

    render(el, html`<a href="${'javascript:alert(1)'}">${'<x>'}</a>`);

    expect(el.querySelector('a').getAttribute('href')).toBe('#');
    expect(el.textContent).toBe('<x>');
  });

  it('rejects plain strings', () => {
    const el = { innerHTML: '' };
    expect(() => render(el, '<p>hi</p>')).toThrow(TypeError);
    expect(el.innerHTML).toBe('');
  });
});
