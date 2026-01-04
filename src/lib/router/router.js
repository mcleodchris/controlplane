/**
 * Simple Client-Side Router
 */

class Router {
  constructor() {
    this._routes = new Map();
    this._beforeHooks = [];
    this._currentPath = null;
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

    if (Component) {
      // Clear container
      container.innerHTML = '';

      // Render component
      if (typeof Component.render === 'function') {
        Component.render(container);
      } else if (typeof Component === 'function') {
        const content = Component();
        if (typeof content === 'string') {
          container.innerHTML = content;
        } else if (content instanceof HTMLElement) {
          container.appendChild(content);
        }
      }
    } else {
      // 404 - Not found
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">404</div>
          <h2 class="empty-state-title">Page Not Found</h2>
          <p class="empty-state-description">The page you're looking for doesn't exist.</p>
          <a href="/" data-link class="btn btn-primary">Go Home</a>
        </div>
      `;
    }
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
