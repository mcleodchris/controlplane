/**
 * App Header Component
 */

import { store } from '../../lib/state/store.js';
import { auth } from '../../lib/utils/auth.js';
import { router } from '../../lib/router/router.js';

export const AppHeader = {
  /**
   * Render the header into a container
   */
  render(container) {
    const appName = window.ENV?.APP_NAME || 'Controlplane';

    container.innerHTML = `
      <button class="mobile-menu-btn" id="mobile-menu-toggle" aria-label="Toggle menu">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12h18M3 6h18M3 18h18"/>
        </svg>
      </button>

      <a href="/" data-link class="app-logo" style="
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-bold);
        color: var(--color-text);
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
      ">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
        <span class="app-name">${this._escapeHtml(appName)}</span>
      </a>

      <div style="flex: 1;"></div>

      <button
        id="logout-btn"
        class="btn btn-ghost"
        style="display: flex; align-items: center; gap: var(--spacing-xs);"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        <span class="hide-mobile">Logout</span>
      </button>
    `;

    this._setupEventListeners(container);
  },

  /**
   * Set up event listeners
   */
  _setupEventListeners(container) {
    // Mobile menu toggle
    const menuToggle = container.querySelector('#mobile-menu-toggle');
    menuToggle?.addEventListener('click', () => {
      const { mobileMenuOpen } = store.getState().ui;
      store.updateSlice('ui', { mobileMenuOpen: !mobileMenuOpen });

      const sidebar = document.getElementById('app-nav');
      if (sidebar) {
        sidebar.classList.toggle('open', !mobileMenuOpen);
      }
    });

    // Logout button
    const logoutBtn = container.querySelector('#logout-btn');
    logoutBtn?.addEventListener('click', () => {
      auth.clearToken();
      store.setState({ auth: { isAuthenticated: false, token: null } });
    });
  },

  /**
   * Escape HTML
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
};
