/**
 * Confirmation Dialog Component
 */

import { store } from '../../lib/state/store.js';

export const ConfirmDialog = {
  _resolvePromise: null,

  /**
   * Show a confirmation dialog
   * @param {Object} options - Dialog options
   * @returns {Promise<boolean>} - Resolves true if confirmed
   */
  show(options = {}) {
    const {
      title = 'Confirm',
      message = 'Are you sure?',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      dangerous = false,
    } = options;

    return new Promise((resolve) => {
      this._resolvePromise = resolve;

      store.updateSlice('ui', {
        confirmDialog: {
          title,
          message,
          confirmText,
          cancelText,
          dangerous,
        },
      });

      this._render();
    });
  },

  /**
   * Close the dialog
   */
  _close(confirmed) {
    store.updateSlice('ui', { confirmDialog: null });

    const backdrop = document.getElementById('confirm-dialog-backdrop');
    if (backdrop) {
      backdrop.remove();
    }

    if (this._resolvePromise) {
      this._resolvePromise(confirmed);
      this._resolvePromise = null;
    }
  },

  /**
   * Render the dialog
   */
  _render() {
    const dialog = store.getState().ui.confirmDialog;

    if (!dialog) return;

    // Remove existing backdrop
    const existing = document.getElementById('confirm-dialog-backdrop');
    if (existing) {
      existing.remove();
    }

    const backdrop = document.createElement('div');
    backdrop.id = 'confirm-dialog-backdrop';
    backdrop.style.cssText = `
      position: fixed;
      inset: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: var(--z-modal);
      padding: var(--spacing-lg);
    `;

    backdrop.innerHTML = `
      <div class="card animate-slide-up" style="
        max-width: 400px;
        width: 100%;
      ">
        <h2 style="
          font-size: var(--font-size-lg);
          font-weight: var(--font-weight-semibold);
          margin-bottom: var(--spacing-sm);
        ">${this._escapeHtml(dialog.title)}</h2>
        <p style="
          color: var(--color-text-secondary);
          margin-bottom: var(--spacing-lg);
        ">${this._escapeHtml(dialog.message)}</p>
        <div style="display: flex; gap: var(--spacing-sm); justify-content: flex-end;">
          <button
            class="btn btn-secondary"
            onclick="window.__confirmDialogClose(false)"
          >${this._escapeHtml(dialog.cancelText)}</button>
          <button
            class="btn ${dialog.dangerous ? 'btn-danger' : 'btn-primary'}"
            onclick="window.__confirmDialogClose(true)"
          >${this._escapeHtml(dialog.confirmText)}</button>
        </div>
      </div>
    `;

    // Close on backdrop click
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        this._close(false);
      }
    });

    // Close on Escape
    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        this._close(false);
        document.removeEventListener('keydown', handleKeydown);
      }
    };
    document.addEventListener('keydown', handleKeydown);

    document.body.appendChild(backdrop);

    // Add global close function
    window.__confirmDialogClose = (confirmed) => this._close(confirmed);

    // Focus the confirm button
    backdrop.querySelector('.btn-primary, .btn-danger')?.focus();
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
