/**
 * Home Page / Dashboard Component
 */

import { LoadingSpinner } from '../components/common/LoadingSpinner.js';
import { router } from '../lib/router/router.js';

export const HomePage = {
  /**
   * Render the home page
   */
  render(container) {
    container.innerHTML = `
      <div class="animate-fade-in">
        <h1 class="page-title">Dashboard</h1>

        <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--spacing-lg);">
          <!-- Quick Actions -->
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Quick Actions</h2>
            </div>
            <div style="display: flex; flex-direction: column; gap: var(--spacing-sm);">
              <a href="/hobbies" data-link class="btn btn-secondary" style="justify-content: flex-start;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                Add Hobby Entry
              </a>
              <a href="/photos" data-link class="btn btn-secondary" style="justify-content: flex-start;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Upload Photo
              </a>
              <a href="/notes" data-link class="btn btn-secondary" style="justify-content: flex-start;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Write Note
              </a>
            </div>
          </div>

          <!-- Hobbies Summary -->
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Hobbies</h2>
              <a href="/hobbies" data-link class="btn btn-ghost btn-sm">View All</a>
            </div>
            <div id="hobbies-summary" class="card-body">
              <p style="color: var(--color-text-muted);">
                Track your hobby progress and completed projects.
              </p>
            </div>
          </div>

          <!-- Photos Summary -->
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Photos</h2>
              <a href="/photos" data-link class="btn btn-ghost btn-sm">View All</a>
            </div>
            <div id="photos-summary" class="card-body">
              <p style="color: var(--color-text-muted);">
                Upload and manage your photo library.
              </p>
            </div>
          </div>

          <!-- Notes Summary -->
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Notes</h2>
              <a href="/notes" data-link class="btn btn-ghost btn-sm">Write</a>
            </div>
            <div id="notes-summary" class="card-body">
              <p style="color: var(--color-text-muted);">
                Publish quick notes and updates.
              </p>
            </div>
          </div>
        </div>
      </div>
    `;
  },
};
