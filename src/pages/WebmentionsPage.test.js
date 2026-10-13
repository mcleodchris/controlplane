// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render } from '../lib/html/html.js';
import { WebmentionsPage } from './WebmentionsPage.js';

function renderCard(mention) {
  const el = document.createElement('div');
  render(el, WebmentionsPage._renderMentionCard(mention));
  return el;
}

describe('WebmentionsPage mention card', () => {
  it('shows a styled Anonymous label when the author has no name', () => {
    const el = renderCard({ data: { author: {} }, activity: { type: 'like' }, target: 'https://example.com/post' });

    const label = [...el.querySelectorAll('span')].find((s) => s.textContent === 'Anonymous');
    expect(label).toBeTruthy();
    expect(el.textContent).not.toContain('<span');
  });

  it('keeps hostile author data inert', () => {
    const el = renderCard({
      data: {
        author: { name: '<b>Eve</b>', photo: 'x" onerror="alert(1)', url: 'javascript:alert(1)' },
        content: 'hi <script>alert(1)</script>',
      },
      activity: { type: 'reply' },
      target: 'https://example.com/post',
    });

    expect(el.querySelector('img').getAttribute('onerror')).toBeNull();
    expect(el.querySelector('a').getAttribute('href')).toBe('#');
    expect(el.querySelector('a').textContent.trim()).toBe('<b>Eve</b>');
    expect(el.querySelector('script')).toBeNull();
  });
});
