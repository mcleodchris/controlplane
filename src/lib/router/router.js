/**
 * Simple Client-Side Router
 */

import { html, render } from '../html/html.js';

class Router {
  constructor() {
    this._routes = new Map();
    this._beforeHooks = [];
    this._afterHooks = new Set();
    this._currentPath = null;
    this._currentComponent = null;
    this._container = null;
  }

  /**
   * Register a route
   */
  on(path, component) {
    this._routes.set(path, component);
    return this;
  }

  /**
   * Add a before navigation hook
   */
  beforeEach(hook) {
    this._beforeHooks.push(hook);
    return this;
  }

  /** Subscribe to completed navigation; returns an unsubscribe function. */
  afterEach(hook) {
    this._afterHooks.add(hook);
    return () => this._afterHooks.delete(hook);
  }

  /**
   * Navigate to a path
   */
  navigate(path, replace = false) {
    // Run before hooks
    let targetPath = path;
    for (const hook of this._beforeHooks) {
      const result = hook(targetPath);
      if (result !== targetPath) {
        targetPath = result;
      }
    }

    // Don't navigate if we're already there
    if (targetPath === this._currentPath) {
      // A selection of the current page still completes navigation (e.g. to close a menu).
      this._notifyAfterHooks(targetPath);
      return;
    }

    // Update browser history
    if (replace) {
      window.history.replaceState({}, '', targetPath);
    } else {
      window.history.pushState({}, '', targetPath);
    }

    this._render(targetPath);
  }

  /**
   * Start the router
   */
  start() {
    // Handle popstate (back/forward buttons)
    window.addEventListener('popstate', () => {
      this._render(window.location.pathname);
    });

    // Handle link clicks
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[data-link]');
      if (link) {
        e.preventDefault();
        this.navigate(link.getAttribute('href'));
      }
    });

    // Initial render
    this._render(window.location.pathname);
  }

  /**
   * Get the container element
   */
  _getContainer() {
    if (!this._container) {
      this._container = document.getElementById('page-content');
    }
    return this._container;
  }

  /**
   * Render a route
   */
  _render(path) {
    // Run before hooks
    let targetPath = path;
    for (const hook of this._beforeHooks) {
      const result = hook(targetPath);
      if (result !== targetPath) {
        targetPath = result;
        window.history.replaceState({}, '', targetPath);
      }
    }

    this._currentPath = targetPath;

    const container = this._getContainer();
    if (!container) {
      console.error('Router: Container #page-content not found');
      return;
    }

    // Find matching route
    const Component = this._routes.get(targetPath);

    // Let the previous page clean up before it is replaced
    this._currentComponent?.destroy?.();
    this._currentComponent = Component || null;

    if (Component) {
      // Clear container
      render(container, html``);

      // Render component
      if (typeof Component.render === 'function') {
        Component.render(container);
      } else if (typeof Component === 'function') {
        const content = Component();
        if (content instanceof HTMLElement) {
          container.appendChild(content);
        } else if (content) {
          render(container, content);
        }
      }
    } else {
      // 404 - Not found
      render(container, html`
        <div class="empty-state">
          <div class="empty-state-icon">404</div>
          <h2 class="empty-state-title">Page Not Found</h2>
          <p class="empty-state-description">The page you're looking for doesn't exist.</p>
          <a href="/" data-link class="btn btn-primary">Go Home</a>
        </div>
      `);
    }

    this._notifyAfterHooks(targetPath);
  }

  _notifyAfterHooks(path) {
    this._afterHooks.forEach(hook => hook(path));
  }

  /**
   * Get current path
   */
  getCurrentPath() {
    return this._currentPath;
  }

  /**
   * Reset container reference (needed after layout changes)
   */
  resetContainer() {
    this._container = null;
  }
}

// Export singleton instance
export const router = new Router();
