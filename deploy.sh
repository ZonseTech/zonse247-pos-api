#!/bin/bash

# Deployment script to main server

set -e

echo "🚀 Starting deployment..."

# Environment variables
APP_NAME="api"
APP_DIR="/var/www/api"
BACKUP_DIR="/var/backups/api"
NODE_ENV=${1:-production}

echo "📦 Deploying $APP_NAME to $APP_DIR"

# Store the current directory
CURRENT_DIR=$(pwd)

# Create directories if they don't exist
sudo mkdir -p $APP_DIR
sudo mkdir -p $BACKUP_DIR
sudo mkdir -p $APP_DIR/logs

# Backup current deployment (including .env)
if [ -d "$APP_DIR/dist" ]; then
    echo "📂 Creating backup..."
    sudo tar -czf $BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).tar.gz -C $APP_DIR .
fi

# Only copy files if we're NOT already in the target directory
if [ "$CURRENT_DIR" != "$APP_DIR" ]; then
    echo "📤 Copying new files..."
    
    # Copy all files except .env
    sudo cp -r $CURRENT_DIR/* $APP_DIR/
    
    # Copy hidden files except .env (we'll handle it separately)
    shopt -s dotglob
    for file in $CURRENT_DIR/.*; do
        if [ "$file" != "$CURRENT_DIR/." ] && [ "$file" != "$CURRENT_DIR/.." ] && [ "$file" != "$CURRENT_DIR/.env" ]; then
            sudo cp -r "$file" $APP_DIR/
        fi
    done
    shopt -u dotglob
else
    echo "📝 Already in target directory, skipping copy..."
fi

# Handle .env file - ALWAYS recreate from .env.example
echo "🔧 Handling environment configuration..."
if [ -f "$APP_DIR/.env" ]; then
    echo "🗑️ Removing existing .env file..."
    sudo rm -f $APP_DIR/.env
fi

if [ -f "$CURRENT_DIR/.env.example" ]; then
    echo "📄 Creating fresh .env from example file..."
    sudo cp $CURRENT_DIR/.env.example $APP_DIR/.env
    echo "⚠️  Please configure $APP_DIR/.env file with proper values"
else
    echo "❌ No .env.example file found"
    echo "📝 Creating empty .env file..."
    sudo touch $APP_DIR/.env
    echo "⚠️  Please configure $APP_DIR/.env file with proper values"
fi

# Set proper permissions for .env
sudo chmod 600 $APP_DIR/.env  # Only owner can read/write

# Navigate to app directory
cd $APP_DIR

# Set permissions
echo "🔐 Setting permissions..."
sudo chown -R $USER:www-data $APP_DIR
sudo chmod -R 755 $APP_DIR
sudo chmod -R 775 $APP_DIR/logs
sudo chmod 600 $APP_DIR/.env  # Ensure .env is protected

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build the application
echo "🔨 Building application..."
npm run build:mysql

# Run database migrations
echo "🗃️ Running database migrations..."
chmod +x ./scripts/db.sh
./scripts/db.sh generate mysql
./scripts/db.sh deploy mysql

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

# Setup PM2 startup script
echo "🔧 Setting up PM2 startup..."
sudo pm2 startup ubuntu -u $USER --hp /home/$USER --silent || echo "PM2 startup already configured"

echo "✓ Deployment completed successfully!"
echo "📊 Check application status with: pm2 status"
echo "📋 Check logs with: pm2 logs $APP_NAME"
echo "⚠️  IMPORTANT: Don't forget to configure your .env file at $APP_DIR/.env"