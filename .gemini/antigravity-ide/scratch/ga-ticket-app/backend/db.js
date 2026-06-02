const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const JSON_DB_PATH = path.join(__dirname, 'db.json');

// Cryptography Helpers
function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

// Default Seed Data
const DEFAULT_SEED_DATA = {
  users: [
    { id: 1, name: "Andi Setiawan", email: "andi@gaticket.co.id", role: "manager", avatar_initials: "AS", branch: "Balikpapan", department: "Marketing", password_hash: "", salt: "" },
    { id: 2, name: "Budi Santoso", email: "budi@gaticket.co.id", role: "employee", avatar_initials: "BS", branch: "Balikpapan", department: "Operasional", password_hash: "", salt: "" },
    { id: 3, name: "Citra Dewi", email: "citra@gaticket.co.id", role: "employee", avatar_initials: "CD", branch: "Balikpapan", department: "HR", password_hash: "", salt: "" },
    { id: 4, name: "Rian Hidayat", email: "rian@gaticket.co.id", role: "bm", avatar_initials: "RH", branch: "Balikpapan", department: "Management", password_hash: "", salt: "" },
    { id: 5, name: "Admin GA Utama", email: "admin@gaticket.co.id", role: "admin", avatar_initials: "ADM", branch: "Balikpapan", department: "General Affairs", password_hash: "", salt: "" }
  ],
  sessions: [],
  budget_caps: [
    { id: 1, department: "Marketing", branch: "Balikpapan", allocated_budget: 40000000.00, used_budget: 18500000.00 },
    { id: 2, department: "Operasional", branch: "Balikpapan", allocated_budget: 40000000.00, used_budget: 12800000.00 },
    { id: 3, department: "HR", branch: "Balikpapan", allocated_budget: 40000000.00, used_budget: 6300000.00 },
    { id: 4, department: "IT", branch: "Balikpapan", allocated_budget: 40000000.00, used_budget: 4500000.00 }
  ],
  assets: [
    { id: 1, code: "BPN-AST-0001", name: "Laptop Dell XPS 15", category: "Elektronik", condition: "Baik", status: "Dipinjam" },
    { id: 2, code: "BPN-AST-0002", name: "Proyektor Epson EB", category: "Elektronik", condition: "Baik", status: "Tersedia" },
    { id: 3, code: "BPN-AST-0003", name: "Kamera Sony Alpha", category: "Elektronik", condition: "Servis", status: "Tidak Tersedia" },
    { id: 4, code: "BPN-AST-0004", name: "Toyota Avanza", category: "Kendaraan", condition: "Baik", status: "Tersedia" }
  ],
  tickets: [
    {
      id: "TKT-2024-0147",
      user_id: 1,
      type: "pesawat",
      description: "Jakarta → Balikpapan, 15 Jul",
      budget: 2850000.00,
      status: "pending",
      detail: { dari: "Jakarta (CGK)", ke: "Balikpapan (BPN)", tgl: "15 Jul 2025", maskapai: "Garuda Indonesia", budget: "Rp 2.850.000", catatan: "Rapat koordinasi vendor supply chain 16-17 Jul" },
      comments: [{ user: "Andi Setiawan", role: "manager", msg: "Tolong segera diapprove untuk booking tiket pesawat", time: "2 Jan 09:30" }],
      date_created: "2026-01-02",
      created_at: new Date("2026-01-02T09:30:00Z").toISOString()
    },
    {
      id: "TKT-2024-0146",
      user_id: 2,
      type: "hotel",
      description: "Hotel Aston Makassar, 3 mlm",
      budget: 6200000.00,
      status: "bm",
      detail: { hotel: "Aston Makassar", checkin: "10 Jan 2025", checkout: "13 Jan 2025", tamu: "2 orang", budget: "Rp 6.200.000", catatan: "Training cabang" },
      comments: [],
      date_created: "2025-12-30",
      created_at: new Date("2025-12-30T10:00:00Z").toISOString()
    },
    {
      id: "TKT-2024-0141",
      user_id: 1,
      type: "alat",
      description: "Laptop Dell XPS 15 · AST-0023",
      budget: 0.00,
      status: "approved",
      detail: { aset: "BPN-AST-0023", nama: "Laptop Dell XPS 15", mulai: "28 Des", kembali: "10 Jan", tujuan: "Presentasi klien" },
      comments: [],
      date_created: "2025-12-28",
      created_at: new Date("2025-12-28T09:00:00Z").toISOString()
    },
    {
      id: "TKT-2024-0139",
      user_id: 1,
      type: "kendaraan",
      description: "Avanza B-1234-AB · Ke Bandara",
      budget: 0.00,
      status: "approved",
      detail: { kendaraan: "Toyota Avanza B-1234-AB", tujuan: "Bandara Sepinggan", mulai: "26 Des 08:00", selesai: "26 Des 12:00", supir: "Tidak perlu" },
      comments: [],
      date_created: "2025-12-26",
      created_at: new Date("2025-12-26T08:00:00Z").toISOString()
    },
    {
      id: "TKT-2024-0135",
      user_id: 1,
      type: "zoom",
      description: "Meeting All Hands · 29 Des",
      budget: 0.00,
      status: "draft",
      detail: { topik: "Meeting All Hands Q1", tgl: "29 Des 2024", jam: "14:00 – 15:00", peserta: "45 orang" },
      comments: [],
      date_created: "2025-12-24",
      created_at: new Date("2025-12-24T14:00:00Z").toISOString()
    },
    {
      id: "TKT-2024-0131",
      user_id: 3,
      type: "meeting",
      description: "Ruang Rapat A · 20 Des 10:00",
      budget: 0.00,
      status: "rejected",
      detail: { ruang: "Ruang Rapat A", tgl: "20 Des 2024", jam: "10:00 – 12:00", acara: "Review Kinerja" },
      comments: [{ user: "Admin GA Utama", role: "admin", msg: "Ditolak karena ruangan sudah dibooking direksi", time: "19 Des 14:20" }],
      date_created: "2025-12-19",
      created_at: new Date("2025-12-19T14:20:00Z").toISOString()
    }
  ],
  approvals: [
    { id: 1, ticket_id: "TKT-2024-0141", user_id: 5, action: "approve", notes: "Approved by GA", created_at: new Date("2025-12-28T10:00:00Z").toISOString() },
    { id: 2, ticket_id: "TKT-2024-0139", user_id: 5, action: "approve", notes: "Approved by GA", created_at: new Date("2025-12-26T09:00:00Z").toISOString() },
    { id: 3, ticket_id: "TKT-2024-0131", user_id: 5, action: "reject", notes: "Ditolak karena ruangan sudah dibooking direksi", created_at: new Date("2025-12-19T14:20:00Z").toISOString() }
  ],
  slots: [
    { id: 1, category: "room", item_name: "Ruang Rapat A", slot_key: "1", is_booked: true, booked_by_ticket_id: "TKT-2024-0131" },
    { id: 2, category: "room", item_name: "Ruang Rapat A", slot_key: "3", is_booked: true, booked_by_ticket_id: null },
    { id: 3, category: "room", item_name: "Ruang Rapat A", slot_key: "7", is_booked: true, booked_by_ticket_id: null },
    { id: 4, category: "room", item_name: "Ruang Rapat A", slot_key: "10", is_booked: true, booked_by_ticket_id: null },
    { id: 5, category: "room", item_name: "Ruang Rapat B", slot_key: "4", is_booked: true, booked_by_ticket_id: null },
    { id: 6, category: "room", item_name: "Ruang Rapat B", slot_key: "9", is_booked: true, booked_by_ticket_id: null },
    { id: 7, category: "room", item_name: "Ruang Rapat B", slot_key: "13", is_booked: true, booked_by_ticket_id: null },
    { id: 8, category: "vehicle", item_name: "Avanza B-1234-AB", slot_key: "Sel", is_booked: true, booked_by_ticket_id: null },
    { id: 9, category: "vehicle", item_name: "Honda Jazz", slot_key: "Rab", is_booked: true, booked_by_ticket_id: null },
    { id: 10, category: "vehicle", item_name: "Honda Jazz", slot_key: "Kam", is_booked: true, booked_by_ticket_id: null },
    { id: 11, category: "vehicle", item_name: "Innova B-9012-EF", slot_key: "Sen", is_booked: true, booked_by_ticket_id: null }
  ]
};

