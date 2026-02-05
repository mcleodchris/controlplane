/**
 * Controlplane - Main Application Entry Point
 */

import './assets/styles/main.css';
import { store } from './lib/state/store.js';
import { router } from './lib/router/router.js';
import { auth } from './lib/utils/auth.js';

// Handle environment variables for development
if (window.ENV?.API_BASE_URL?.startsWith('$')) {
  window.ENV = {
    API_BASE_URL: import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3000',
    APP_NAME: import.meta.env?.VITE_APP_NAME || 'Controlplane',
    WEBMENTION_TOKEN: import.meta.env?.VITE_WEBMENTION_TOKEN || '',
  };
}

// Import pages
import { LoginPage } from './pages/LoginPage.js';
import { HomePage } from './pages/HomePage.js';
import { HobbyPage } from './pages/HobbyPage.js';
import { PhotosPage } from './pages/PhotosPage.js';
import { NotesPage } from './pages/NotesPage.js';
import { WebmentionsPage } from './pages/WebmentionsPage.js';

// Import layout components
import { AppHeader } from './components/common/AppHeader.js';
import { AppNav } from './components/common/AppNav.js';
import { Toast } from './components/common/Toast.js';

/**
 * Initialize the application
 */
async function init() {
  const app = document.getElementById('app');

  // Check if user is authenticated
  const isAuthenticated = await auth.checkAuth();
  store.setState({ auth: { isAuthenticated, token: auth.getToken() } });

  // Set up routes
  router.on('/', HomePage);
  router.on('/login', LoginPage);
  router.on('/hobbies', HobbyPage);
  router.on('/photos', PhotosPage);
  router.on('/notes', NotesPage);
  router.on('/webmentions', WebmentionsPage);

  // Protected route middleware
  router.beforeEach((path) => {
    const publicRoutes = ['/login'];
    const { isAuthenticated } = store.getState().auth;

    if (!isAuthenticated && !publicRoutes.includes(path)) {
      return '/login';
    }

    if (isAuthenticated && path === '/login') {
      return '/';
    }

    return path;
  });

  // Subscribe to auth changes to re-render layout
  store.subscribe('auth', () => {
    render(app);
    router.resetContainer(); // Clear cached container reference after layout change
    router.navigate(store.getState().auth.isAuthenticated ? '/' : '/login');
  });

  // Render the app layout
  render(app);

  // Start the router
  router.start();
}

/**
 * Render the main application layout
 */
function render(container) {
  const { isAuthenticated } = store.getState().auth;

  if (!isAuthenticated) {
    // Just render the page content for login
    container.innerHTML = '<main id="page-content" class="app-content"></main>';
  } else {
    container.innerHTML = `
      <header class="app-header" id="app-header"></header>
      <div class="app-main">
        <nav class="app-sidebar" id="app-nav"></nav>
        <main id="page-content" class="app-content"></main>
      </div>
      <div id="toast-container"></div>
    `;

    // Render header and nav
    const header = document.getElementById('app-header');
    const nav = document.getElementById('app-nav');

    AppHeader.render(header);
    AppNav.render(nav);
  }
}

// Start the application
init().catch(console.error);
