/**
 * Error Message Component
 */

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
      ? `<button class="btn btn-primary btn-sm" id="error-retry-btn">Try Again</button>`
      : '';

    const dismissButton = onDismiss
      ? `<button class="btn btn-ghost btn-sm" id="error-dismiss-btn">Dismiss</button>`
      : '';

    const html = `
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
            ${this._escapeHtml(message)}
          </p>
          ${retryButton || dismissButton ? `
            <div style="display: flex; gap: var(--spacing-sm);">
              ${retryButton}
              ${dismissButton}
            </div>
          ` : ''}
        </div>
      </div>
    `;

    // Return object with html and setup function
    return {
      html,
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
    return `<span class="form-error">${this._escapeHtml(message)}</span>`;
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
