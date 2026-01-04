/**
 * Login Page Component
 */

import { auth } from '../lib/utils/auth.js';
import { store } from '../lib/state/store.js';
import { LoadingSpinner } from '../components/common/LoadingSpinner.js';
import { Toast } from '../components/common/Toast.js';

export const LoginPage = {
  _isLoading: false,

  /**
   * Render the login page
   */
  render(container) {
    const appName = window.ENV?.APP_NAME || 'Controlplane';

    container.innerHTML = `
      <div style="
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--spacing-lg);
        background-color: var(--color-bg-secondary);
      ">
        <div class="card" style="width: 100%; max-width: 400px;">
          <div style="text-align: center; margin-bottom: var(--spacing-xl);">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" style="margin: 0 auto var(--spacing-md);">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            <h1 style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold);">
              ${this._escapeHtml(appName)}
            </h1>
            <p style="color: var(--color-text-secondary); margin-top: var(--spacing-xs);">
              Enter your API token to continue
            </p>
          </div>

          <form id="login-form" autocomplete="on">
            <div class="form-group" style="margin-bottom: var(--spacing-md);">
              <label for="token" class="form-label">API Token</label>
              <input
                type="password"
                id="token"
                name="password"
                class="form-input"
                placeholder="Enter your token"
                required
                autocomplete="current-password"
              />
              <p class="form-hint" style="margin-top: var(--spacing-xs);">
                Your token is stored securely in your browser.
              </p>
            </div>

            <div class="form-group" style="margin-bottom: var(--spacing-lg);">
              <label style="
                display: flex;
                align-items: center;
                gap: var(--spacing-sm);
                cursor: pointer;
                font-size: var(--font-size-sm);
              ">
                <input
                  type="checkbox"
                  id="remember"
                  name="remember"
                  style="
                    width: 18px;
                    height: 18px;
                    cursor: pointer;
                  "
                />
                <span>Remember me on this device</span>
              </label>
            </div>

            <div id="login-error" style="margin-bottom: var(--spacing-md); display: none;"></div>

            <button
              type="submit"
              class="btn btn-primary w-full"
              id="login-btn"
              style="font-size: var(--font-size-base);"
            >
              <span id="login-btn-text">Sign In</span>
              <span id="login-btn-loading" style="display: none;">
                ${LoadingSpinner.render('small')}
              </span>
            </button>
          </form>
        </div>
      </div>
    `;

    this._setupEventListeners(container);
  },

  /**
   * Set up event listeners
   */
  _setupEventListeners(container) {
    const form = container.querySelector('#login-form');
    const tokenInput = container.querySelector('#token');
    const rememberCheckbox = container.querySelector('#remember');
    const loginBtn = container.querySelector('#login-btn');
    const btnText = container.querySelector('#login-btn-text');
    const btnLoading = container.querySelector('#login-btn-loading');
    const errorDiv = container.querySelector('#login-error');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (this._isLoading) return;

      const token = tokenInput.value.trim();
      const remember = rememberCheckbox.checked;

      if (!token) {
        this._showError(errorDiv, 'Please enter your API token');
        return;
      }

      // Show loading state
      this._isLoading = true;
      loginBtn.disabled = true;
      btnText.style.display = 'none';
      btnLoading.style.display = 'inline-flex';
      errorDiv.style.display = 'none';

      try {
        // Validate token against API
        const isValid = await auth.validateToken(token);

        if (isValid) {
          // Store token and update state
          auth.setToken(token, remember);
          store.setState({ auth: { isAuthenticated: true, token } });
          Toast.success('Welcome back!');
        } else {
          this._showError(errorDiv, 'Invalid token. Please check and try again.');
        }
      } catch (error) {
        console.error('Login error:', error);
        this._showError(errorDiv, 'Unable to connect to the server. Please try again.');
      } finally {
        // Reset loading state
        this._isLoading = false;
        loginBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
      }
    });

    // Focus token input
    tokenInput.focus();
  },

  /**
   * Show error message
   */
  _showError(container, message) {
    container.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-sm) var(--spacing-md);
        background-color: var(--color-error-light);
        border: 1px solid var(--color-error);
        border-radius: var(--border-radius);
        color: var(--color-error);
        font-size: var(--font-size-sm);
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M15 9l-6 6M9 9l6 6"/>
        </svg>
        <span>${this._escapeHtml(message)}</span>
      </div>
    `;
    container.style.display = 'block';
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
