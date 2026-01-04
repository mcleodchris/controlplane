/**
 * Image Handling Utilities
 */

/**
 * Check if a file is an image
 * @param {File} file - File to check
 */
export function isImage(file) {
  return file && file.type.startsWith('image/');
}

/**
 * Check if file size is within limit
 * @param {File} file - File to check
 * @param {number} maxSizeMB - Maximum size in MB
 */
export function isWithinSizeLimit(file, maxSizeMB = 150) {
  const maxBytes = maxSizeMB * 1024 * 1024;
  return file && file.size <= maxBytes;
}

/**
 * Get human-readable file size
 * @param {number} bytes - Size in bytes
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}

/**
 * Create an image preview URL
 * @param {File} file - Image file
 */
export function createPreviewUrl(file) {
  if (!isImage(file)) return null;
  return URL.createObjectURL(file);
}

/**
 * Revoke a preview URL to free memory
 * @param {string} url - Preview URL
 */
export function revokePreviewUrl(url) {
  if (url) {
    URL.revokeObjectURL(url);
  }
}

/**
 * Get image dimensions
 * @param {File|string} source - Image file or URL
 * @returns {Promise<{width: number, height: number}>}
 */
export function getImageDimensions(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });

      if (typeof source !== 'string') {
        URL.revokeObjectURL(img.src);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = typeof source === 'string' ? source : URL.createObjectURL(source);
  });
}

/**
 * Validate image file
 * @param {File} file - File to validate
 * @param {Object} options - Validation options
 */
export function validateImage(file, options = {}) {
  const {
    maxSizeMB = 150,
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
  } = options;

  const errors = [];

  if (!file) {
    errors.push('No file selected');
    return { isValid: false, errors };
  }

  if (!isImage(file)) {
    errors.push('File must be an image');
  } else if (!allowedTypes.includes(file.type)) {
    errors.push(`File type must be one of: ${allowedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')}`);
  }

  if (!isWithinSizeLimit(file, maxSizeMB)) {
    errors.push(`File must be smaller than ${maxSizeMB}MB`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
