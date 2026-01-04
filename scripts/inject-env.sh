#!/bin/sh
set -e

# Inject environment variables into the built index.html
# This runs at container startup

INDEX_FILE="/usr/share/nginx/html/index.html"

if [ -f "$INDEX_FILE" ]; then
    # Replace the placeholder values with actual environment variables
    # Use a temporary file to avoid issues with envsubst
    envsubst '${API_BASE_URL} ${APP_NAME}' < "$INDEX_FILE" > "${INDEX_FILE}.tmp"
    mv "${INDEX_FILE}.tmp" "$INDEX_FILE"
    echo "Environment variables injected into index.html"
else
    echo "Warning: index.html not found at $INDEX_FILE"
fi
