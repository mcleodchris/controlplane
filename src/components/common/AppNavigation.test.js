// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppHeader } from './AppHeader.js';
import { AppNav } from './AppNav.js';
import { router } from '../../lib/router/router.js';
import { store } from '../../lib/state/store.js';
import { html, render } from '../../lib/html/html.js';

const styles = readFileSync(resolve('src/assets/styles/main.css'), 'utf8')
  .replace(/@import[^;]+;/g, '');
const listeners = [];

beforeAll(() => {
  render(document.body, html`<main id="page-content"></main>`);
  // Keep the singleton router's listeners from leaking into other suites.
  for (const target of [document, window]) {
    const add = target.addEventListener.bind(target);
    vi.spyOn(target, 'addEventListener').mockImplementation((type, listener, options) => {
      listeners.push(() => target.removeEventListener(type, listener, options));
      add(type, listener, options);
    });
  }
  for (const path of ['/', '/hobbies', '/photos', '/notes', '/webmentions']) {
    router.on(path, { render: container => { container.textContent = path; } });
  }
  router.start();
  vi.restoreAllMocks();
});

afterAll(() => listeners.forEach(remove => remove()));

beforeEach(() => {
  window.happyDOM.setWindowSize({ width: 390, height: 844 });
  store.updateSlice('ui', { mobileMenuOpen: false });
  render(document.body, html`
    <header id="app-header" class="app-header"></header>
    <div class="app-main">
      <nav id="app-nav" class="app-sidebar"></nav>
      <main id="page-content"></main>
    </div>
  `);
  const style = document.createElement('style');
  style.textContent = styles;
  document.body.append(style);
  router.resetContainer();
  router.navigate('/', true);
  router.navigate('/hobbies', true);
  AppHeader.render(document.getElementById('app-header'));
  AppNav.render(document.getElementById('app-nav'));
});

describe('mobile navigation from Hobby Log', () => {
  it('makes the sidebar visible when tapping the burger icon, then hides it on a second tap', () => {
    const sidebar = document.getElementById('app-nav');
    const icon = document.querySelector('#mobile-menu-toggle path');
    expect(getComputedStyle(sidebar).display).toBe('none');
    expect(document.getElementById('mobile-menu-toggle').getAttribute('aria-expanded')).toBe('false');

    icon.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(store.getState('ui').mobileMenuOpen).toBe(true);
    expect(getComputedStyle(sidebar).display).toBe('block');
    expect(document.getElementById('mobile-menu-toggle').getAttribute('aria-expanded')).toBe('true');

    icon.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(getComputedStyle(sidebar).display).toBe('none');
    expect(store.getState('ui').mobileMenuOpen).toBe(false);
    expect(document.getElementById('mobile-menu-toggle').getAttribute('aria-expanded')).toBe('false');
  });

  it('routes a menu selection in the same document and closes the menu', () => {
    document.getElementById('mobile-menu-toggle').click();
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    document.querySelector('.nav-item[href="/photos"] span').dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(window.location.pathname).toBe('/photos');
    expect(document.getElementById('page-content').textContent).toBe('/photos');
    expect(getComputedStyle(document.getElementById('app-nav')).display).toBe('none');
    expect(store.getState('ui').mobileMenuOpen).toBe(false);
  });

  it('routes a tap on the site title through history without native link navigation', () => {
    document.getElementById('mobile-menu-toggle').click();
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    document.querySelector('.app-name').dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(window.location.pathname).toBe('/');
    expect(document.getElementById('page-content').textContent).toBe('/');
    expect(getComputedStyle(document.getElementById('app-nav')).display).toBe('none');
  });

  it('keeps desktop navigation visible with the mobile toggle hidden', () => {
    window.happyDOM.setWindowSize({ width: 1024, height: 768 });
    expect(getComputedStyle(document.getElementById('app-nav')).display).toBe('block');
    expect(getComputedStyle(document.getElementById('mobile-menu-toggle')).display).toBe('none');
  });

  it('closes the menu when selecting the current page', () => {
    document.getElementById('mobile-menu-toggle').click();
    document.querySelector('.nav-item[href="/hobbies"]').click();
    expect(window.location.pathname).toBe('/hobbies');
    expect(getComputedStyle(document.getElementById('app-nav')).display).toBe('none');
    expect(document.getElementById('mobile-menu-toggle').getAttribute('aria-expanded')).toBe('false');
  });

  it('resets an open menu when the authenticated layout is rendered again', () => {
    document.getElementById('mobile-menu-toggle').click();
    AppHeader.render(document.getElementById('app-header'));
    AppNav.render(document.getElementById('app-nav'));
    expect(store.getState('ui').mobileMenuOpen).toBe(false);
    expect(getComputedStyle(document.getElementById('app-nav')).display).toBe('none');
    document.getElementById('mobile-menu-toggle').click();
    expect(getComputedStyle(document.getElementById('app-nav')).display).toBe('block');
  });
});

describe('homescreen installation', () => {
  it('declares standalone mode and a scope covering every feature', () => {
    const index = readFileSync(resolve('index.html'), 'utf8');
    const document = new DOMParser().parseFromString(index, 'text/html');
    const link = document.querySelector('link[rel="manifest"]');
    expect(link, 'expected explicit homescreen installation metadata').not.toBeNull();
    const manifest = JSON.parse(readFileSync(resolve(`public${link.getAttribute('href')}`), 'utf8'));
    expect(manifest.display).toBe('standalone');
    expect(manifest.scope).toBe('/');
    expect(manifest.start_url, 'preserve the page saved as the launch URL').toBeUndefined();
  });
});
