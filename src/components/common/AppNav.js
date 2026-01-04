/**
 * App Navigation Component
 */

import { router } from '../../lib/router/router.js';
import { store } from '../../lib/state/store.js';

const NAV_ITEMS = [
  {
    path: '/',
    label: 'Dashboard',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="7" height="9" rx="1"/>
      <rect x="14" y="3" width="7" height="5" rx="1"/>
      <rect x="14" y="12" width="7" height="9" rx="1"/>
      <rect x="3" y="16" width="7" height="5" rx="1"/>
    </svg>`,
  },
  {
    path: '/hobbies',
    label: 'Hobby Log',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
      <path d="M2 17l10 5 10-5"/>
      <path d="M2 12l10 5 10-5"/>
    </svg>`,
  },
  {
    path: '/photos',
    label: 'Photos',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <path d="M21 15l-5-5L5 21"/>
    </svg>`,
  },
  {
    path: '/notes',
    label: 'Notes',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>`,
  },
];

export const AppNav = {
  /**
   * Render the navigation into a container
   */
  render(container) {
    const currentPath = window.location.pathname;

    container.innerHTML = `
      <nav class="nav-menu" style="display: flex; flex-direction: column; gap: var(--spacing-xs);">
        ${NAV_ITEMS.map(item => `
          <a
            href="${item.path}"
            data-link
            class="nav-item ${currentPath === item.path ? 'active' : ''}"
            style="
              display: flex;
              align-items: center;
              gap: var(--spacing-sm);
              padding: var(--spacing-sm) var(--spacing-md);
              border-radius: var(--border-radius);
              color: ${currentPath === item.path ? 'var(--color-primary)' : 'var(--color-text-secondary)'};
              background-color: ${currentPath === item.path ? 'var(--color-primary-light)' : 'transparent'};
              font-weight: ${currentPath === item.path ? 'var(--font-weight-medium)' : 'var(--font-weight-normal)'};
              transition: all var(--transition-fast);
              min-height: 44px;
            "
            onmouseenter="this.style.backgroundColor = '${currentPath === item.path ? 'var(--color-primary-light)' : 'var(--color-surface-hover)'}'"
            onmouseleave="this.style.backgroundColor = '${currentPath === item.path ? 'var(--color-primary-light)' : 'transparent'}'"
          >
            ${item.icon}
            <span>${item.label}</span>
          </a>
        `).join('')}
      </nav>
    `;

    this._setupEventListeners(container);
  },

  /**
   * Set up event listeners
   */
  _setupEventListeners(container) {
    // Close mobile menu on nav click
    container.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        store.updateSlice('ui', { mobileMenuOpen: false });
        container.classList.remove('open');
      });
    });
  },
};
