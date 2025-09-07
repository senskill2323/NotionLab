#!/bin/bash

# Build and deploy script for NotionLab
echo "Building NotionLab..."

# Clean previous build
rm -rf dist

# Build the project
npm run build

# Verify build completed successfully
if [ ! -f "dist/index.html" ]; then
    echo "❌ Build failed - index.html not found"
    exit 1
fi

echo "✅ Build completed successfully"

# Show current asset hashes for verification
echo "📦 Current asset files:"
ls -la dist/assets/

# Optional: Deploy to server (uncomment and configure as needed)
# rsync -avz --delete dist/ user@server:/path/to/webroot/
# echo "🚀 Deployed to server"

echo "🎉 Ready for deployment!"
echo "Make sure to upload the entire dist/ folder to your server"
