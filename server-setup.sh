#!/bin/bash

# Ubuntu Server Setup Script

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

# Install MySQL
echo "📥 Installing MySQL..."
sudo apt install -y mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql

# Setup MySQL database
echo "🗃️ Setting up MySQL database..."
sudo mysql -e "CREATE DATABASE IF NOT EXISTS pos;"
sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'Ccera-2017';"
sudo mysql -e "FLUSH PRIVILEGES;"

# Create application directory
echo "📁 Creating application directories..."
sudo mkdir -p /var/www/api
sudo mkdir -p /var/backups/api
sudo mkdir -p /var/www/api/logs

# Set permissions
echo "🔐 Setting permissions..."
sudo chown -R $USER:www-data /var/www/api
sudo chmod -R 755 /var/www/api
sudo chmod -R 775 /var/www/api/logs

# Setup Nginx
echo "🔧 Configuring Nginx..."
sudo tee /etc/nginx/sites-available/api > /dev/null <<EOF
server {
    listen 80;
    server_name api.zonse247.com;

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
        alias /var/www/api/dist/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/api /etc/nginx/sites-enabled/
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

echo "✓ Server setup completed!"
echo "📝 Next steps:"
echo "   1. Setup SSL with Certbot: sudo certbot --nginx -d api.zonse247.com"
echo "   3. Deploy your application using deploy.sh"
echo "   4. Configure /var/www/api/.env with DATABASE_URL=mysql://root:Ccera-2017@localhost:3306/pos"