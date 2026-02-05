# Stage 1: Build
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production
FROM nginx:1.27-alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template

# Copy environment injection script
COPY scripts/inject-env.sh /docker-entrypoint.d/40-inject-env.sh
RUN chmod +x /docker-entrypoint.d/40-inject-env.sh

# Environment variables with defaults
ENV API_BASE_URL=http://localhost:3000
ENV APP_NAME=Controlplane
ENV WEBMENTION_TOKEN=

EXPOSE 80

# nginx image uses its own entrypoint that processes templates
CMD ["nginx", "-g", "daemon off;"]
