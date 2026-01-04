/**
 * Publish API Module
 * Handles publishing photo and blog posts
 */

import { apiClient } from './client.js';

/**
 * Generate a GUID for post IDs
 */
function generateGuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export const publishApi = {
  /**
   * Publish a photo post
   * @param {Object} options - Photo post options
   * @param {string} options.image - Image URL (required)
   * @param {string} options.alt - Image description/alt text
   * @param {string} options.content - Post content
   * @param {string[]} options.tags - Array of tags
   * @param {string} options.date - ISO date string (defaults to now)
   * @param {string} options.id - GUID (auto-generated if not provided)
   * @returns {Promise<Object>} - Publish response
   */
  async publishPhoto(options = {}) {
    const { image, alt, content, tags, date, id } = options;

    if (!image) {
      throw new Error('Image URL is required');
    }

    const payload = {
      type: 'photo',
      data: {
        frontmatter: {
          date: date || new Date().toISOString(),
          tags: tags || [],
          alt: alt || '',
          image,
          id: id || generateGuid(),
        },
        content: content || '',
      },
    };

    return apiClient.post('/publish', payload);
  },

  /**
   * Publish a blog post
   * @param {Object} options - Blog post options
   * @param {string} options.title - Blog post title (required)
   * @param {string} options.content - Blog post content (required)
   * @param {string[]} options.tags - Array of tags
   * @param {string} options.date - ISO date string (defaults to now)
   * @param {string} options.id - GUID (auto-generated if not provided)
   * @returns {Promise<Object>} - Publish response
   */
  async publishBlog(options = {}) {
    const { title, content, tags, date, id } = options;

    if (!title) {
      throw new Error('Blog post title is required');
    }

    if (!content) {
      throw new Error('Blog post content is required');
    }

    const payload = {
      type: 'blog',
      data: {
        frontmatter: {
          date: date || new Date().toISOString(),
          tags: tags || [],
          title,
          id: id || generateGuid(),
        },
        content,
      },
    };

    return apiClient.post('/publish', payload);
  },
};
