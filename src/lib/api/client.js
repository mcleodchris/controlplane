/**
 * Base API Client with Authentication
 */

import { auth } from '../utils/auth.js';
import { store } from '../state/store.js';

class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

class ApiClient {
  constructor() {
    this._baseUrl = this._getBaseUrl();
    this._timeout = 30000; // 30 seconds
  }

  /**
   * Get API base URL from environment
   */
  _getBaseUrl() {
    // Check window.ENV first (runtime injection)
    if (window.ENV?.API_BASE_URL && !window.ENV.API_BASE_URL.startsWith('$')) {
      return window.ENV.API_BASE_URL;
    }
    // Fallback to Vite env
    return import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3000';
  }

  /**
   * Get auth headers
   */
  _getHeaders(customHeaders = {}) {
    const headers = {
      'Accept': 'application/json',
      ...customHeaders,
    };

    const token = auth.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Make a request with timeout
   */
  async _fetch(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this._timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new ApiError('Request timeout', 0);
      }
      throw error;
    }
  }

  /**
   * Handle response
   */
  async _handleResponse(response) {
    // Handle 401 - Unauthorized
    if (response.status === 401) {
      auth.clearToken();
      store.setState({ auth: { isAuthenticated: false, token: null } });
      throw new ApiError('Unauthorized', 401);
    }

    // Handle 204 - No Content
    if (response.status === 204) {
      return null;
    }

    // Handle 202 - Accepted (async operation)
    if (response.status === 202) {
      const location = response.headers.get('Location');
      return { accepted: true, location };
    }

    // Try to parse JSON
    let data;
    const contentType = response.headers.get('Content-Type') || '';

    if (contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    } else {
      data = await response.text();
    }

    // Handle error responses
    if (!response.ok) {
      const message = data?.error || data?.message || `HTTP ${response.status}`;
      throw new ApiError(message, response.status, data);
    }

    return data;
  }

  /**
   * GET request
   */
  async get(path, options = {}) {
    const url = `${this._baseUrl}${path}`;
    const response = await this._fetch(url, {
      method: 'GET',
      headers: this._getHeaders(options.headers),
    });
    return this._handleResponse(response);
  }

  /**
   * POST request (JSON body)
   */
  async post(path, body = null, options = {}) {
    const url = `${this._baseUrl}${path}`;
    const headers = this._getHeaders({
      'Content-Type': 'application/json',
      ...options.headers,
    });

    const response = await this._fetch(url, {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    return this._handleResponse(response);
  }

  /**
   * POST request with FormData (for file uploads)
   */
  async postForm(path, formData, options = {}) {
    const url = `${this._baseUrl}${path}`;
    // Don't set Content-Type - browser will set it with boundary
    const headers = this._getHeaders(options.headers);
    delete headers['Content-Type'];

    const response = await this._fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });
    return this._handleResponse(response);
  }

  /**
   * PUT request
   */
  async put(path, body = null, options = {}) {
    const url = `${this._baseUrl}${path}`;
    const headers = this._getHeaders({
      'Content-Type': 'application/json',
      ...options.headers,
    });

    const response = await this._fetch(url, {
      method: 'PUT',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    return this._handleResponse(response);
  }

  /**
   * DELETE request
   */
  async delete(path, options = {}) {
    const url = `${this._baseUrl}${path}`;
    const response = await this._fetch(url, {
      method: 'DELETE',
      headers: this._getHeaders(options.headers),
    });
    return this._handleResponse(response);
  }

  /**
   * Check if the current token is valid
   */
  async checkAuth() {
    try {
      const response = await this.post('/authcheck');
      return response?.valid === true;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export { ApiError };
