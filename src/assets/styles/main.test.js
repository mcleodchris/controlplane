// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, expect, it } from 'vitest';
import { html, render } from '../../lib/html/html.js';

const directory = dirname(fileURLToPath(import.meta.url));
const styles = readFileSync(resolve(directory, 'variables.css'), 'utf8')
  + readFileSync(resolve(directory, 'main.css'), 'utf8').replace(/@import[^;]+;/g, '');

beforeEach(() => {
  window.happyDOM.setWindowSize({ width: 390, height: 844 });
  render(document.body, html`
    <header class="app-header"><button class="mobile-menu-btn"></button></header>
    <div class="app-main"><nav class="app-sidebar"></nav><main style="height: 4000px"></main></div>
  `);
  const style = document.createElement('style');
  style.textContent = styles;
  document.body.append(style);
});

it('keeps an open mobile menu attached to the viewport when the page is scrolled', () => {
  const nav = document.querySelector('nav');
  expect(getComputedStyle(nav).display).toBe('none');
  window.scrollTo(0, 2000);
  nav.classList.add('open');
  expect(getComputedStyle(nav).display).toBe('block');
  expect(getComputedStyle(nav).position).toBe('fixed');
  expect(getComputedStyle(nav).top).not.toBe('auto');
  expect(getComputedStyle(nav).overflowY).toBe('auto');
});

it('keeps desktop navigation in the layout with the mobile toggle hidden', () => {
  window.happyDOM.setWindowSize({ width: 1024, height: 768 });
  expect(getComputedStyle(document.querySelector('nav')).display).toBe('block');
  expect(getComputedStyle(document.querySelector('nav')).position).toBe('static');
  expect(getComputedStyle(document.querySelector('button')).display).toBe('none');
});
