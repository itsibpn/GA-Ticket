#!/bin/bash

# deploy.sh - Automated Deployment Script for GA Ticket App on Ubuntu Server
# Usage: ./deploy.sh

# Exit immediately if a command exits with a non-zero status
set -e

echo "==========================================="
echo "   GA Ticket App - Automated Deploy Bash   "
echo "==========================================="

PROJECT_DIR="/var/www/ga-ticket-app"

# Ensure we are in the correct directory
cd "$PROJECT_DIR"

echo "1. Mengambil kode terbaru dari GitHub..."
git pull origin main

echo "2. Konfigurasi Backend..."
cd backend
npm install --production

# Create logs directory if it doesn't exist
mkdir -p ../logs

echo "3. Konfigurasi Frontend..."
cd ../frontend
npm install
npm run build

echo "4. Memperbarui Proses PM2 Daemon..."
cd ..
# Check if PM2 process is running, restart if yes, start if no
if pm2 show ga-ticket-backend > /dev/null 2>&1; then
    echo "PM2 process exists. Reloading..."
    pm2 reload pm2.json
else
    echo "Starting PM2 process..."
    pm2 start pm2.json
fi

# Save PM2 process list to restore on server reboot
pm2 save

echo "5. Reload Nginx Server Block..."
sudo systemctl reload nginx

echo "==========================================="
echo "       DEPLOYMENT BERHASIL & AKTIF!        "
echo "==========================================="
