/**
 * Hobby API Module
 */

import { apiClient } from './client.js';

export const hobbyApi = {
  /**
   * List all hobbies
   */
  async list() {
    return apiClient.get('/hobby');
  },

  /**
   * Create a new hobby
   * @param {Object} data - Hobby data
   */
  async create(data) {
    return apiClient.post('/hobby', data);
  },

  /**
   * Update a hobby
   * @param {string} id - Hobby ID
   * @param {Object} data - Updated hobby data
   */
  async update(id, data) {
    return apiClient.put(`/hobby/${id}`, data);
  },

  /**
   * Delete a hobby
   * @param {string} id - Hobby ID
   */
  async delete(id) {
    return apiClient.delete(`/hobby/${id}`);
  },
};
