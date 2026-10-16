/**
 * App Navigation Component
 */

import { store } from '../../lib/state/store.js';
import { html, render } from '../../lib/html/html.js';
import { router } from '../../lib/router/router.js';

const NAV_ITEMS = [
  {
    path: '/',
    label: 'Dashboard',
    icon: html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="7" height="9" rx="1"/>
      <rect x="14" y="3" width="7" height="5" rx="1"/>
      <rect x="14" y="12" width="7" height="9" rx="1"/>
      <rect x="3" y="16" width="7" height="5" rx="1"/>
    </svg>`,
  },
  {
    path: '/hobbies',
    label: 'Hobby Log',
    icon: html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
      <path d="M2 17l10 5 10-5"/>
      <path d="M2 12l10 5 10-5"/>
    </svg>`,
  },
  {
    path: '/photos',
    label: 'Photos',
    icon: html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <path d="M21 15l-5-5L5 21"/>
    </svg>`,
  },
  {
    path: '/notes',
    label: 'Notes',
    icon: html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>`,
  },
  {
    path: '/webmentions',
    label: 'Webmentions',
    icon: html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
    </svg>`,
  },
];

export const AppNav = {
  _cleanup: [],
  /**
   * Render the navigation into a container
   */
  render(container) {
    this.destroy();

    render(container, html`
      <nav class="nav-menu" style="display: flex; flex-direction: column; gap: var(--spacing-xs);">
        ${NAV_ITEMS.map(item => html`
          <a
            href="${item.path}"
            data-link
            class="nav-item"
          >
            ${item.icon}
            <span>${item.label}</span>
          </a>
        `)}
      </nav>
    `);

    const desktop = window.matchMedia('(min-width: 768px)');
    const backdrop = document.createElement('button');
    backdrop.type = 'button';
    backdrop.className = 'mobile-nav-backdrop';
    backdrop.setAttribute('aria-label', 'Close navigation menu');
    backdrop.hidden = true;
    document.body.append(backdrop);
    backdrop.addEventListener('click', () => this._closeMobileMenu());
    this._cleanup.push(() => backdrop.remove());

    const syncVisibility = ({ mobileMenuOpen }) => {
      container.classList.toggle('open', mobileMenuOpen);
      const visible = mobileMenuOpen && !desktop.matches;
      backdrop.hidden = !visible;
      document.documentElement.classList.toggle('mobile-menu-open', visible);
    };
    const syncRoute = path => {
      container.querySelectorAll('.nav-item').forEach(item => {
        const active = item.getAttribute('href') === path;
        item.classList.toggle('active', active);
        if (active) item.setAttribute('aria-current', 'page');
        else item.removeAttribute('aria-current');
      });
      this._closeMobileMenu();
    };

    this._cleanup.push(store.subscribe('ui', syncVisibility));
    this._cleanup.push(router.afterEach(syncRoute));
    syncRoute(router.getCurrentPath() ?? window.location.pathname);
    syncVisibility(store.getState('ui'));

    const closeOnLayoutChange = () => this._closeMobileMenu();
    desktop.addEventListener('change', closeOnLayoutChange);
    this._cleanup.push(() => desktop.removeEventListener('change', closeOnLayoutChange));

    const closeOnEscape = event => {
      if (event.key === 'Escape') this._closeMobileMenu();
    };
    document.addEventListener('keydown', closeOnEscape);
    this._cleanup.push(() => document.removeEventListener('keydown', closeOnEscape));
  },

  _closeMobileMenu() {
    if (store.getState('ui').mobileMenuOpen) {
      store.updateSlice('ui', { mobileMenuOpen: false });
    }
  },

  /** Release subscriptions when the authenticated layout is replaced. */
  destroy() {
    this._closeMobileMenu();
    this._cleanup.forEach(cleanup => cleanup());
    this._cleanup = [];
    document.documentElement.classList.remove('mobile-menu-open');
  },
};
