// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppHeader } from './AppHeader.js';
import { store } from '../../lib/state/store.js';

let header;

beforeEach(() => {
  store.updateSlice('ui', { mobileMenuOpen: false });
  document.body.replaceChildren();
  header = document.createElement('header');
  document.body.append(header);
  AppHeader.render(header);
});
afterEach(() => AppHeader.destroy?.());

describe('AppHeader', () => {
  it('toggles the UI state when tapping the burger SVG', () => {
    header.querySelector('#mobile-menu-toggle path').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(store.getState('ui').mobileMenuOpen).toBe(true);
    expect(header.querySelector('button').getAttribute('aria-expanded')).toBe('true');
    header.querySelector('#mobile-menu-toggle').click();
    expect(store.getState('ui').mobileMenuOpen).toBe(false);
  });

  it('reflects direct UI state updates in aria-expanded', () => {
    store.updateSlice('ui', { mobileMenuOpen: true });
    expect(header.querySelector('button').getAttribute('aria-expanded')).toBe('true');
    store.updateSlice('ui', { mobileMenuOpen: false });
    expect(header.querySelector('button').getAttribute('aria-expanded')).toBe('false');
  });

  it('cleans up old subscriptions when rendered again', () => {
    const previousToggle = header.querySelector('button');
    AppHeader.render(header);
    store.updateSlice('ui', { mobileMenuOpen: true });
    expect(previousToggle.getAttribute('aria-expanded')).toBe('false');
    expect(header.querySelector('button').getAttribute('aria-expanded')).toBe('true');
  });
});
