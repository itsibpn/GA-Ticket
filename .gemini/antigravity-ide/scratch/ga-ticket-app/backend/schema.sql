-- GA Ticket Database Schema
-- Target: PostgreSQL 12+

-- 1. Drop existing tables if they exist (for easy re-runs)
DROP TABLE IF EXISTS approvals CASCADE;
DROP TABLE IF EXISTS slots CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS budget_caps CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. Create Users Table (Securely updated with hash/salt)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'employee', -- 'employee', 'manager', 'bm', 'admin'
    avatar_initials VARCHAR(3) NOT NULL,
    branch VARCHAR(50) NOT NULL,
    department VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL DEFAULT '',
    salt VARCHAR(100) NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Sessions Table (To track secure cryptographically strong sessions)
CREATE TABLE sessions (
    token VARCHAR(255) PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create Budget Caps Table
CREATE TABLE budget_caps (
    id SERIAL PRIMARY KEY,
    department VARCHAR(50) NOT NULL,
    branch VARCHAR(50) NOT NULL,
    allocated_budget NUMERIC(15, 2) NOT NULL DEFAULT 40000000.00,
    used_budget NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    UNIQUE(department, branch)
);

-- 5. Create Master Assets Table
CREATE TABLE assets (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    condition VARCHAR(20) NOT NULL DEFAULT 'Baik', -- 'Baik', 'Servis', 'Rusak'
    status VARCHAR(20) NOT NULL DEFAULT 'Tersedia' -- 'Tersedia', 'Dipinjam', 'Tidak Tersedia'
);

-- 6. Create Tickets Table
CREATE TABLE tickets (
    id VARCHAR(50) PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- 'hotel', 'pesawat', 'alat', 'kendaraan', 'zoom', 'meeting'
    description TEXT NOT NULL,
    budget NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- 'draft', 'pending', 'bm', 'approved', 'rejected', 'completed'
    detail JSONB NOT NULL DEFAULT '{}'::jsonb, -- dynamic fields (tgl, dari, ke, etc.)
    comments JSONB NOT NULL DEFAULT '[]'::jsonb, -- chat thread log: [{"user": "...", "role": "...", "msg": "...", "time": "..."}]
    date_created DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Create Approvals Log Table
CREATE TABLE approvals (
    id SERIAL PRIMARY KEY,
    ticket_id VARCHAR(50) REFERENCES tickets(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL, -- 'approve', 'reject', 'override_approve', 'override_reject'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Create Availability Slots Table
CREATE TABLE slots (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL, -- 'room' or 'vehicle'
    item_name VARCHAR(100) NOT NULL, -- e.g., 'Ruang Rapat A', 'Avanza B-1234-AB'
    slot_key VARCHAR(50) NOT NULL, -- e.g., 'day-1', 'Sen', 'Sel'
    is_booked BOOLEAN NOT NULL DEFAULT FALSE,
    booked_by_ticket_id VARCHAR(50) REFERENCES tickets(id) ON DELETE SET NULL,
    UNIQUE(category, item_name, slot_key)
);

-- Seed Initial Data

-- Users (Seed passwords will be dynamically hashed on first run with proper salts)
INSERT INTO users (name, email, role, avatar_initials, branch, department) VALUES
('Andi Setiawan', 'andi@gaticket.co.id', 'manager', 'AS', 'Balikpapan', 'Marketing'),
('Budi Santoso', 'budi@gaticket.co.id', 'employee', 'BS', 'Balikpapan', 'Operasional'),
('Citra Dewi', 'citra@gaticket.co.id', 'employee', 'CD', 'Balikpapan', 'HR'),
('Rian Hidayat', 'rian@gaticket.co.id', 'bm', 'RH', 'Balikpapan', 'Management'),
('Admin GA Utama', 'admin@gaticket.co.id', 'admin', 'ADM', 'Balikpapan', 'General Affairs');

-- Budget Caps
INSERT INTO budget_caps (department, branch, allocated_budget, used_budget) VALUES
('Marketing', 'Balikpapan', 40000000.00, 18500000.00),
('Operasional', 'Balikpapan', 40000000.00, 12800000.00),
('HR', 'Balikpapan', 40000000.00, 6300000.00),
('IT', 'Balikpapan', 40000000.00, 4500000.00);

-- Assets
INSERT INTO assets (code, name, category, condition, status) VALUES
('BPN-AST-0001', 'Laptop Dell XPS 15', 'Elektronik', 'Baik', 'Dipinjam'),
('BPN-AST-0002', 'Proyektor Epson EB', 'Elektronik', 'Baik', 'Tersedia'),
('BPN-AST-0003', 'Kamera Sony Alpha', 'Elektronik', 'Servis', 'Tidak Tersedia'),
('BPN-AST-0004', 'Toyota Avanza', 'Kendaraan', 'Baik', 'Tersedia');

-- Tickets
INSERT INTO tickets (id, user_id, type, description, budget, status, detail, comments, date_created) VALUES
('TKT-2024-0147', 1, 'pesawat', 'Jakarta → Balikpapan, 15 Jul', 2850000.00, 'pending', 
 '{"dari": "Jakarta (CGK)", "ke": "Balikpapan (BPN)", "tgl": "15 Jul 2025", "maskapai": "Garuda Indonesia", "budget": "Rp 2.850.000", "catatan": "Rapat koordinasi vendor supply chain 16-17 Jul"}'::jsonb,
 '[{"user": "Andi Setiawan", "role": "manager", "msg": "Tolong segera diapprove untuk booking tiket pesawat", "time": "2 Jan 09:30"}]'::jsonb,
 '2026-01-02'),
 
('TKT-2024-0146', 2, 'hotel', 'Hotel Aston Makassar, 3 mlm', 6200000.00, 'bm', 
 '{"hotel": "Aston Makassar", "checkin": "10 Jan 2025", "checkout": "13 Jan 2025", "tamu": "2 orang", "budget": "Rp 6.200.000", "catatan": "Training cabang"}'::jsonb,
 '[]'::jsonb,
 '2025-12-30'),

('TKT-2024-0141', 1, 'alat', 'Laptop Dell XPS 15 · AST-0023', 0.00, 'approved', 
 '{"aset": "BPN-AST-0023", "nama": "Laptop Dell XPS 15", "mulai": "28 Des", "kembali": "10 Jan", "tujuan": "Presentasi klien"}'::jsonb,
 '[]'::jsonb,
 '2025-12-28'),

('TKT-2024-0139', 1, 'kendaraan', 'Avanza B-1234-AB · Ke Bandara', 0.00, 'approved', 
 '{"kendaraan": "Toyota Avanza B-1234-AB", "tujuan": "Bandara Sepinggan", "mulai": "26 Des 08:00", "selesai": "26 Des 12:00", "supir": "Tidak perlu"}'::jsonb,
 '[]'::jsonb,
 '2025-12-26'),

('TKT-2024-0135', 1, 'zoom', 'Meeting All Hands · 29 Des', 0.00, 'draft', 
 '{"topik": "Meeting All Hands Q1", "tgl": "29 Des 2024", "jam": "14:00 – 15:00", "peserta": "45 orang"}'::jsonb,
 '[]'::jsonb,
 '2025-12-24'),

('TKT-2024-0131', 3, 'meeting', 'Ruang Rapat A · 20 Des 10:00', 0.00, 'rejected', 
 '{"ruang": "Ruang Rapat A", "tgl": "20 Des 2024", "jam": "10:00 – 12:00", "acara": "Review Kinerja"}'::jsonb,
 '[{"user": "Admin GA Utama", "role": "admin", "msg": "Ditolak karena ruangan sudah dibooking direksi", "time": "19 Des 14:20"}]'::jsonb,
 '2025-12-19');

-- Approvals
INSERT INTO approvals (ticket_id, user_id, action, notes) VALUES
('TKT-2024-0141', 5, 'approve', 'Approved by GA'),
('TKT-2024-0139', 5, 'approve', 'Approved by GA'),
('TKT-2024-0131', 5, 'reject', 'Ditolak karena ruangan sudah dibooking direksi');

-- Slots - Room
INSERT INTO slots (category, item_name, slot_key, is_booked, booked_by_ticket_id) VALUES
('room', 'Ruang Rapat A', '1', TRUE, 'TKT-2024-0131'),
('room', 'Ruang Rapat A', '3', TRUE, NULL),
('room', 'Ruang Rapat A', '7', TRUE, NULL),
('room', 'Ruang Rapat A', '10', TRUE, NULL),
('room', 'Ruang Rapat B', '4', TRUE, NULL),
('room', 'Ruang Rapat B', '9', TRUE, NULL),
('room', 'Ruang Rapat B', '13', TRUE, NULL);

-- Slots - Vehicle weekly
INSERT INTO slots (category, item_name, slot_key, is_booked, booked_by_ticket_id) VALUES
('vehicle', 'Avanza B-1234-AB', 'Sel', TRUE, NULL),
('vehicle', 'Honda Jazz', 'Rab', TRUE, NULL),
('vehicle', 'Honda Jazz', 'Kam', TRUE, NULL),
('vehicle', 'Innova B-9012-EF', 'Sen', TRUE, NULL);
