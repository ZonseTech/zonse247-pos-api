#!/bin/bash

# Digital Ocean Server Setup Script

set -e

echo "🛠️ Starting server setup..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
echo "📥 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
echo "📥 Installing PM2..."
sudo npm install -g pm2

# Install Nginx
echo "📥 Installing Nginx..."
sudo apt install -y nginx

# Create application directory
echo "📁 Creating application directories..."
sudo mkdir -p /var/www/zonse247-pos-api
sudo mkdir -p /var/backups/zonse247-pos-api
sudo mkdir -p /var/www/zonse247-pos-api/logs

# Set permissions
echo "🔐 Setting permissions..."
sudo chown -R $USER:www-data /var/www/zonse247-pos-api
sudo chmod -R 755 /var/www/zonse247-pos-api
sudo chmod -R 775 /var/www/zonse247-pos-api/logs

# Setup Nginx
echo "🔧 Configuring Nginx..."
sudo tee /etc/nginx/sites-available/zonse247-pos-api > /dev/null <<EOF
server {
    listen 80;
    server_name your-domain.com; # Replace with your domain

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # Static files (if needed)
    location /static/ {
        alias /var/www/zonse247-pos-api/dist/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/zonse247-pos-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Setup firewall
echo "🔥 Configuring firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Install and setup Fail2Ban
echo "🛡️ Installing Fail2Ban..."
sudo apt install -y fail2ban

echo "✅ Server setup completed!"
echo "📝 Next steps:"
echo "   1. Update /etc/nginx/sites-available/zonse247-pos-api with your domain"
echo "   2. Setup SSL with Certbot: sudo certbot --nginx"
echo "   3. Deploy your application using deploy.sh"