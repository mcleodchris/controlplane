# Claude Code Context - Controlplane

This file contains context for Claude Code when working on this project.

## Project Overview

Controlplane is a single-page web application GUI for the Mage API. It manages a hobby log (miniature painting tracking), photos, and notes.

**Key Design Decisions:**
- Vanilla JS + Web Components patterns (no React/Vue/etc.)
- Vite for build tooling
- Custom lightweight state management (Proxy-based)
- Custom client-side router
- Runtime environment injection in Docker (not build-time)
- Mobile-first responsive design with iOS Safari support

## Architecture

### State Management (`src/lib/state/store.js`)

Simple reactive store using JavaScript Proxy:
```javascript
store.getState()           // Get full state
store.getState('hobbies')  // Get slice
store.setState({ key: value })
store.updateSlice('hobbies', { loading: true })
store.subscribe('key', callback)  // Returns unsubscribe fn
```

State shape:
```javascript
{
  auth: { isAuthenticated, token },
  hobbies: { items, loading, error },
  images: { items, loading, error },
  ui: { activeToast, confirmDialog, mobileMenuOpen }
}
```

### Router (`src/lib/router/router.js`)

Custom SPA router:
```javascript
router.on('/path', PageComponent)
router.beforeEach((path) => newPath)  // Guards
router.navigate('/path')
router.start()
```

Pages must export `{ render(container) }` method.

### API Client (`src/lib/api/client.js`)

Singleton with auth handling:
```javascript
apiClient.get('/path')
apiClient.post('/path', body)
apiClient.put('/path', body)
apiClient.delete('/path')
apiClient.postForm('/path', formData)  // For file uploads
```

Handles 401 (clears auth), 202 (returns location), 204 (returns null).

### Authentication (`src/lib/utils/auth.js`)

Token storage:
- `auth.getToken()` - Gets from sessionStorage or localStorage
- `auth.setToken(token, remember)` - Stores token
- `auth.validateToken(token)` - Validates against `/authcheck` endpoint
- `auth.clearToken()` - Removes token

The `/authcheck` endpoint returns `{ "valid": true/false }`.

## File Locations

| Concern | Location |
|---------|----------|
| Entry point | `src/main.js` |
| HTML template | `src/index.html` |
| CSS variables | `src/assets/styles/variables.css` |
| Component styles | `src/assets/styles/components.css` |
| API modules | `src/lib/api/*.js` |
| Page components | `src/pages/*.js` |
| Common UI | `src/components/common/*.js` |
| Docker config | `Dockerfile`, `nginx/` |

## Component Patterns

### Page Components
```javascript
export const SomePage = {
  render(container) {
    container.innerHTML = `...`;
    this._setupEventListeners(container);
  },
  _setupEventListeners(container) { ... },
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};
```

### Toast Notifications
```javascript
import { Toast } from '../components/common/Toast.js';
Toast.success('Message');
Toast.error('Message');
Toast.info('Message');
```

### Confirm Dialogs
```javascript
import { ConfirmDialog } from '../components/common/ConfirmDialog.js';
const confirmed = await ConfirmDialog.show({
  title: 'Delete?',
  message: 'Are you sure?',
  confirmText: 'Delete',
  dangerous: true
});
```

## API Endpoints (Mage API)

### Hobby Log
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/authcheck` | POST | Returns `{ valid: boolean }` |
| `/hobby` | GET | List hobby log entries |
| `/hobby` | POST | Create hobby log entry `{ item, game, modelCount, completedDate }` |
| `/hobby/:id` | PUT | Update hobby log entry |
| `/hobby/:id` | DELETE | Delete hobby log entry |

### Images
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/images/list` | GET | List images with metadata |
| `/images/image/:index` | GET | Get single image details |
| `/micropub/media` | POST | Upload image (multipart/form-data) |
| `/micropub/media?q=last` | GET | Get last upload |

