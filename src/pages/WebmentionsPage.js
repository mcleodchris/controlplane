/**
 * Webmentions Page
 */

import { store } from '../lib/state/store.js';
import { webmentionsApi } from '../lib/api/webmentions.js';
import { LoadingSpinner } from '../components/common/LoadingSpinner.js';
import { Toast } from '../components/common/Toast.js';
import { formatRelativeTime } from '../lib/utils/dateFormat.js';

export const WebmentionsPage = {
  _unsubscribe: null,
  _page: 0,
  _hasMore: true,

  render(container) {
    container.innerHTML = `
      <div class="animate-fade-in">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-lg);">
          <h1 class="page-title" style="margin-bottom: 0;">Webmentions</h1>
        </div>

        <div style="margin-bottom: var(--spacing-lg);">
          <div style="display: flex; gap: var(--spacing-sm); flex-wrap: wrap;">
            <select id="wm-type-filter" class="form-input" style="max-width: 200px;">
              <option value="">All Types</option>
              <option value="like">Likes</option>
              <option value="reply">Replies</option>
              <option value="repost">Reposts</option>
              <option value="link">Links</option>
            </select>
          </div>
        </div>

        <div id="wm-list-container">
          ${LoadingSpinner.fullPage()}
        </div>

        <div id="wm-load-more" style="text-align: center; margin-top: var(--spacing-lg); display: none;">
          <button class="btn btn-secondary" id="wm-load-more-btn">Load More</button>
        </div>
      </div>
    `;

    this._setupEventListeners(container);
    this._page = 0;
    this._hasMore = true;
    store.updateSlice('webmentions', { items: [], loading: false, error: null });
    this._loadWebmentions();
  },

  _setupEventListeners(container) {
    const typeFilter = container.querySelector('#wm-type-filter');
    const loadMoreBtn = container.querySelector('#wm-load-more-btn');

    typeFilter.addEventListener('change', () => this._renderList());
    loadMoreBtn.addEventListener('click', () => this._loadMore());

    this._unsubscribe = store.subscribe('webmentions', () => {
      this._renderList();
    });
  },

  async _loadWebmentions() {
    store.updateSlice('webmentions', { loading: true, error: null });

    try {
      const result = await webmentionsApi.list({ page: this._page, perPage: 20 });
      const existing = store.getState('webmentions').items;
      const newItems = [...existing, ...result.links];

      this._hasMore = result.links.length === 20;
      this._page += 1;

      store.updateSlice('webmentions', { items: newItems, loading: false });
    } catch (error) {
      console.error('Failed to load webmentions:', error);
      store.updateSlice('webmentions', { loading: false, error: error.message });
      Toast.error('Failed to load webmentions');
    }
  },

  async _loadMore() {
    const btn = document.getElementById('wm-load-more-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Loading...';
    }

    await this._loadWebmentions();

    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Load More';
    }
  },

  _renderList() {
    const container = document.getElementById('wm-list-container');
    if (!container) return;

    const { items, loading, error } = store.getState('webmentions');

    if (loading && items.length === 0) {
      container.innerHTML = LoadingSpinner.fullPage();
      return;
    }

    if (error && items.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">!</div>
          <h2 class="empty-state-title">Failed to load webmentions</h2>
          <p class="empty-state-description">${this._escapeHtml(error)}</p>
          <button class="btn btn-primary" onclick="location.reload()">Retry</button>
        </div>
      `;
      this._updateLoadMore(false);
      return;
    }

    // Apply type filter
    const typeFilter = document.getElementById('wm-type-filter')?.value || '';
    const filtered = typeFilter
      ? items.filter(m => m.activity?.type === typeFilter)
      : items;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
            </svg>
          </div>
          <h2 class="empty-state-title">${items.length === 0 ? 'No webmentions yet' : 'No matches found'}</h2>
          <p class="empty-state-description">
            ${items.length === 0 ? 'Webmentions will appear here when others interact with your site.' : 'Try selecting a different type filter.'}
          </p>
        </div>
      `;
      this._updateLoadMore(false);
      return;
    }

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: var(--spacing-sm);">
        ${filtered.map(mention => this._renderMentionCard(mention)).join('')}
      </div>
    `;

    this._updateLoadMore(this._hasMore);
  },

  _updateLoadMore(show) {
    const loadMore = document.getElementById('wm-load-more');
    if (loadMore) {
      loadMore.style.display = show ? 'block' : 'none';
    }
  },

  _renderMentionCard(mention) {
    const author = mention.data?.author || {};
    const activityType = mention.activity?.type || 'link';
    const date = mention.verified_date || mention.data?.published;

    return `
      <div class="card" style="padding: var(--spacing-md);">
        <div style="display: flex; gap: var(--spacing-md); align-items: flex-start;">
          ${author.photo ? `
            <img
              src="${this._escapeHtml(author.photo)}"
              alt="${this._escapeHtml(author.name || 'Author')}"
              style="width: 40px; height: 40px; border-radius: var(--border-radius-full); object-fit: cover; flex-shrink: 0;"
              loading="lazy"
            />
          ` : `
            <div style="width: 40px; height: 40px; border-radius: var(--border-radius-full); background: var(--color-bg-tertiary); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--color-text-muted);">
              ${this._getActivityIcon(activityType)}
            </div>
          `}

          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; gap: var(--spacing-sm); flex-wrap: wrap; margin-bottom: var(--spacing-xs);">
              ${author.name ? `
                <a href="${this._escapeHtml(author.url || '#')}"
                   target="_blank" rel="noopener"
                   style="font-weight: var(--font-weight-semibold); color: var(--color-text); text-decoration: none;">
                  ${this._escapeHtml(author.name)}
                </a>
              ` : '<span style="color: var(--color-text-muted);">Anonymous</span>'}

              <span style="
                font-size: var(--font-size-xs);
                padding: 2px var(--spacing-sm);
                border-radius: var(--border-radius-full);
                background: var(--color-bg-tertiary);
                color: var(--color-text-secondary);
                display: inline-flex;
                align-items: center;
                gap: 4px;
              ">
                ${this._getActivityIcon(activityType, 12)} ${this._getActivityLabel(activityType)}
              </span>

              ${date ? `
                <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
                  ${formatRelativeTime(date)}
                </span>
              ` : ''}
            </div>

            ${mention.data?.content ? `
              <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm); margin-bottom: var(--spacing-xs); overflow-wrap: break-word;">
                ${this._escapeHtml(this._truncateText(mention.data.content, 280))}
              </p>
            ` : ''}

            <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
              on <a href="${this._escapeHtml(mention.target)}" target="_blank" rel="noopener"
                    style="color: var(--color-primary);">
                ${this._escapeHtml(this._shortenUrl(mention.target))}
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  _getActivityIcon(type, size = 16) {
    const icons = {
      like: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`,
      reply: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>`,
      repost: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>`,
      link: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>`,
    };
    return icons[type] || icons.link;
  },

  _getActivityLabel(type) {
    const labels = { like: 'Liked', reply: 'Replied', repost: 'Reposted', link: 'Linked' };
    return labels[type] || 'Linked';
  },

  _truncateText(text, maxLength) {
    if (!text) return '';
    // Strip HTML tags for plain text display
    const stripped = text.replace(/<[^>]*>/g, '');
    if (stripped.length <= maxLength) return stripped;
    return stripped.substring(0, maxLength) + '...';
  },

  _shortenUrl(url) {
    if (!url) return '';
    try {
      const u = new URL(url);
      return u.hostname + u.pathname;
    } catch {
      return url;
    }
  },

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
};
