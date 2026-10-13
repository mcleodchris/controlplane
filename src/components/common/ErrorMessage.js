/**
 * Error Message Component
 */

import { html } from '../../lib/html/html.js';

export const ErrorMessage = {
  /**
   * Render an error message
   * @param {Object} options - Options
   */
  render(options = {}) {
    const {
      message = 'An error occurred',
      onRetry = null,
      onDismiss = null,
    } = options;

    const retryButton = onRetry
      ? html`<button class="btn btn-primary btn-sm" id="error-retry-btn">Try Again</button>`
      : null;

    const dismissButton = onDismiss
      ? html`<button class="btn btn-ghost btn-sm" id="error-dismiss-btn">Dismiss</button>`
      : null;

    const view = html`
      <div class="error-message" style="
        display: flex;
        align-items: flex-start;
        gap: var(--spacing-md);
        padding: var(--spacing-md);
        background-color: var(--color-error-light);
        border: 1px solid var(--color-error);
        border-radius: var(--border-radius);
        color: var(--color-error);
      ">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0;">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4M12 16h.01"/>
        </svg>
        <div style="flex: 1;">
          <p style="margin-bottom: ${retryButton || dismissButton ? 'var(--spacing-sm)' : '0'};">
            ${message}
          </p>
          ${retryButton || dismissButton ? html`
            <div style="display: flex; gap: var(--spacing-sm);">
              ${retryButton}
              ${dismissButton}
            </div>
          ` : null}
        </div>
      </div>
    `;

    // Return object with view and setup function
    return {
      html: view,
      setup(container) {
        if (onRetry) {
          container.querySelector('#error-retry-btn')?.addEventListener('click', onRetry);
        }
        if (onDismiss) {
          container.querySelector('#error-dismiss-btn')?.addEventListener('click', onDismiss);
        }
      },
    };
  },

  /**
   * Render inline error (for forms)
   */
  inline(message) {
    return html`<span class="form-error">${message}</span>`;
  },
};
