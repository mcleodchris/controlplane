/**
 * Authentication Utilities
 */

const TOKEN_KEY = 'controlplane_token';

class Auth {
  /**
   * Get the stored token
   */
  getToken() {
    // Check sessionStorage first, then localStorage
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Store the token
   * @param {string} token - The auth token
   * @param {boolean} remember - If true, persist to localStorage
   */
  setToken(token, remember = false) {
    if (remember) {
      localStorage.setItem(TOKEN_KEY, token);
      sessionStorage.removeItem(TOKEN_KEY);
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  /**
   * Clear the stored token
   */
  clearToken() {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }

  /**
   * Check if a token exists
   */
  hasToken() {
    return !!this.getToken();
  }

  /**
   * Check if the current token is valid
   * This calls the API to verify
   */
  async checkAuth() {
    if (!this.hasToken()) {
      return false;
    }

    try {
      // Import dynamically to avoid circular dependency
      const { apiClient } = await import('../api/client.js');
      return await apiClient.checkAuth();
    } catch {
      return false;
    }
  }

  /**
   * Validate a token before storing
   * @param {string} token - Token to validate
   * @returns {Promise<boolean>} - True if valid
   */
  async validateToken(token) {
    try {
      const baseUrl = this._getBaseUrl();
      const response = await fetch(`${baseUrl}/authcheck`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data?.valid === true;
    } catch {
      return false;
    }
  }

  /**
   * Get API base URL
   */
  _getBaseUrl() {
    if (window.ENV?.API_BASE_URL && !window.ENV.API_BASE_URL.startsWith('$')) {
      return window.ENV.API_BASE_URL;
    }
    return import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3000';
  }
}

// Export singleton instance
export const auth = new Auth();