// Initialize PostgreSQL Pool Configuration
const poolConfig = {};

if (process.env.DATABASE_URL) {
  // Use connection string (Supabase standard)
  poolConfig.connectionString = process.env.DATABASE_URL;
  // Supabase PostgreSQL requires SSL encryption in cloud env
  poolConfig.ssl = { rejectUnauthorized: false };
} else {
  // Use individual parameters
  poolConfig.user = process.env.DB_USER || 'postgres';
  poolConfig.password = process.env.DB_PASSWORD || 'postgres';
  poolConfig.host = process.env.DB_HOST || 'localhost';
  poolConfig.port = parseInt(process.env.DB_PORT || '5432');
  poolConfig.database = process.env.DB_DATABASE || 'ga_tickets';
  
  // Enable SSL if specified in env
  if (process.env.DB_SSL === 'true') {
    poolConfig.ssl = { rejectUnauthorized: false };
  }
}

poolConfig.connectionTimeoutMillis = 4000; // 4 seconds timeout

const pool = new Pool(poolConfig);
let usePostgres = false;

// Initialize JSON DB Fallback Store
function initializeJsonDb() {
  if (!fs.existsSync(JSON_DB_PATH)) {
    const seedWithPasswords = { ...DEFAULT_SEED_DATA };
    seedWithPasswords.users = seedWithPasswords.users.map(u => {
      const salt = generateSalt();
      const hash = hashPassword('password123', salt);
      return { ...u, password_hash: hash, salt };
    });
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(seedWithPasswords, null, 2));
  } else {
    const data = JSON.parse(fs.readFileSync(JSON_DB_PATH, 'utf8'));
    let modified = false;
    data.users = data.users.map(u => {
      if (!u.password_hash) {
        const salt = generateSalt();
        const hash = hashPassword('password123', salt);
        u.salt = salt;
        u.password_hash = hash;
        modified = true;
      }
      return u;
    });
    if (!data.sessions) {
      data.sessions = [];
      modified = true;
    }
    if (modified) {
      fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2));
    }
  }
}

