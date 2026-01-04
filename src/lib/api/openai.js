/**
 * OpenAI API Module
 */

import { apiClient } from './client.js';

export const openaiApi = {
  /**
   * Generate alt text for an image
   * @param {string} imageUrl - URL of the image
   * @returns {Promise<string>} - Generated alt text
   */
  async generateAltText(imageUrl) {
    const response = await apiClient.post('/openai/generate-alt-text', {
      imageUrl,
    });
    return response?.altText || response?.description || '';
  },
};
