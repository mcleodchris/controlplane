// @vitest-environment happy-dom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppNav } from './AppNav.js';
import { router } from '../../lib/router/router.js';
import { store } from '../../lib/state/store.js';
import { html, render } from '../../lib/html/html.js';

const listeners = [];
let nav;

beforeAll(() => {
  render(document.body, html`<main id="page-content"></main>`);
  for (const target of [document, window]) {
    const add = target.addEventListener.bind(target);
    vi.spyOn(target, 'addEventListener').mockImplementation((type, listener, options) => {
      listeners.push(() => target.removeEventListener(type, listener, options));
      add(type, listener, options);
    });
  }
  for (const path of ['/', '/hobbies', '/photos', '/notes']) {
    router.on(path, { render: container => { container.textContent = path; } });
  }
  router.start();
  vi.restoreAllMocks();
});

afterAll(() => listeners.forEach(remove => remove()));
afterEach(() => AppNav.destroy?.());

beforeEach(() => {
  window.happyDOM.setWindowSize({ width: 390, height: 844 });
  store.updateSlice('ui', { mobileMenuOpen: false });
  render(document.body, html`<nav class="app-sidebar"></nav><main id="page-content"></main>`);
  nav = document.querySelector('nav');
  router.resetContainer();
  router.navigate('/', true);
  router.navigate('/hobbies', true);
  AppNav.render(nav);
});

describe('AppNav', () => {
  it('reflects direct UI store updates in the supplied container', () => {
    store.updateSlice('ui', { mobileMenuOpen: true });
    expect(nav.classList.contains('open')).toBe(true);
    store.updateSlice('ui', { mobileMenuOpen: false });
    expect(nav.classList.contains('open')).toBe(false);
  });

  it('updates the current item and closes on programmatic navigation', () => {
    store.updateSlice('ui', { mobileMenuOpen: true });
    router.navigate('/photos');
    expect(nav.querySelector('.active').getAttribute('href')).toBe('/photos');
    expect(nav.querySelector('[aria-current="page"]').getAttribute('href')).toBe('/photos');
    expect(store.getState('ui').mobileMenuOpen).toBe(false);
    expect(nav.classList.contains('open')).toBe(false);
  });

  it('updates after layout rendering precedes a login redirect', () => {
    router.navigate('/login');
    AppNav.render(nav);
    router.navigate('/');
    expect(nav.querySelector('.active')?.getAttribute('href')).toBe('/');
  });

  it('closes for data-link clicks outside the navigation', () => {
    const link = document.createElement('a');
    link.href = '/notes';
    link.setAttribute('data-link', '');
    document.body.append(link);
    store.updateSlice('ui', { mobileMenuOpen: true });
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(window.location.pathname).toBe('/notes');
    expect(store.getState('ui').mobileMenuOpen).toBe(false);
  });

  it('closes and updates the selection on back/forward navigation', () => {
    store.updateSlice('ui', { mobileMenuOpen: true });
    window.history.replaceState({}, '', '/photos');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(store.getState('ui').mobileMenuOpen).toBe(false);
    expect(nav.querySelector('.active').getAttribute('href')).toBe('/photos');
  });

  it('closes when selecting the current page', () => {
    store.updateSlice('ui', { mobileMenuOpen: true });
    nav.querySelector('a[href="/hobbies"]').click();
    expect(store.getState('ui').mobileMenuOpen).toBe(false);
  });

  it('resets the menu when crossing into desktop and rotating back', async () => {
    store.updateSlice('ui', { mobileMenuOpen: true });
    window.happyDOM.setWindowSize({ width: 1024, height: 768 });
    await window.happyDOM.whenAsyncComplete();
    expect(store.getState('ui').mobileMenuOpen).toBe(false);
    window.happyDOM.setWindowSize({ width: 390, height: 844 });
    await window.happyDOM.whenAsyncComplete();
    expect(nav.classList.contains('open')).toBe(false);
  });

  it('cleans up subscriptions when destroyed or rendered into a new container', () => {
    const previousNav = nav;
    nav = document.createElement('nav');
    document.body.append(nav);
    AppNav.render(nav);
    store.updateSlice('ui', { mobileMenuOpen: true });
    expect(previousNav.classList.contains('open')).toBe(false);
    expect(nav.classList.contains('open')).toBe(true);
    AppNav.destroy();
    store.updateSlice('ui', { mobileMenuOpen: false });
    expect(nav.classList.contains('open')).toBe(true);
  });
});
