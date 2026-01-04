/**
 * Notes Publishing Page
 */

import { micropubApi } from '../lib/api/micropub.js';
import { Toast } from '../components/common/Toast.js';
import { LoadingSpinner } from '../components/common/LoadingSpinner.js';

export const NotesPage = {
  /**
   * Render the notes page
   */
  render(container) {
    container.innerHTML = `
      <div class="animate-fade-in">
        <h1 class="page-title">Write a Note</h1>

        <div class="card" style="max-width: 700px;">
          <form id="note-form">
            <div class="form-group" style="margin-bottom: var(--spacing-md);">
              <label for="note-title" class="form-label">Title (optional)</label>
              <input
                type="text"
                id="note-title"
                class="form-input"
                placeholder="Optional title for your note"
              />
            </div>

            <div class="form-group" style="margin-bottom: var(--spacing-md);">
              <label for="note-content" class="form-label">Content *</label>
              <textarea
                id="note-content"
                class="form-input"
                required
                placeholder="What's on your mind?"
                style="min-height: 200px; resize: vertical; font-family: var(--font-family-base);"
              ></textarea>
              <div style="display: flex; justify-content: space-between; margin-top: var(--spacing-xs);">
                <span class="form-hint">Markdown supported</span>
                <span id="char-count" style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
                  0 characters
                </span>
              </div>
            </div>

            <div class="form-group" style="margin-bottom: var(--spacing-md);">
              <label for="note-tags" class="form-label">Tags (optional)</label>
              <input
                type="text"
                id="note-tags"
                class="form-input"
                placeholder="tag1, tag2, tag3"
              />
              <span class="form-hint">Comma-separated</span>
            </div>

            <div class="form-group" style="margin-bottom: var(--spacing-lg);">
              <label for="note-date" class="form-label">Published Date (optional)</label>
              <input
                type="datetime-local"
                id="note-date"
                class="form-input"
                style="max-width: 300px;"
              />
              <span class="form-hint">Defaults to now if not specified</span>
            </div>

            <div style="display: flex; gap: var(--spacing-sm); flex-wrap: wrap;">
              <button type="submit" class="btn btn-primary" id="submit-btn">
                <span id="submit-text">Publish Note</span>
                <span id="submit-loading" style="display: none;">
                  ${LoadingSpinner.render('small')}
                </span>
              </button>
              <button type="button" class="btn btn-secondary" id="clear-btn">
                Clear
              </button>
            </div>
          </form>

          <div id="note-success" style="display: none; margin-top: var(--spacing-lg);"></div>
        </div>
      </div>
    `;

    this._setupEventListeners(container);
  },

  /**
   * Set up event listeners
   */
  _setupEventListeners(container) {
    const form = container.querySelector('#note-form');
    const contentInput = container.querySelector('#note-content');
    const charCount = container.querySelector('#char-count');
    const clearBtn = container.querySelector('#clear-btn');
    const submitBtn = container.querySelector('#submit-btn');
    const submitText = container.querySelector('#submit-text');
    const submitLoading = container.querySelector('#submit-loading');
    const successDiv = container.querySelector('#note-success');

    // Character counter
    contentInput.addEventListener('input', () => {
      const count = contentInput.value.length;
      charCount.textContent = `${count} character${count !== 1 ? 's' : ''}`;
    });

    // Auto-resize textarea
    contentInput.addEventListener('input', () => {
      contentInput.style.height = 'auto';
      contentInput.style.height = Math.max(200, contentInput.scrollHeight) + 'px';
    });

    // Clear form
    clearBtn.addEventListener('click', () => {
      form.reset();
      charCount.textContent = '0 characters';
      contentInput.style.height = '200px';
      successDiv.style.display = 'none';
    });

    // Submit form
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const content = contentInput.value.trim();
      const name = container.querySelector('#note-title').value.trim() || undefined;
      const tagsInput = container.querySelector('#note-tags').value;
      const dateInput = container.querySelector('#note-date').value;

      if (!content) {
        Toast.error('Content is required');
        return;
      }

      const tags = tagsInput
        ? tagsInput.split(',').map(t => t.trim()).filter(Boolean)
        : undefined;

      const published = dateInput
        ? new Date(dateInput).toISOString()
        : undefined;

      // Show loading state
      submitBtn.disabled = true;
      submitText.style.display = 'none';
      submitLoading.style.display = 'inline-flex';

      try {
        const result = await micropubApi.createNote({
          content,
          name,
          tags,
          published,
        });

        Toast.success('Note published!');

        // Show success message
        const location = result?.location;
        successDiv.innerHTML = `
          <div style="
            display: flex;
            align-items: center;
            gap: var(--spacing-md);
            padding: var(--spacing-md);
            background-color: var(--color-success-light);
            border: 1px solid var(--color-success);
            border-radius: var(--border-radius);
            color: var(--color-success);
          ">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
            <div style="flex: 1;">
              <p style="font-weight: var(--font-weight-medium);">Note published successfully!</p>
              ${location ? `
                <a
                  href="${this._escapeHtml(location)}"
                  target="_blank"
                  style="font-size: var(--font-size-sm); text-decoration: underline;"
                >
                  View post
                </a>
              ` : ''}
            </div>
          </div>
        `;
        successDiv.style.display = 'block';

        // Reset form
        form.reset();
        charCount.textContent = '0 characters';
        contentInput.style.height = '200px';

      } catch (error) {
        console.error('Failed to publish note:', error);
        Toast.error(error.message || 'Failed to publish note');
      } finally {
        submitBtn.disabled = false;
        submitText.style.display = 'inline';
        submitLoading.style.display = 'none';
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