function readJsonDb() {
  initializeJsonDb();
  const data = fs.readFileSync(JSON_DB_PATH, 'utf8');
  return JSON.parse(data);
}

function writeJsonDb(data) {
  fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2));
}

// Test PG / Supabase Connection
async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('[DATABASE] PostgreSQL (Supabase/PG) connected successfully!');
    client.release();
    usePostgres = true;

    // Check if PG users need password credentials initialized
    const res = await pool.query("SELECT id, password_hash FROM users");
    for (let u of res.rows) {
      if (!u.password_hash || u.password_hash === '') {
        const salt = generateSalt();
        const hash = hashPassword('password123', salt);
        await pool.query(
          "UPDATE users SET password_hash = $1, salt = $2 WHERE id = $3",
          [hash, salt, u.id]
        );
        console.log(`[DATABASE] Seeding secure password hash for user ID ${u.id}`);
      }
    }
  } catch (err) {
    console.warn('[DATABASE] PostgreSQL/Supabase connection failed! Error:', err.message);
    console.warn('[DATABASE] Falling back to Dynamic Local JSON Database (db.json) for 100% reliability!');
    initializeJsonDb();
    usePostgres = false;
  }
}

// UNIFIED DB EXPORTS
const db = {
  init: testConnection,

  hashPassword,
  generateSalt,

  // AUTHENTICATION & SECURE SESSION METHODS
  verifyCredentials: async (email, password) => {
    let user;
    if (usePostgres) {
      const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      user = res.rows[0];
    } else {
      const data = readJsonDb();
      user = data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    }

    if (!user) return null;

    const computedHash = hashPassword(password, user.salt);
    if (computedHash === user.password_hash) {
      const { password_hash, salt, ...profile } = user;
      return profile;
    }
    return null;
  },

  createSession: async (userId) => {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    
    if (usePostgres) {
      await pool.query(
        'INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)',
        [token, userId, expiresAt]
      );
    } else {
      const store = readJsonDb();
      store.sessions.push({
        token,
        user_id: parseInt(userId),
        expires_at: expiresAt.toISOString()
      });
      writeJsonDb(store);
    }
    return { token, expiresAt };
  },

  verifySession: async (token) => {
    let session;
    const now = new Date();

    if (usePostgres) {
      const sRes = await pool.query(
        'SELECT * FROM sessions WHERE token = $1 AND expires_at > $2',
        [token, now]
      );
      session = sRes.rows[0];
    } else {
      const store = readJsonDb();
      session = store.sessions.find(s => s.token === token && new Date(s.expires_at) > now);
    }

    if (!session) return null;

    return await db.getUserById(session.user_id);
  },

  deleteSession: async (token) => {
    if (usePostgres) {
      await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
    } else {
      const store = readJsonDb();
      const idx = store.sessions.findIndex(s => s.token === token);
      if (idx !== -1) {
        store.sessions.splice(idx, 1);
        writeJsonDb(store);
      }
    }
    return true;
  },

  // USERS
  getUsers: async () => {
    if (usePostgres) {
      const res = await pool.query('SELECT id, name, email, role, avatar_initials, branch, department, created_at FROM users ORDER BY id ASC');
      return res.rows;
    } else {
      return readJsonDb().users.map(({ password_hash, salt, ...profile }) => profile);
    }
  },

  getUserById: async (id) => {
    let user;
    if (usePostgres) {
      const res = await pool.query('SELECT id, name, email, role, avatar_initials, branch, department, created_at FROM users WHERE id = $1', [id]);
      user = res.rows[0];
    } else {
      const data = readJsonDb();
      user = data.users.find(u => u.id === parseInt(id));
    }
    if (user) {
      const { password_hash, salt, ...profile } = user;
      return profile;
    }
    return null;
  },

  addUser: async (name, email, role, branch, department, rawPassword = 'password123') => {
    const avatar = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 3);
    const salt = generateSalt();
    const hash = hashPassword(rawPassword, salt);

    if (usePostgres) {
      const res = await pool.query(
        'INSERT INTO users (name, email, role, avatar_initials, branch, department, password_hash, salt) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, name, email, role, avatar_initials, branch, department',
        [name, email, role, avatar, branch, department, hash, salt]
      );
      return res.rows[0];
    } else {
      const store = readJsonDb();
      const nextId = store.users.length ? Math.max(...store.users.map(u => u.id)) + 1 : 1;
      const newUser = { id: nextId, name, email, role, avatar_initials: avatar, branch, department, password_hash: hash, salt };
      store.users.push(newUser);
      writeJsonDb(store);
      
      const { password_hash, salt: uSalt, ...profile } = newUser;
      return profile;
    }
  },

  updateUserRole: async (id, role) => {
    if (usePostgres) {
      const res = await pool.query('UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role, avatar_initials, branch, department', [role, id]);
      return res.rows[0];
    } else {
      const store = readJsonDb();
      const user = store.users.find(u => u.id === parseInt(id));
      if (user) {
        user.role = role;
        writeJsonDb(store);
      }
      if (user) {
        const { password_hash, salt, ...profile } = user;
        return profile;
      }
      return null;
    }
  },

  updateUser: async (id, data) => {
    const { name, email, role, branch, department, password } = data;
    const avatar = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 3) : '';
    
    if (usePostgres) {
      if (password) {
        const salt = generateSalt();
        const hash = hashPassword(password, salt);
        const res = await pool.query(
          'UPDATE users SET name = $1, email = $2, role = $3, branch = $4, department = $5, avatar_initials = $6, password_hash = $7, salt = $8 WHERE id = $9 RETURNING id, name, email, role, avatar_initials, branch, department',
          [name, email, role, branch, department, avatar, hash, salt, id]
        );
        return res.rows[0];
      } else {
        const res = await pool.query(
          'UPDATE users SET name = $1, email = $2, role = $3, branch = $4, department = $5, avatar_initials = $6 WHERE id = $7 RETURNING id, name, email, role, avatar_initials, branch, department',
          [name, email, role, branch, department, avatar, id]
        );
        return res.rows[0];
      }
    } else {
      const store = readJsonDb();
      const user = store.users.find(u => u.id === parseInt(id));
      if (user) {
        if (name) {
          user.name = name;
          user.avatar_initials = avatar;
        }
        if (email) user.email = email;
        if (role) user.role = role;
        if (branch) user.branch = branch;
        if (department) user.department = department;
        if (password) {
          const salt = generateSalt();
          const hash = hashPassword(password, salt);
          user.salt = salt;
          user.password_hash = hash;
        }
        writeJsonDb(store);
      }
      if (user) {
        const { password_hash, salt, ...profile } = user;
        return profile;
      }
      return null;
    }
  },

  deleteUser: async (id) => {
    if (usePostgres) {
      await pool.query('DELETE FROM users WHERE id = $1', [id]);
      return true;
    } else {
      const store = readJsonDb();
      const index = store.users.findIndex(u => u.id === parseInt(id));
      if (index !== -1) {
        store.users.splice(index, 1);
        writeJsonDb(store);
        return true;
      }
      return false;
    }
  },

  // BUDGET CAPS
  getBudgets: async () => {
    if (usePostgres) {
      const res = await pool.query('SELECT * FROM budget_caps ORDER BY id ASC');
      return res.rows;
    } else {
      return readJsonDb().budget_caps;
    }
  },

  updateBudgetCap: async (id, allocated, used) => {
    if (usePostgres) {
      const res = await pool.query(
        'UPDATE budget_caps SET allocated_budget = $1, used_budget = $2 WHERE id = $3 RETURNING *',
        [allocated, used, id]
      );
      return res.rows[0];
    } else {
      const store = readJsonDb();
      const budget = store.budget_caps.find(b => b.id === parseInt(id));
      if (budget) {
        budget.allocated_budget = parseFloat(allocated);
        budget.used_budget = parseFloat(used);
        writeJsonDb(store);
      }
      return budget;
    }
  },

  addBudgetCap: async (department, branch, allocatedBudget) => {
    const allocated = parseFloat(allocatedBudget) || 0;
    if (usePostgres) {
      const res = await pool.query(
        'INSERT INTO budget_caps (department, branch, allocated_budget, used_budget) VALUES ($1, $2, $3, 0.00) ON CONFLICT (department, branch) DO UPDATE SET allocated_budget = $3 RETURNING *',
        [department, branch, allocated]
      );
      return res.rows[0];
    } else {
      const store = readJsonDb();
      let budget = store.budget_caps.find(b => b.department === department && b.branch === branch);
      if (budget) {
        budget.allocated_budget = allocated;
      } else {
        const nextId = store.budget_caps.length ? Math.max(...store.budget_caps.map(b => b.id)) + 1 : 1;
        budget = { id: nextId, department, branch, allocated_budget: allocated, used_budget: 0.00 };
        store.budget_caps.push(budget);
      }
      writeJsonDb(store);
      return budget;
    }
  },

  // MASTER ASSETS
  getAssets: async () => {
    if (usePostgres) {
      const res = await pool.query('SELECT * FROM assets ORDER BY id ASC');
      return res.rows;
    } else {
      return readJsonDb().assets;
    }
  },

  addAsset: async (code, name, category, condition, status) => {
    if (usePostgres) {
      const res = await pool.query(
        'INSERT INTO assets (code, name, category, condition, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [code, name, category, condition, status]
      );
      return res.rows[0];
    } else {
      const store = readJsonDb();
      const nextId = store.assets.length ? Math.max(...store.assets.map(a => a.id)) + 1 : 1;
      const newAsset = { id: nextId, code, name, category, condition, status };
      store.assets.push(newAsset);
      writeJsonDb(store);
      return newAsset;
    }
  },

  updateAsset: async (id, data) => {
    const { code, name, category, condition, status } = data;
    if (usePostgres) {
      const res = await pool.query(
        'UPDATE assets SET code = $1, name = $2, category = $3, condition = $4, status = $5 WHERE id = $6 RETURNING *',
        [code, name, category, condition, status, id]
      );
      return res.rows[0];
    } else {
      const store = readJsonDb();
      const asset = store.assets.find(a => a.id === parseInt(id));
      if (asset) {
        if (code !== undefined) asset.code = code;
        if (name !== undefined) asset.name = name;
        if (category !== undefined) asset.category = category;
        if (condition !== undefined) asset.condition = condition;
        if (status !== undefined) asset.status = status;
        writeJsonDb(store);
      }
      return asset;
    }
  },

  deleteAsset: async (id) => {
    if (usePostgres) {
      await pool.query('DELETE FROM assets WHERE id = $1', [id]);
      return true;
    } else {
      const store = readJsonDb();
      const index = store.assets.findIndex(a => a.id === parseInt(id));
      if (index !== -1) {
        store.assets.splice(index, 1);
        writeJsonDb(store);
        return true;
      }
      return false;
    }
  },

  // TICKETS
  getTickets: async (user) => {
    let tickets = [];
    if (usePostgres) {
      const res = await pool.query(`
        SELECT t.*, u.name as user_name, u.department as user_dept, u.branch as user_branch 
        FROM tickets t 
        JOIN users u ON t.user_id = u.id 
        ORDER BY t.created_at DESC
      `);
      tickets = res.rows;
    } else {
      const store = readJsonDb();
      tickets = store.tickets.map(t => {
        const u = store.users.find(x => x.id === t.user_id) || {};
        return {
          ...t,
          user_name: u.name || 'Unknown',
          user_dept: u.department || '',
          user_branch: u.branch || ''
        };
      });
    }

    if (!user) return tickets;

    // Apply isolation rules based on user role
    if (user.role === 'admin') {
      return tickets;
    } else if (user.role === 'bm') {
      // Branch Manager sees all tickets in their branch
      return tickets.filter(t => t.user_branch === user.branch);
    } else if (user.role === 'manager') {
      // Manager sees their own tickets AND tickets from users in their department and branch
      return tickets.filter(t => t.user_id === user.id || (t.user_dept === user.department && t.user_branch === user.branch));
    } else {
      // Employee sees only their own tickets
      return tickets.filter(t => t.user_id === user.id);
    }
  },

  createTicket: async (id, userId, type, description, budget, status, detail) => {
    const today = new Date().toISOString().substring(0, 10);
    const now = new Date().toISOString();
    
    if (status !== 'draft' && budget > 0) {
      await db.adjustBudget(userId, budget);
    }

    if (usePostgres) {
      const res = await pool.query(
        'INSERT INTO tickets (id, user_id, type, description, budget, status, detail, comments, date_created, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
        [id, userId, type, description, budget, status, JSON.stringify(detail), JSON.stringify([]), today, now]
      );
      return res.rows[0];
    } else {
      const store = readJsonDb();
      const newTicket = {
        id,
        user_id: parseInt(userId),
        type,
        description,
        budget: parseFloat(budget),
        status,
        detail,
        comments: [],
        date_created: today,
        created_at: now
      };
      store.tickets.unshift(newTicket);
      writeJsonDb(store);
      return newTicket;
    }
  },

  saveTicketDraft: async (id, userId, type, description, budget, detail) => {
    const today = new Date().toISOString().substring(0, 10);
    const now = new Date().toISOString();
    if (usePostgres) {
      const check = await pool.query('SELECT id FROM tickets WHERE id = $1', [id]);
      if (check.rows.length) {
        const res = await pool.query(
          'UPDATE tickets SET type = $1, description = $2, budget = $3, detail = $4 WHERE id = $5 RETURNING *',
          [type, description, budget, JSON.stringify(detail), id]
        );
        return res.rows[0];
      } else {
        const res = await pool.query(
          'INSERT INTO tickets (id, user_id, type, description, budget, status, detail, comments, date_created, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
          [id, userId, type, description, budget, 'draft', JSON.stringify(detail), JSON.stringify([]), today, now]
        );
        return res.rows[0];
      }
    } else {
      const store = readJsonDb();
      const existing = store.tickets.find(t => t.id === id);
      if (existing) {
        existing.type = type;
        existing.description = description;
        existing.budget = parseFloat(budget);
        existing.detail = detail;
        writeJsonDb(store);
        return existing;
      } else {
        const newTicket = {
          id,
          user_id: parseInt(userId),
          type,
          description,
          budget: parseFloat(budget),
          status: 'draft',
          detail,
          comments: [],
          date_created: today,
          created_at: now
        };
        store.tickets.unshift(newTicket);
        writeJsonDb(store);
        return newTicket;
      }
    }
  },

  updateTicketStatus: async (id, status, approverId, notes) => {
    const now = new Date().toISOString();
    let ticket;
    if (usePostgres) {
      const res = await pool.query('SELECT * FROM tickets WHERE id = $1', [id]);
      ticket = res.rows[0];
    } else {
      const store = readJsonDb();
      ticket = store.tickets.find(t => t.id === id);
    }

    if (ticket && status === 'rejected' && ticket.budget > 0 && ticket.status !== 'draft') {
      await db.adjustBudget(ticket.user_id, -ticket.budget);
    }

    if (usePostgres) {
      const res = await pool.query(
        'UPDATE tickets SET status = $1 WHERE id = $2 RETURNING *',
        [status, id]
      );
      await pool.query(
        'INSERT INTO approvals (ticket_id, user_id, action, notes, created_at) VALUES ($1, $2, $3, $4, $5)',
        [id, approverId, status === 'approved' || status === 'bm' ? 'approve' : 'reject', notes, now]
      );
      return res.rows[0];
    } else {
      const store = readJsonDb();
      const t = store.tickets.find(x => x.id === id);
      if (t) {
        t.status = status;
        const nextApprId = store.approvals.length ? Math.max(...store.approvals.map(a => a.id)) + 1 : 1;
        store.approvals.push({
          id: nextApprId,
          ticket_id: id,
          user_id: parseInt(approverId),
          action: status === 'approved' || status === 'bm' ? 'approve' : 'reject',
          notes: notes || '',
          created_at: now
        });
        writeJsonDb(store);
      }
      return t;
    }
  },

  adminOverrideTicket: async (id, status, notes) => {
    const now = new Date().toISOString();
    if (usePostgres) {
      const res = await pool.query('UPDATE tickets SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
      await pool.query(
        'INSERT INTO approvals (ticket_id, user_id, action, notes, created_at) VALUES ($1, $2, $3, $4, $5)',
        [id, 5, 'admin_override', `Override to ${status}. Notes: ${notes}`, now]
      );
      return res.rows[0];
    } else {
      const store = readJsonDb();
      const t = store.tickets.find(x => x.id === id);
      if (t) {
        t.status = status;
        const nextApprId = store.approvals.length ? Math.max(...store.approvals.map(a => a.id)) + 1 : 1;
        store.approvals.push({
          id: nextApprId,
          ticket_id: id,
          user_id: 5,
          action: 'admin_override',
          notes: `Override to ${status}. Notes: ${notes}`,
          created_at: now
        });
        writeJsonDb(store);
      }
      return t;
    }
  },

  addTicketComment: async (id, user, role, msg) => {
    const now = new Date();
    const timeStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + ' ' + 
                    now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
    const commentObj = { user, role, msg, time: timeStr };

    if (usePostgres) {
      const res = await pool.query(
        'UPDATE tickets SET comments = comments || $1::jsonb WHERE id = $2 RETURNING *',
        [JSON.stringify([commentObj]), id]
      );
      return res.rows[0];
    } else {
      const store = readJsonDb();
      const t = store.tickets.find(x => x.id === id);
      if (t) {
        if (!t.comments) t.comments = [];
        t.comments.push(commentObj);
        writeJsonDb(store);
      }
      return t;
    }
  },

  deleteTicket: async (id) => {
    if (usePostgres) {
      await pool.query('DELETE FROM tickets WHERE id = $1', [id]);
      return true;
    } else {
      const store = readJsonDb();
      const index = store.tickets.findIndex(t => t.id === id);
      if (index !== -1) {
        store.tickets.splice(index, 1);
        writeJsonDb(store);
        return true;
      }
      return false;
    }
  },

  adjustBudget: async (userId, amount) => {
    let user = await db.getUserById(userId);
    if (!user) return;

    const department = user.department;
    const branch = user.branch;

    if (usePostgres) {
      await pool.query(
        'UPDATE budget_caps SET used_budget = used_budget + $1 WHERE department = $2 AND branch = $3',
        [amount, department, branch]
      );
    } else {
      const store = readJsonDb();
      const cap = store.budget_caps.find(c => c.department === department && c.branch === branch);
      if (cap) {
        cap.used_budget = parseFloat(cap.used_budget) + parseFloat(amount);
        writeJsonDb(store);
      }
    }
  },

  // SLOTS
  getSlots: async () => {
    if (usePostgres) {
      const res = await pool.query('SELECT * FROM slots ORDER BY id ASC');
      return res.rows;
    } else {
      return readJsonDb().slots;
    }
  },

  bookSlot: async (category, itemName, slotKey, isBooked, ticketId) => {
    if (usePostgres) {
      const check = await pool.query(
        'SELECT id FROM slots WHERE category = $1 AND item_name = $2 AND slot_key = $3',
        [category, itemName, slotKey]
      );
      if (check.rows.length) {
        const res = await pool.query(
          'UPDATE slots SET is_booked = $1, booked_by_ticket_id = $2 WHERE category = $3 AND item_name = $4 AND slot_key = $5 RETURNING *',
          [isBooked, ticketId, category, itemName, slotKey]
        );
        return res.rows[0];
      } else {
        const res = await pool.query(
          'INSERT INTO slots (category, item_name, slot_key, is_booked, booked_by_ticket_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [isBooked, ticketId, category, itemName, slotKey]
        );
        return res.rows[0];
      }
    } else {
      const store = readJsonDb();
      let slot = store.slots.find(s => s.category === category && s.item_name === itemName && s.slot_key === slotKey);
      if (slot) {
        slot.is_booked = isBooked;
        slot.booked_by_ticket_id = ticketId;
      } else {
        const nextId = store.slots.length ? Math.max(...store.slots.map(s => s.id)) + 1 : 1;
        slot = { id: nextId, category, item_name: itemName, slot_key: slotKey, is_booked: isBooked, booked_by_ticket_id: ticketId };
        store.slots.push(slot);
      }
      writeJsonDb(store);
      return slot;
    }
  },

  addSlot: async (category, itemName, slotKey) => {
    if (usePostgres) {
      const res = await pool.query(
        'INSERT INTO slots (category, item_name, slot_key, is_booked) VALUES ($1, $2, $3, FALSE) ON CONFLICT (category, item_name, slot_key) DO UPDATE SET is_booked = FALSE RETURNING *',
        [category, itemName, slotKey]
      );
      return res.rows[0];
    } else {
      const store = readJsonDb();
      let slot = store.slots.find(s => s.category === category && s.item_name === itemName && s.slot_key === slotKey);
      if (slot) {
        slot.is_booked = false;
        slot.booked_by_ticket_id = null;
      } else {
        const nextId = store.slots.length ? Math.max(...store.slots.map(s => s.id)) + 1 : 1;
        slot = { id: nextId, category, item_name: itemName, slot_key: slotKey, is_booked: false, booked_by_ticket_id: null };
        store.slots.push(slot);
      }
      writeJsonDb(store);
      return slot;
    }
  },

  freeSlot: async (category, itemName, slotKey) => {
    if (usePostgres) {
      const res = await pool.query(
        'UPDATE slots SET is_booked = FALSE, booked_by_ticket_id = NULL WHERE category = $1 AND item_name = $2 AND slot_key = $3 RETURNING *',
        [category, itemName, slotKey]
      );
      return res.rows[0];
    } else {
      const store = readJsonDb();
      const slot = store.slots.find(s => s.category === category && s.item_name === itemName && s.slot_key === slotKey);
      if (slot) {
        slot.is_booked = false;
        slot.booked_by_ticket_id = null;
        writeJsonDb(store);
      }
      return slot;
    }
  },

  getApprovals: async () => {
    if (usePostgres) {
      const res = await pool.query(`
        SELECT a.*, u.name as approver_name, u.role as approver_role, t.type as ticket_type, t.description as ticket_desc, t.budget as ticket_budget
        FROM approvals a
        JOIN users u ON a.user_id = u.id
        JOIN tickets t ON a.ticket_id = t.id
        ORDER BY a.created_at DESC
      `);
      return res.rows;
    } else {
      const store = readJsonDb();
      return store.approvals.map(a => {
        const u = store.users.find(x => x.id === a.user_id) || {};
        const t = store.tickets.find(x => x.id === a.ticket_id) || {};
        return {
          ...a,
          approver_name: u.name || 'Unknown',
          approver_role: u.role || '',
          ticket_type: t.type || '',
          ticket_desc: t.description || '',
          ticket_budget: t.budget || 0
        };
      });
    }
  }
};

module.exports = db;
