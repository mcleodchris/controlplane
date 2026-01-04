/**
 * Micropub API Module
 */

import { apiClient } from './client.js';

export const micropubApi = {
  /**
   * Upload an image
   * @param {File} file - The image file to upload
   * @param {function} onProgress - Progress callback (percentage)
   * @returns {Promise<Object>} - Upload response
   */
  async uploadImage(file, onProgress) {
    const formData = new FormData();
    formData.append('file', file);

    // For progress tracking, we need to use XMLHttpRequest
    if (onProgress) {
      return this._uploadWithProgress('/micropub/media', formData, onProgress);
    }

    return apiClient.postForm('/micropub/media', formData);
  },

  /**
   * Get the last uploaded media
   */
  async getLastUpload() {
    return apiClient.get('/micropub/media?q=last');
  },

  /**
   * Create a note post
   * @param {Object} options - Note options
   */
  async createNote(options = {}) {
    const { content, name, tags, published } = options;

    const body = {
      type: ['h-entry'],
      properties: {
        content: [content],
      },
    };

    if (name) {
      body.properties.name = [name];
    }

    if (tags && tags.length > 0) {
      body.properties.category = tags;
    }

    if (published) {
      body.properties.published = [published];
    }

    return apiClient.post('/micropub', body);
  },

  /**
   * Create a photo post
   * @param {Object} options - Photo options
   */
  async createPhotoPost(options = {}) {
    const { photo, content, name, tags, published } = options;

    const body = {
      type: ['h-entry'],
      properties: {
        photo: [photo],
        content: [content],
      },
    };

    if (name) {
      body.properties.name = [name];
    }

    if (tags && tags.length > 0) {
      body.properties.category = tags;
    }

    if (published) {
      body.properties.published = [published];
    }

    return apiClient.post('/micropub', body);
  },

  /**
   * Upload with progress tracking using XMLHttpRequest
   */
  _uploadWithProgress(path, formData, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentage = Math.round((e.loaded / e.total) * 100);
          onProgress(percentage);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data);
          } catch {
            resolve({ url: xhr.getResponseHeader('Location') });
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });

      const baseUrl = window.ENV?.API_BASE_URL || import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3000';
      xhr.open('POST', `${baseUrl}${path}`);

      // Add auth header
      const token = sessionStorage.getItem('controlplane_token') || localStorage.getItem('controlplane_token');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.send(formData);
    });
  },
};
