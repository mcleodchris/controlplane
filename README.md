# Controlplane

A modern, single-page web application for managing content through the Mage API. Built with vanilla JavaScript, Web Components patterns, and Vite.

## Features

- **Hobby Tracking** - Full CRUD for hobby/miniature painting projects
- **Photo Management** - Upload photos, browse gallery, create photo posts with AI-generated descriptions
- **Note Publishing** - Quick note creation via Micropub
- **Responsive Design** - Mobile-first, works on desktop and iOS/iPadOS Safari
- **Dark/Light Mode** - Automatic based on system preference

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), no framework
- **Build Tool**: Vite 7.x
- **Styling**: CSS Custom Properties, CSS Grid/Flexbox
- **State**: Custom reactive store using Proxy API
- **Routing**: Custom client-side router
- **Production**: nginx:alpine in Docker

## Quick Start

### Prerequisites

- Node.js 20+
- npm 9+
- Access to a Mage API instance

### Development

```bash
# Clone the repository
git clone <repo-url>
cd controlplane

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your API URL
# VITE_API_BASE_URL=http://localhost:3000

# Start development server
npm run dev
```

The dev server runs at `http://localhost:5173` with hot module replacement.

### Production Build

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

Output is in the `dist/` directory.

## Docker Deployment

### Build Image

```bash
docker build -t controlplane:latest .
```

### Run Container

```bash
docker run -d \
  --name controlplane \
  -p 8080:80 \
  -e API_BASE_URL=https://api.example.com \
  -e APP_NAME="My Controlplane" \
  controlplane:latest
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `API_BASE_URL` | Yes | `http://localhost:3000` | Mage API base URL |
| `APP_NAME` | No | `Controlplane` | Display name in header |

### Docker Compose Example

```yaml
services:
  controlplane:
    build: .
    ports:
      - "8080:80"
    environment:
      - API_BASE_URL=http://mage-api:3000
      - APP_NAME=Mage Controlplane
    depends_on:
      - mage-api
```

## Project Structure

```
controlplane/
├── src/
│   ├── assets/styles/      # CSS files
│   ├── components/         # Reusable UI components
│   │   ├── common/         # Shared components (Toast, Header, Nav)
│   │   ├── hobby/          # Hobby-specific components
│   │   ├── photos/         # Photo-specific components
│   │   └── notes/          # Note-specific components
│   ├── lib/
│   │   ├── api/            # API client modules
│   │   ├── state/          # State management
│   │   ├── router/         # Client-side routing
│   │   └── utils/          # Utility functions
│   ├── pages/              # Page components
│   ├── index.html          # Entry HTML
│   └── main.js             # Application bootstrap
├── public/                 # Static assets
├── nginx/                  # nginx configuration
├── scripts/                # Build/deploy scripts
├── Dockerfile
└── vite.config.js
```

## Authentication

The app uses Bearer token authentication. On first visit:

1. User is redirected to login page
2. Enter the API token (supports password managers)
3. Token is validated against `GET /authcheck`
4. On success, token is stored in sessionStorage (or localStorage with "Remember me")

## API Endpoints Used

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/authcheck` | GET | Validate auth token |
| `/hobby` | GET, POST | List/create hobbies |
| `/hobby/:id` | PUT, DELETE | Update/delete hobby |
| `/images/list` | GET | List all images |
| `/images/image/:index` | GET | Get image details |
| `/micropub/media` | POST | Upload image |
| `/micropub` | POST | Create post (note/photo) |
| `/openai/generate-alt-text` | POST | Generate image description |

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari 15+ (macOS, iOS, iPadOS)

## Development Notes

### Adding a New Page

1. Create page component in `src/pages/NewPage.js`
2. Add route in `src/main.js`
3. Add nav item in `src/components/common/AppNav.js`

### Adding a New API Endpoint

1. Create module in `src/lib/api/newFeature.js`
2. Use `apiClient` from `./client.js` for requests
3. Import and use in page components

### CSS Architecture

- `reset.css` - Browser normalization
- `variables.css` - CSS custom properties (colors, spacing, etc.)
- `components.css` - Reusable component styles (.btn, .card, .form-*)
- `main.css` - Layout and page styles

## License

ISC
