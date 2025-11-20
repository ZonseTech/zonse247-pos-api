#!/bin/bash

# Deployment script to main server

set -e

echo "🚀 Starting deployment..."

# Environment variables
APP_NAME="api"  # ← Change to match ecosystem.config.js
APP_DIR="/var/www/$APP_NAME"
BACKUP_DIR="/var/backups/$APP_NAME"
NODE_ENV=${1:-production}

echo "📦 Deploying $APP_NAME to $APP_DIR"

# Store the current directory (where the script is running from)
CURRENT_DIR=$(pwd)

# Create directories if they don't exist
sudo mkdir -p $APP_DIR
sudo mkdir -p $BACKUP_DIR
sudo mkdir -p $APP_DIR/logs

# Backup current deployment
if [ -d "$APP_DIR/dist" ]; then
    echo "📂 Creating backup..."
    sudo tar -czf $BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).tar.gz -C $APP_DIR .
fi

# Only copy files if we're NOT already in the target directory
if [ "$CURRENT_DIR" != "$APP_DIR" ]; then
    echo "📤 Copying new files..."
    sudo cp -r $CURRENT_DIR/* $APP_DIR/
    sudo cp -r $CURRENT_DIR/.* $APP_DIR/ 2>/dev/null || true
else
    echo "📝 Already in target directory, skipping copy..."
fi

# Navigate to app directory
cd $APP_DIR

# Set permissions
echo "🔐 Setting permissions..."
sudo chown -R $USER:www-data $APP_DIR
sudo chmod -R 755 $APP_DIR
sudo chmod -R 775 $APP_DIR/logs

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Build the application
echo "🔨 Building application..."
npm run build

# Run database migrations (if any)
echo "🗃️ Running database migrations..."
# npm run migrate

# Restart application with PM2
echo "🔄 Restarting application..."
if pm2 show $APP_NAME > /dev/null; then
    echo "🔄 Reloading existing application..."
    pm2 reload ecosystem.config.js --env $NODE_ENV 
else
    echo "⭐ Starting new application..."
    pm2 start ecosystem.config.js --env $NODE_ENV
fi

# Save PM2 configuration
pm2 save

# Setup PM2 startup script (only needed once)
echo "🔧 Setting up PM2 startup..."
sudo pm2 startup ubuntu -u $USER --hp /home/$USER --silent || echo "PM2 startup already configured"

echo "✅ Deployment completed successfully!"
echo "📊 Check application status with: pm2 status"
echo "📋 Check logs with: pm2 logs $APP_NAME"