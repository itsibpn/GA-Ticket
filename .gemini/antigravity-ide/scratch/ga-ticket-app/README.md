# GA Ticket — Sistem Manajemen Tiket General Affairs (GA)

Aplikasi GA Ticket adalah solusi *production-ready* yang dibangun menggunakan arsitektur full-stack:
* **Frontend**: React (Vite) + CSS Premium (Glassmorphism & Micro-animations) + Tabler Icons.
* **Backend**: Express.js (Node.js) + Secure Middleware + REST API.
* **Database**: PostgreSQL (Cloud Supabase) dengan model dinamik `JSONB` & Log Komentar Chat.

---

## 📂 Struktur Proyek
```text
ga-ticket-app/
├── backend/            # Express.js server & PostgreSQL Adapter (db.js)
├── frontend/           # React SPA (Vite)
├── pm2.json            # Konfigurasi Daemon Process PM2 (Ubuntu)
├── nginx.conf          # Template Server Block Nginx (Ubuntu)
├── deploy.sh           # Bash Script deploy otomatis satu-klik (Ubuntu)
├── .gitignore          # Proteksi kredensial rahasia (.env, db.json)
└── README.md           # Panduan ini
```

---

## 1. ⚡ Inisialisasi Database Supabase

1. Buat akun gratis di [Supabase](https://supabase.com) dan buat proyek baru.
2. Masuk ke menu **SQL Editor** pada dasbor Supabase Anda.
3. Salin dan tempel seluruh isi berkas [backend/schema.sql](file:///C:/Users/LENOVO/.gemini/antigravity-ide/scratch/ga-ticket-app/backend/schema.sql) ke editor SQL Supabase, lalu klik **Run** (Kueri akan membuat tabel users, sessions, assets, tickets, approvals, slots, beserta default seed data).
4. Masuk ke **Project Settings -> Database**, lalu salin string koneksi **URI (Connection String)** di bawah kolom Connection string (contoh: `postgresql://postgres:[password]@db.[supabase-ref].supabase.co:5432/postgres`).

---

## 2. 💻 Jalankan Secara Lokal (Local Development)

### Konfigurasi Backend:
1. Masuk ke folder `backend/` dan ubah berkas `.env` Anda:
   ```env
   PORT=5000
   DATABASE_URL=postgresql://postgres:[PASSWORD_SUPABASE_ANDA]@db.[REFERENSI_PROJECT].supabase.co:5432/postgres
   ```
2. Jalankan perintah instalasi dan mulai server:
   ```bash
   cd backend
   npm install
   node server.js
   ```
   *(Backend akan mendeteksi string koneksi Supabase Anda secara otomatis menggunakan enkripsi SSL aman).*

### Konfigurasi Frontend:
1. Jalankan server lokal Vite:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
2. Buka browser pada [http://localhost:5173/](http://localhost:5173/) dan uji login dengan akun demo!

---

## 3. 🚀 Push Kode ke GitHub

Untuk mendistribusikan kode Anda agar siap dideploy di Ubuntu Server:
```bash
# Inisialisasi Git di root folder proyek (ga-ticket-app/)
git init

# Tambahkan berkas dan commit
git add .
git commit -m "feat: GA Ticket Production Ready with Supabase and Login Security"

# Hubungkan ke repositori GitHub baru Anda
git remote add origin https://github.com/USERNAME_ANDA/REPOS_ANDA.git
git branch -M main
git push -u origin main
```
*(Tenang, file `.env` dan data lokal dilindungi oleh berkas `.gitignore` sehingga tidak akan terunggah ke publik).*

---

## 4. 🌐 Panduan Deployment di Server Ubuntu

Ikuti langkah instalasi ringkas ini langsung di terminal Ubuntu Anda:

### Langkah A: Install Node.js, PM2, & Nginx
```bash
# Update Ubuntu
sudo apt update && sudo apt upgrade -y

# Install Node.js v18/v20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Process Manager PM2 secara global
sudo npm install -g pm2

# Install Web Server Nginx
sudo apt install nginx -y
```

### Langkah B: Kloning Repositori & Konfigurasi folder `/var/www/`
```bash
# Buat direktori aplikasi dan atur izin akses
sudo mkdir -p /var/www/ga-ticket-app
sudo chown -R $USER:$USER /var/www/ga-ticket-app

# Kloning repositori GitHub Anda
git clone https://github.com/USERNAME_ANDA/REPOS_ANDA.git /var/www/ga-ticket-app
```

### Langkah C: Setup Environment Produksi (.env)
Buat berkas `.env` secara manual di folder `/var/www/ga-ticket-app/backend/.env`:
```bash
nano /var/www/ga-ticket-app/backend/.env
```
Masukkan variabel produksi:
```env
PORT=5000
DATABASE_URL=postgresql://postgres:[PASSWORD_SUPABASE_ANDA]@db.[REFERENSI_PROJECT].supabase.co:5432/postgres
```
*(Gunakan `Ctrl+O` lalu `Enter` untuk menyimpan, dan `Ctrl+X` untuk keluar).*

### Langkah D: Konfigurasi Nginx Server Block
1. Buat berkas konfigurasinya:
   ```bash
   sudo nano /etc/nginx/sites-available/ga-ticket-app
   ```
2. Salin seluruh teks dari berkas [nginx.conf](file:///C:/Users/LENOVO/.gemini/antigravity-ide/scratch/ga-ticket-app/nginx.conf) di proyek lokal Anda dan tempel di editor Ubuntu. Sesuaikan `server_name` dengan domain/IP Anda.
3. Aktifkan konfigurasi dan hapus konfigurasi Nginx default:
   ```bash
   sudo ln -s /etc/nginx/sites-available/ga-ticket-app /etc/nginx/sites-enabled/
   sudo rm /etc/nginx/sites-enabled/default
   
   # Uji konfigurasi Nginx
   sudo nginx -t
   
   # Restart Nginx
   sudo systemctl restart nginx
   ```

### Langkah E: Jalankan Bash Deploy Otomatis
Jalankan script deploy untuk menyelesaikan instalasi package, build frontend, dan menyalakan daemon PM2:
```bash
cd /var/www/ga-ticket-app
chmod +x deploy.sh
./deploy.sh
```
*(PM2 akan membaca berkas `pm2.json` secara otomatis, membagi beban ke core CPU Ubuntu Anda, dan menyalakan layanan backend Express di port 5000).*

### Langkah F: Setup SSL (Certbot Let's Encrypt - Opsional)
Untuk mengaktifkan protokol keamanan HTTPS secara gratis pada domain Anda:
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d domainanda.com -d www.domainanda.com
```

Selamat! Aplikasi GA Ticket Anda kini berjalan secara **tangguh, aman, cepat, dan otomatis** di server Ubuntu produksi Anda!
