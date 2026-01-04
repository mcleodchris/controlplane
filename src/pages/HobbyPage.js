/**
 * Hobby Management Page
 */

import { store } from '../lib/state/store.js';
import { apiClient } from '../lib/api/client.js';
import { LoadingSpinner } from '../components/common/LoadingSpinner.js';
import { Toast } from '../components/common/Toast.js';
import { ConfirmDialog } from '../components/common/ConfirmDialog.js';

export const HobbyPage = {
  _unsubscribe: null,

  /**
   * Render the hobby page
   */
  render(container) {
    container.innerHTML = `
      <div class="animate-fade-in">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-lg);">
          <h1 class="page-title" style="margin-bottom: 0;">Hobby Log</h1>
          <button id="add-hobby-btn" class="btn btn-primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Add Log Entry
          </button>
        </div>

        <div id="hobby-filters" style="margin-bottom: var(--spacing-lg);">
          <div style="display: flex; gap: var(--spacing-sm); flex-wrap: wrap;">
            <input
              type="search"
              id="hobby-search"
              class="form-input"
              placeholder="Search log entries..."
              style="max-width: 300px;"
            />
            <select id="hobby-game-filter" class="form-input" style="max-width: 200px;">
              <option value="">All Games</option>
            </select>
            <select id="hobby-year-filter" class="form-input" style="max-width: 150px;">
              <option value="">All Years</option>
            </select>
          </div>
        </div>

        <div id="hobby-list-container">
          ${LoadingSpinner.fullPage()}
        </div>

        <!-- Modal for Add/Edit Form -->
        <div id="hobby-modal" style="display: none;"></div>
      </div>
    `;

    this._setupEventListeners(container);
    this._loadHobbies();
  },

  /**
   * Set up event listeners
   */
  _setupEventListeners(container) {
    const addBtn = container.querySelector('#add-hobby-btn');
    const searchInput = container.querySelector('#hobby-search');
    const gameFilter = container.querySelector('#hobby-game-filter');
    const yearFilter = container.querySelector('#hobby-year-filter');

    addBtn.addEventListener('click', () => this._showForm());

    searchInput.addEventListener('input', () => this._filterHobbies());
    gameFilter.addEventListener('change', () => this._filterHobbies());
    yearFilter.addEventListener('change', () => this._filterHobbies());

    // Subscribe to hobby state changes
    this._unsubscribe = store.subscribe('hobbies', () => {
      this._renderList();
    });
  },

  /**
   * Load hobbies from API
   */
  async _loadHobbies() {
    store.updateSlice('hobbies', { loading: true, error: null });

    try {
      const items = await apiClient.get('/hobby');
      store.updateSlice('hobbies', { items, loading: false });
      this._populateFilters();
    } catch (error) {
      console.error('Failed to load hobbies:', error);
      store.updateSlice('hobbies', { loading: false, error: error.message });
      Toast.error('Failed to load hobbies');
    }
  },

  /**
   * Populate filter dropdowns
   */
  _populateFilters() {
    const { items } = store.getState().hobbies;

    // Get unique games
    const games = [...new Set(items.map(h => h.game).filter(Boolean))].sort();
    const gameFilter = document.getElementById('hobby-game-filter');
    if (gameFilter) {
      gameFilter.innerHTML = '<option value="">All Games</option>' +
        games.map(g => `<option value="${this._escapeHtml(g)}">${this._escapeHtml(g)}</option>`).join('');
    }

    // Get unique years
    const years = [...new Set(items.map(h => {
      if (h.completedDate) {
        return new Date(h.completedDate).getFullYear();
      }
      return null;
    }).filter(Boolean))].sort((a, b) => b - a);

    const yearFilter = document.getElementById('hobby-year-filter');
    if (yearFilter) {
      yearFilter.innerHTML = '<option value="">All Years</option>' +
        years.map(y => `<option value="${y}">${y}</option>`).join('');
    }
  },

  /**
   * Filter hobbies based on current filter values
   */
  _filterHobbies() {
    this._renderList();
  },

  /**
   * Render the hobby list
   */
  _renderList() {
    const container = document.getElementById('hobby-list-container');
    if (!container) return;

    const { items, loading, error } = store.getState().hobbies;

    if (loading) {
      container.innerHTML = LoadingSpinner.fullPage();
      return;
    }

    if (error) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">!</div>
          <h2 class="empty-state-title">Failed to load hobbies</h2>
          <p class="empty-state-description">${this._escapeHtml(error)}</p>
          <button class="btn btn-primary" onclick="location.reload()">Retry</button>
        </div>
      `;
      return;
    }

    // Apply filters
    const search = document.getElementById('hobby-search')?.value.toLowerCase() || '';
    const gameFilter = document.getElementById('hobby-game-filter')?.value || '';
    const yearFilter = document.getElementById('hobby-year-filter')?.value || '';

    const filtered = items.filter(hobby => {
      if (search && !hobby.item?.toLowerCase().includes(search)) {
        return false;
      }
      if (gameFilter && hobby.game !== gameFilter) {
        return false;
      }
      if (yearFilter && hobby.completedDate) {
        const year = new Date(hobby.completedDate).getFullYear().toString();
        if (year !== yearFilter) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h2 class="empty-state-title">${items.length === 0 ? 'No log entries yet' : 'No matches found'}</h2>
          <p class="empty-state-description">
            ${items.length === 0 ? 'Add your first log entry to get started.' : 'Try adjusting your filters.'}
          </p>
        </div>
      `;
      return;
    }

    // Sort by completedDate descending
    const sorted = [...filtered].sort((a, b) => {
      const dateA = a.completedDate ? new Date(a.completedDate) : new Date(0);
      const dateB = b.completedDate ? new Date(b.completedDate) : new Date(0);
      return dateB - dateA;
    });

    container.innerHTML = `
      <div class="hobby-list" style="display: flex; flex-direction: column; gap: var(--spacing-sm);">
        ${sorted.map(hobby => this._renderCard(hobby)).join('')}
      </div>
    `;

    // Add event listeners to cards
    container.querySelectorAll('.hobby-card').forEach(card => {
      const id = card.dataset.id;

      card.querySelector('.edit-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const hobby = items.find(h => h.id === id);
        if (hobby) this._showForm(hobby);
      });

      card.querySelector('.delete-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this._deleteHobby(id);
      });
    });
  },

  /**
   * Render a hobby card
   */
  _renderCard(hobby) {
    const date = hobby.completedDate
      ? new Date(hobby.completedDate).toLocaleDateString()
      : 'Not completed';

    return `
      <div class="hobby-card card" data-id="${hobby.id}" style="padding: var(--spacing-md);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--spacing-md);">
          <div style="flex: 1;">
            <h3 style="font-weight: var(--font-weight-semibold); margin-bottom: var(--spacing-xs);">
              ${this._escapeHtml(hobby.item || 'Untitled')}
            </h3>
            <div style="display: flex; flex-wrap: wrap; gap: var(--spacing-md); color: var(--color-text-secondary); font-size: var(--font-size-sm);">
              ${hobby.game ? `<span>Game: ${this._escapeHtml(hobby.game)}</span>` : ''}
              ${hobby.modelCount ? `<span>Models: ${hobby.modelCount}</span>` : ''}
              <span>Completed: ${date}</span>
            </div>
          </div>
          <div style="display: flex; gap: var(--spacing-xs);">
            <button class="btn btn-ghost btn-sm edit-btn" title="Edit">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="btn btn-ghost btn-sm delete-btn" title="Delete" style="color: var(--color-error);">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Show add/edit form
   */
  _showForm(hobby = null) {
    const modal = document.getElementById('hobby-modal');
    if (!modal) return;

    const isEdit = !!hobby;
    const title = isEdit ? 'Edit Log Entry' : 'Add Log Entry';

    modal.style.display = 'block';
    modal.innerHTML = `
      <div style="
        position: fixed;
        inset: 0;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: var(--z-modal);
        padding: var(--spacing-lg);
      " id="hobby-modal-backdrop">
        <div class="card animate-slide-up" style="width: 100%; max-width: 500px;">
          <h2 style="font-size: var(--font-size-xl); font-weight: var(--font-weight-semibold); margin-bottom: var(--spacing-lg);">
            ${title}
          </h2>

          <form id="hobby-form">
            <div class="form-group" style="margin-bottom: var(--spacing-md);">
              <label for="hobby-item" class="form-label">Item Name *</label>
              <input
                type="text"
                id="hobby-item"
                class="form-input"
                required
                value="${isEdit ? this._escapeHtml(hobby.item || '') : ''}"
              />
            </div>

            <div class="form-group" style="margin-bottom: var(--spacing-md);">
              <label for="hobby-game" class="form-label">Game</label>
              <input
                type="text"
                id="hobby-game"
                class="form-input"
                value="${isEdit ? this._escapeHtml(hobby.game || '') : ''}"
              />
            </div>

            <div class="form-group" style="margin-bottom: var(--spacing-md);">
              <label for="hobby-count" class="form-label">Model Count</label>
              <input
                type="number"
                id="hobby-count"
                class="form-input"
                min="0"
                value="${isEdit ? (hobby.modelCount || '') : ''}"
              />
            </div>

            <div class="form-group" style="margin-bottom: var(--spacing-lg);">
              <label for="hobby-date" class="form-label">Completed Date</label>
              <input
                type="date"
                id="hobby-date"
                class="form-input"
                value="${isEdit && hobby.completedDate ? hobby.completedDate.split('T')[0] : ''}"
              />
            </div>

            <div style="display: flex; gap: var(--spacing-sm); justify-content: flex-end;">
              <button type="button" class="btn btn-secondary" id="hobby-cancel">Cancel</button>
              <button type="submit" class="btn btn-primary" id="hobby-submit">
                ${isEdit ? 'Save Changes' : 'Add Log Entry'}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Event listeners
    const backdrop = modal.querySelector('#hobby-modal-backdrop');
    const form = modal.querySelector('#hobby-form');
    const cancelBtn = modal.querySelector('#hobby-cancel');

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) this._closeForm();
    });

    cancelBtn.addEventListener('click', () => this._closeForm());

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this._submitForm(hobby?.id);
    });

    // Focus first input
    modal.querySelector('#hobby-item').focus();
  },

  /**
   * Close the form
   */
  _closeForm() {
    const modal = document.getElementById('hobby-modal');
    if (modal) {
      modal.style.display = 'none';
      modal.innerHTML = '';
    }
  },

  /**
   * Submit form
   */
  async _submitForm(id = null) {
    const item = document.getElementById('hobby-item').value.trim();
    const game = document.getElementById('hobby-game').value.trim();
    const modelCount = parseInt(document.getElementById('hobby-count').value) || null;
    const completedDate = document.getElementById('hobby-date').value || null;

    if (!item) {
      Toast.error('Item name is required');
      return;
    }

    const data = { item, game, modelCount, completedDate };

    try {
      if (id) {
        await apiClient.put(`/hobby/${id}`, data);
        Toast.success('Log entry updated');
      } else {
        await apiClient.post('/hobby', data);
        Toast.success('Log entry added');
      }

      this._closeForm();
      await this._loadHobbies();
    } catch (error) {
      console.error('Failed to save hobby:', error);
      Toast.error(error.message || 'Failed to save hobby');
    }
  },

  /**
   * Delete a hobby
   */
  async _deleteHobby(id) {
    const confirmed = await ConfirmDialog.show({
      title: 'Delete Log Entry',
      message: 'Are you sure you want to delete this log entry? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      dangerous: true,
    });

    if (!confirmed) return;

    try {
      await apiClient.delete(`/hobby/${id}`);
      Toast.success('Log entry deleted');
      await this._loadHobbies();
    } catch (error) {
      console.error('Failed to delete hobby:', error);
      Toast.error(error.message || 'Failed to delete log entry');
    }
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
