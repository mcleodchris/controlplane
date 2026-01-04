/**
 * Loading Spinner Component
 */

export const LoadingSpinner = {
  /**
   * Render the spinner
   * @param {string} size - 'small' | 'medium' | 'large'
   */
  render(size = 'medium') {
    const sizes = {
      small: '16px',
      medium: '32px',
      large: '48px',
    };

    const spinnerSize = sizes[size] || sizes.medium;

    return `
      <div class="loading-spinner" role="status" aria-label="Loading">
        <svg
          width="${spinnerSize}"
          height="${spinnerSize}"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          style="animation: spin 1s linear infinite; color: var(--color-primary);"
        >
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" />
        </svg>
        <span class="sr-only">Loading...</span>
      </div>
    `;
  },

  /**
   * Create a full-page loading state
   */
  fullPage() {
    return `
      <div class="loading-container">
        ${this.render('large')}
      </div>
    `;
  },
};
