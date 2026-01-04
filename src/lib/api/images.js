/**
 * Images API Module
 */

import { apiClient } from './client.js';

export const imagesApi = {
  /**
   * List all images
   */
  async list() {
    return apiClient.get('/images/list');
  },

  /**
   * Get a specific image by index
   */
  async get(index) {
    return apiClient.get(`/images/image/${index}`);
  },
};
