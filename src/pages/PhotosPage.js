/**
 * Photos Management Page
 */

import { store } from '../lib/state/store.js';
import { imagesApi } from '../lib/api/images.js';
import { micropubApi } from '../lib/api/micropub.js';
import { publishApi } from '../lib/api/publish.js';
import { openaiApi } from '../lib/api/openai.js';
import { LoadingSpinner } from '../components/common/LoadingSpinner.js';
import { Toast } from '../components/common/Toast.js';

export const PhotosPage = {
  _activeTab: 'gallery',
  _selectedPhoto: null,

  /**
   * Render the photos page
   */
  render(container) {
    container.innerHTML = `
      <div class="animate-fade-in">
        <h1 class="page-title">Photos</h1>

        <!-- Tab Navigation -->
        <div style="
          display: flex;
          gap: var(--spacing-xs);
          margin-bottom: var(--spacing-lg);
          border-bottom: 1px solid var(--color-border);
        ">
          <button class="tab-btn ${this._activeTab === 'gallery' ? 'active' : ''}" data-tab="gallery">
            Gallery
          </button>
          <button class="tab-btn ${this._activeTab === 'upload' ? 'active' : ''}" data-tab="upload">
            Upload
          </button>
          <button class="tab-btn ${this._activeTab === 'create-post' ? 'active' : ''}" data-tab="create-post">
            Create Post
          </button>
        </div>

        <div id="photos-content">
          ${LoadingSpinner.fullPage()}
        </div>
      </div>

      <style>
        .tab-btn {
          padding: var(--spacing-sm) var(--spacing-md);
          color: var(--color-text-secondary);
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-medium);
          transition: all var(--transition-fast);
          margin-bottom: -1px;
        }
        .tab-btn:hover {
          color: var(--color-text);
        }
        .tab-btn.active {
          color: var(--color-primary);
          border-bottom-color: var(--color-primary);
        }
        .photo-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: var(--spacing-md);
        }
        .photo-card {
          aspect-ratio: 1;
          border-radius: var(--border-radius);
          overflow: hidden;
          cursor: pointer;
          position: relative;
          background-color: var(--color-bg-tertiary);
        }
        .photo-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform var(--transition-base);
        }
        .photo-card:hover img {
          transform: scale(1.05);
        }
        .photo-card-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: var(--spacing-sm);
          background: linear-gradient(transparent, rgba(0,0,0,0.7));
          color: white;
          font-size: var(--font-size-xs);
          opacity: 0;
          transition: opacity var(--transition-fast);
        }
        .photo-card:hover .photo-card-overlay {
          opacity: 1;
        }
        .drop-zone {
          border: 2px dashed var(--color-border);
          border-radius: var(--border-radius-lg);
          padding: var(--spacing-3xl);
          text-align: center;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .drop-zone:hover, .drop-zone.dragover {
          border-color: var(--color-primary);
          background-color: var(--color-primary-light);
        }
      </style>
    `;

    this._setupEventListeners(container);
    this._renderTab();
  },

  /**
   * Set up event listeners
   */
  _setupEventListeners(container) {
    container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._activeTab = btn.dataset.tab;
        container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._renderTab();
      });
    });
  },

  /**
   * Render the active tab
   */
  async _renderTab() {
    const content = document.getElementById('photos-content');
    if (!content) return;

    switch (this._activeTab) {
      case 'gallery':
        await this._renderGallery(content);
        break;
      case 'upload':
        this._renderUpload(content);
        break;
      case 'create-post':
        this._renderCreatePost(content);
        break;
    }
  },

  /**
   * Render the photo gallery
   */
  async _renderGallery(container) {
    container.innerHTML = LoadingSpinner.fullPage();

    try {
      const images = await imagesApi.list();
      store.updateSlice('images', { items: images, loading: false, error: null });

      if (!images || images.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21"/>
              </svg>
            </div>
            <h2 class="empty-state-title">No photos yet</h2>
            <p class="empty-state-description">Upload your first photo to get started.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="photo-grid">
          ${images.map((img, index) => this._renderPhotoCard(img, index)).join('')}
        </div>
      `;

      // Add click handlers
      container.querySelectorAll('.photo-card').forEach(card => {
        card.addEventListener('click', () => {
          const index = parseInt(card.dataset.index);
          this._showPhotoDetail(images[index], index);
        });
      });
    } catch (error) {
      console.error('Failed to load images:', error);
      container.innerHTML = `
        <div class="empty-state">
          <h2 class="empty-state-title">Failed to load photos</h2>
          <p class="empty-state-description">${this._escapeHtml(error.message)}</p>
          <button class="btn btn-primary" onclick="location.reload()">Retry</button>
        </div>
      `;
    }
  },

  /**
   * Render a photo card
   */
  _renderPhotoCard(image, index) {
    // Handle different image formats
    let src = '';
    if (typeof image === 'string') {
      src = image;
    } else {
      // Try to get a thumbnail from metadata first, fallback to original
      const smallestAvif = image.metadata?.avif?.[0]?.url;
      const smallestWebp = image.metadata?.webp?.[0]?.url;
      src = smallestAvif || smallestWebp || image.original || image.url || image.thumbnailUrl || '';
    }

    const alt = typeof image === 'object' ? (image.alt || 'Photo') : 'Photo';
    const date = image.createdAt ? new Date(image.createdAt).toLocaleDateString() : '';

    return `
      <div class="photo-card" data-index="${index}">
        <img
          src="${this._escapeHtml(src)}"
          alt="${this._escapeHtml(alt)}"
          loading="lazy"
        />
        <div class="photo-card-overlay">
          ${date}
        </div>
      </div>
    `;
  },

  /**
   * Show photo detail modal
   */
  _showPhotoDetail(image, index) {
    const backdrop = document.createElement('div');
    backdrop.id = 'photo-detail-modal';
    backdrop.style.cssText = `
      position: fixed;
      inset: 0;
      background-color: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: var(--z-modal);
      padding: var(--spacing-lg);
    `;

    let imgSrc = '';
    if (typeof image === 'string') {
      imgSrc = image;
    } else {
      // Use original for full-size view
      imgSrc = image.original || image.url || image.originalUrl || '';
    }

    backdrop.innerHTML = `
      <button class="btn btn-ghost" style="position: absolute; top: var(--spacing-md); right: var(--spacing-md); color: white;" id="close-photo-modal">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
      <div style="max-width: 90vw; max-height: 90vh; display: flex; flex-direction: column; gap: var(--spacing-md);">
        <img
          src="${this._escapeHtml(imgSrc)}"
          alt="${this._escapeHtml(image.alt || 'Photo')}"
          style="max-width: 100%; max-height: 80vh; object-fit: contain; border-radius: var(--border-radius);"
        />
        <div style="color: white; text-align: center;">
          ${image.exif ? `
            <p style="font-size: var(--font-size-sm); color: var(--color-text-muted);">
              ${image.exif.camera || ''} ${image.exif.lens || ''}
            </p>
            <p style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
              ${image.exif.focalLength || ''} ${image.exif.aperture || ''} ${image.exif.shutter || ''} ${image.exif.iso ? `ISO ${image.exif.iso}` : ''}
            </p>
          ` : ''}
          <button class="btn btn-primary mt-md" id="use-photo-for-post">Use for Post</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    backdrop.querySelector('#close-photo-modal').addEventListener('click', () => backdrop.remove());
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) backdrop.remove();
    });

    backdrop.querySelector('#use-photo-for-post')?.addEventListener('click', () => {
      this._selectedPhoto = image;
      backdrop.remove();
      this._activeTab = 'create-post';
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === 'create-post');
      });
      this._renderTab();
    });
  },

  /**
   * Render the upload tab
   */
  _renderUpload(container) {
    container.innerHTML = `
      <div class="drop-zone" id="upload-drop-zone">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto var(--spacing-md); color: var(--color-text-muted);">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <p style="font-size: var(--font-size-lg); margin-bottom: var(--spacing-sm);">
          Drag and drop photos here
        </p>
        <p style="color: var(--color-text-muted); margin-bottom: var(--spacing-md);">
          or click to select files
        </p>
        <input
          type="file"
          id="file-input"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          style="display: none;"
        />
        <p style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
          JPEG, PNG, WebP, or AVIF - Max 150MB each
        </p>
      </div>

      <div id="upload-queue" style="margin-top: var(--spacing-lg);"></div>
    `;

    const dropZone = container.querySelector('#upload-drop-zone');
    const fileInput = container.querySelector('#file-input');
    const queue = container.querySelector('#upload-queue');

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      this._handleFiles(files, queue);
    });

    fileInput.addEventListener('change', () => {
      const files = Array.from(fileInput.files);
      this._handleFiles(files, queue);
      fileInput.value = '';
    });
  },

  /**
   * Handle file uploads
   */
  async _handleFiles(files, queue) {
    for (const file of files) {
      const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const item = document.createElement('div');
      item.id = id;
      item.className = 'card';
      item.style.marginBottom = 'var(--spacing-sm)';
      item.innerHTML = `
        <div style="display: flex; align-items: center; gap: var(--spacing-md);">
          <div style="width: 60px; height: 60px; flex-shrink: 0; border-radius: var(--border-radius); overflow: hidden; background: var(--color-bg-tertiary);">
            <img src="${URL.createObjectURL(file)}" style="width: 100%; height: 100%; object-fit: cover;" alt="Preview" />
          </div>
          <div style="flex: 1; min-width: 0;">
            <p style="font-weight: var(--font-weight-medium); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${this._escapeHtml(file.name)}
            </p>
            <div style="height: 6px; background: var(--color-bg-tertiary); border-radius: 3px; overflow: hidden; margin-top: var(--spacing-xs);">
              <div class="progress-bar" style="height: 100%; width: 0%; background: var(--color-primary); transition: width 0.3s;"></div>
            </div>
            <p class="status-text" style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: var(--spacing-xs);">
              Uploading...
            </p>
          </div>
        </div>
      `;

      queue.appendChild(item);

      try {
        await micropubApi.uploadImage(file, (progress) => {
          const bar = item.querySelector('.progress-bar');
          if (bar) bar.style.width = `${progress}%`;
        });

        item.querySelector('.status-text').textContent = 'Upload complete!';
        item.querySelector('.status-text').style.color = 'var(--color-success)';
        item.querySelector('.progress-bar').style.background = 'var(--color-success)';
      } catch (error) {
        console.error('Upload failed:', error);
        item.querySelector('.status-text').textContent = `Failed: ${error.message}`;
        item.querySelector('.status-text').style.color = 'var(--color-error)';
        item.querySelector('.progress-bar').style.background = 'var(--color-error)';
      }
    }
  },

  /**
   * Render the create post tab
   */
  _renderCreatePost(container) {
    const photo = this._selectedPhoto;

    container.innerHTML = `
      <div class="card" style="max-width: 600px;">
        <h2 style="font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); margin-bottom: var(--spacing-md);">
          Create Photo Post
        </h2>

        ${photo ? `
          <div style="margin-bottom: var(--spacing-md);">
            <img
              src="${this._escapeHtml(typeof photo === 'string' ? photo : (photo.metadata?.avif?.[0]?.url || photo.metadata?.webp?.[0]?.url || photo.original || photo.url || ''))}"
              alt="Selected photo"
              style="max-width: 100%; max-height: 200px; object-fit: contain; border-radius: var(--border-radius);"
            />
            <button class="btn btn-ghost btn-sm mt-sm" id="clear-photo">Clear selection</button>
          </div>
        ` : `
          <p style="color: var(--color-text-muted); margin-bottom: var(--spacing-md);">
            Select a photo from the Gallery tab first, or enter a photo URL below.
          </p>
        `}

        <form id="photo-post-form">
          <div class="form-group" style="margin-bottom: var(--spacing-md);">
            <label for="photo-url" class="form-label">Photo URL ${photo ? '(auto-filled)' : '*'}</label>
            <input
              type="url"
              id="photo-url"
              class="form-input"
              ${!photo ? 'required' : ''}
              value="${photo ? this._escapeHtml(typeof photo === 'string' ? photo : (photo.original || photo.url || '')) : ''}"
              placeholder="https://..."
            />
          </div>

          <div class="form-group" style="margin-bottom: var(--spacing-md);">
            <label for="photo-content" class="form-label">Post Content</label>
            <textarea
              id="photo-content"
              class="form-input form-textarea"
              placeholder="What do you want to say about this photo?"
              rows="4"
            ></textarea>
          </div>

          <div class="form-group" style="margin-bottom: var(--spacing-md);">
            <label for="photo-description" class="form-label">Image Description (Alt Text)</label>
            <div style="display: flex; gap: var(--spacing-sm);">
              <textarea
                id="photo-description"
                class="form-input form-textarea"
                placeholder="Describe what's in the photo..."
                rows="3"
                style="flex: 1;"
              ></textarea>
            </div>
            <button type="button" class="btn btn-secondary btn-sm mt-sm" id="generate-alt-text">
              Generate with AI
            </button>
          </div>

          <div class="form-group" style="margin-bottom: var(--spacing-md);">
            <label for="photo-tags" class="form-label">Tags (comma-separated)</label>
            <input
              type="text"
              id="photo-tags"
              class="form-input"
              placeholder="photography, landscape, nature"
            />
          </div>

          <button type="submit" class="btn btn-primary">
            Publish Post
          </button>
        </form>
      </div>
    `;

    container.querySelector('#clear-photo')?.addEventListener('click', () => {
      this._selectedPhoto = null;
      this._renderCreatePost(container);
    });

    container.querySelector('#generate-alt-text')?.addEventListener('click', async () => {
      const urlInput = container.querySelector('#photo-url');
      const descInput = container.querySelector('#photo-description');
      const btn = container.querySelector('#generate-alt-text');

      if (!urlInput.value) {
        Toast.error('Please enter a photo URL first');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Generating...';

      try {
        const altText = await openaiApi.generateAltText(urlInput.value);
        descInput.value = altText;
        Toast.success('Description generated!');
      } catch (error) {
        console.error('Failed to generate alt text:', error);
        Toast.error('Failed to generate description');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Generate with AI';
      }
    });

    container.querySelector('#photo-post-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const imageUrl = container.querySelector('#photo-url').value;
      const content = container.querySelector('#photo-content').value;
      const alt = container.querySelector('#photo-description').value;
      const tags = container.querySelector('#photo-tags').value
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      if (!imageUrl) {
        Toast.error('Photo URL is required');
        return;
      }

      try {
        const result = await publishApi.publishPhoto({
          image: imageUrl,
          alt,
          content,
          tags,
        });

        Toast.success('Photo post published!');

        if (result?.location) {
          // Show success with link
          container.innerHTML = `
            <div class="card text-center" style="max-width: 400px; margin: 0 auto;">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" stroke-width="2" style="margin: 0 auto var(--spacing-md);">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
              <h2 style="font-size: var(--font-size-lg); margin-bottom: var(--spacing-sm);">Post Published!</h2>
              <a href="${this._escapeHtml(result.location)}" target="_blank" class="btn btn-primary">
                View Post
              </a>
            </div>
          `;
        } else {
          // No location returned, just show success
          this._selectedPhoto = null;
          this._renderCreatePost(container);
        }

        this._selectedPhoto = null;
      } catch (error) {
        console.error('Failed to publish post:', error);
        Toast.error(error.message || 'Failed to publish post');
      }
    });
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
