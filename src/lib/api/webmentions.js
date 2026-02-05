/**
 * Webmention.io API Module
 *
 * Third-party API - uses fetch() directly, not apiClient (which is Mage-specific).
 */

const WEBMENTION_BASE_URL = 'https://webmention.io/api';

function _getToken() {
  if (window.ENV?.WEBMENTION_TOKEN && !window.ENV.WEBMENTION_TOKEN.startsWith('$')) {
    return window.ENV.WEBMENTION_TOKEN;
  }
  return import.meta.env?.VITE_WEBMENTION_TOKEN || '';
}

export const webmentionsApi = {
  /**
   * Fetch webmentions with pagination
   * @param {Object} options - { page, perPage }
   * @returns {Promise<{links: Array}>}
   */
  async list(options = {}) {
    const { page = 0, perPage = 20 } = options;
    const token = _getToken();

    if (!token) {
      throw new Error('Webmention token not configured');
    }

    const params = new URLSearchParams({
      token,
      page: page.toString(),
      'per-page': perPage.toString(),
    });

    const response = await fetch(`${WEBMENTION_BASE_URL}/mentions.json?${params}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch webmentions: HTTP ${response.status}`);
    }

    return response.json();
  },
};
