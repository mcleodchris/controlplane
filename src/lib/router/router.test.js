// @vitest-environment happy-dom
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { router } from './router.js';
import { html, render } from '../html/html.js';

const listeners = [];

beforeAll(() => {
  render(document.body, html`<main id="page-content"></main>`);
  for (const target of [window, document]) {
    const add = target.addEventListener.bind(target);
    vi.spyOn(target, 'addEventListener').mockImplementation((type, listener, options) => {
      listeners.push(() => target.removeEventListener(type, listener, options));
      add(type, listener, options);
    });
  }
  router.on('/', { render: container => { container.textContent = 'Dashboard'; } });
  router.on('/hobbies', { render: container => { container.textContent = 'Hobby Log'; } });
  router.beforeEach(path => path === '/redirect' ? '/hobbies' : path);
  router.start();
  vi.restoreAllMocks();
});

beforeEach(() => {
  render(document.body, html`<main id="page-content"></main>`);
  router.resetContainer();
  router.navigate('/reset', true);
  router.navigate('/', true);
});

afterAll(() => listeners.forEach(remove => remove()));

it('notifies after rendering the resolved route, and supports unsubscribing', () => {
  const rendered = [];
  const unsubscribe = router.afterEach(path => rendered.push([path, document.querySelector('main').textContent]));
  router.navigate('/redirect');
  expect(rendered).toEqual([['/hobbies', 'Hobby Log']]);
  unsubscribe();
  router.navigate('/');
  expect(rendered).toHaveLength(1);
});

it('notifies when the current route is selected without rendering it again', () => {
  const content = document.querySelector('main');
  const child = document.createElement('span');
  content.append(child);
  const after = vi.fn();
  const unsubscribe = router.afterEach(after);
  router.navigate('/');
  expect(after).toHaveBeenCalledExactlyOnceWith('/');
  expect(content.contains(child)).toBe(true);
  unsubscribe();
});

it('notifies for history navigation and for 404 recovery links in the same document', () => {
  const after = vi.fn();
  const unsubscribe = router.afterEach(after);
  window.history.replaceState({}, '', '/hobbies');
  window.dispatchEvent(new PopStateEvent('popstate'));
  expect(after).toHaveBeenLastCalledWith('/hobbies');
  router.navigate('/missing');
  expect(after).toHaveBeenLastCalledWith('/missing');
  const event = new MouseEvent('click', { bubbles: true, cancelable: true });
  document.querySelector('a[data-link]').dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  expect(after).toHaveBeenLastCalledWith('/');
  expect(document.querySelector('main').textContent).toBe('Dashboard');
  unsubscribe();
});
