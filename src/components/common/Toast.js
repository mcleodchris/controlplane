/**
 * Toast Notification Component
 */

import { store } from '../../lib/state/store.js';

const TOAST_DURATION = 5000;

export const Toast = {
  _timeoutId: null,

  /**
   * Show a toast notification
   * @param {string} message - Toast message
   * @param {string} type - 'success' | 'error' | 'warning' | 'info'
   * @param {number} duration - Duration in ms (0 for persistent)
   */
  show(message, type = 'info', duration = TOAST_DURATION) {
    // Clear existing timeout
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
    }

    store.updateSlice('ui', {
      activeToast: { message, type, id: Date.now() },
    });

    this._render();

    if (duration > 0) {
      this._timeoutId = setTimeout(() => {
        this.dismiss();
      }, duration);
    }
  },

  /**
   * Dismiss the current toast
   */
  dismiss() {
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }

    store.updateSlice('ui', { activeToast: null });
    this._render();
  },

  /**
   * Convenience methods
   */
  success(message, duration) {
    this.show(message, 'success', duration);
  },

  error(message, duration) {
    this.show(message, 'error', duration);
  },

  warning(message, duration) {
    this.show(message, 'warning', duration);
  },

  info(message, duration) {
    this.show(message, 'info', duration);
  },

  /**
   * Render the toast container
   */
  _render() {
    let container = document.getElementById('toast-container');

    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = `
        position: fixed;
        bottom: var(--spacing-lg);
        right: var(--spacing-lg);
        z-index: var(--z-toast);
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }

    const toast = store.getState().ui.activeToast;

    if (!toast) {
      container.innerHTML = '';
      return;
    }

    const icons = {
      success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>`,
      error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>`,
      warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>`,
      info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`,
    };

    const colors = {
      success: 'var(--color-success)',
      error: 'var(--color-error)',
      warning: 'var(--color-warning)',
      info: 'var(--color-info)',
    };

    const bgColors = {
      success: 'var(--color-success-light)',
      error: 'var(--color-error-light)',
      warning: 'var(--color-warning-light)',
      info: 'var(--color-info-light)',
    };

    container.innerHTML = `
      <div class="toast animate-slide-up" style="
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-md) var(--spacing-lg);
        background-color: ${bgColors[toast.type]};
        border: 1px solid ${colors[toast.type]};
        border-radius: var(--border-radius);
        color: ${colors[toast.type]};
        box-shadow: var(--shadow-lg);
        pointer-events: auto;
        max-width: 400px;
      ">
        <span style="flex-shrink: 0;">${icons[toast.type]}</span>
        <span style="flex: 1; font-size: var(--font-size-sm);">${this._escapeHtml(toast.message)}</span>
        <button
          onclick="window.__dismissToast()"
          style="
            flex-shrink: 0;
            padding: var(--spacing-xs);
            color: ${colors[toast.type]};
            opacity: 0.7;
            cursor: pointer;
            background: none;
            border: none;
          "
          aria-label="Dismiss"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `;

    // Add global dismiss function
    window.__dismissToast = () => this.dismiss();
  },

  /**
   * Escape HTML to prevent XSS
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
};