### Publishing
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/publish` | POST | Publish photo or blog post (see below) |
| `/openai/generate-alt-text` | POST | AI image description `{ imageUrl }` |

**Photo Post Payload** (`/publish`):
```json
{
  "type": "photo",
  "data": {
    "frontmatter": {
      "date": "<ISO date, defaults to now>",
      "tags": ["tag1", "tag2"],
      "alt": "<image description>",
      "image": "<image URL>",
      "id": "<GUID, auto-generated>"
    },
    "content": "<optional post content>"
  }
}
```

**Blog Post Payload** (`/publish`):
```json
{
  "type": "blog",
  "data": {
    "frontmatter": {
      "date": "<ISO date, defaults to now>",
      "tags": ["tag1", "tag2"],
      "title": "<blog post title>",
      "id": "<GUID, auto-generated>"
    },
    "content": "<blog post content>"
  }
}
```

## Environment Variables

**Development** (`.env`):
- `VITE_API_BASE_URL` - API URL for dev server

**Production** (Docker runtime):
- `API_BASE_URL` - Injected into index.html at container start
- `APP_NAME` - Display name (optional)

## Common Tasks

### Add a new page
1. Create `src/pages/NewPage.js` with `render(container)` method
2. Import and register in `src/main.js`: `router.on('/new', NewPage)`
3. Add nav item in `src/components/common/AppNav.js` NAV_ITEMS array

### Add a new API module
1. Create `src/lib/api/newModule.js`
2. Import `apiClient` from `./client.js`
3. Export async functions that use `apiClient.get()`, `.post()`, etc.

**Example - Publish API** (`src/lib/api/publish.js`):
```javascript
import { apiClient } from './client.js';

export const publishApi = {
  async publishPhoto(options) {
    const { image, alt, content, tags } = options;
    return apiClient.post('/publish', {
      type: 'photo',
      data: {
        frontmatter: { date: new Date().toISOString(), tags, alt, image, id: generateGuid() },
        content: content || ''
      }
    });
  }
};
```

### Add state slice
1. Add to initialState in `src/lib/state/store.js`
2. Use `store.updateSlice('sliceName', updates)` in components

### Modify styles
- Colors/spacing: `src/assets/styles/variables.css`
- Reusable components: `src/assets/styles/components.css`
- Layout/pages: `src/assets/styles/main.css`

## Photo Post Workflow

The photo post creation process uses two separate APIs:

1. **Upload Image** (`/micropub/media`):
   - User drags/drops or selects image files
   - Uploaded via `micropubApi.uploadImage()` with progress tracking
   - Returns image URL for use in post

2. **Publish Photo Post** (`/publish`):
   - User fills out form with:
     - Photo URL (from gallery or manual entry)
     - Post Content (what they want to say about the photo)
     - Image Description/Alt Text (optional, can be AI-generated)
     - Tags (comma-separated)
   - Published via `publishApi.publishPhoto()` with auto-generated GUID and ISO date
   - Returns location URL to view published post

**Key Fields:**
- `image`: Photo URL (required)
- `content`: Post content - what the user wants to say
- `alt`: Image description/alt text for accessibility
- `tags`: Array of category tags
- `date`: Auto-generated ISO timestamp
- `id`: Auto-generated GUID

## Known Issues / TODO

- [ ] Dashboard widgets don't fetch real data yet (HomePage.js)
- [ ] Photo gallery pagination/infinite scroll not implemented
- [ ] No offline support / service worker
- [ ] No keyboard shortcuts

## Testing

No automated tests yet. Manual testing checklist:
1. Login flow with valid/invalid tokens
2. Hobby log CRUD operations (create, read, update, delete entries)
3. Photo upload (drag-drop and file picker)
4. Photo post creation with post content and AI-generated description
5. Note publishing
6. Mobile responsive behavior
7. Dark/light mode switching

## Build Output

Production build creates:
- `dist/index.html` - Entry point with env placeholders
- `dist/assets/*.js` - Bundled JavaScript (~15KB gzipped)
- `dist/assets/*.css` - Bundled CSS (~3KB gzipped)
- `dist/favicon.svg` - App icon

## Reference

- Full implementation plan: `PLAN.md`
- Mage API source: `/home/chris/code/mage.chrismcleod.dev`
