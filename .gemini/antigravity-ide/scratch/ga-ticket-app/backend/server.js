const express = require('express');
const cors = require('cors');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// In-Memory Webhook Log Simulator
const webhookLogs = [];

function simulateWebhook(event, payload) {
  const timestamp = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const logEntry = {
    id: 'WH-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
    event,
    target: "https://n8n.gaticket.co.id/webhook/telegram",
    time: timestamp,
    status: 200,
    payload
  };
  webhookLogs.unshift(logEntry);
  if (webhookLogs.length > 50) webhookLogs.pop(); // keep last 50
}


// 1. Initial test database connection
db.init();

// --- AUTHENTICATION & SECURITY MIDDLEWARE ---
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Akses ditolak! Token otorisasi tidak ditemukan.' });
  }

  try {
    const user = await db.verifySession(token);
    if (!user) {
      return res.status(401).json({ error: 'Sesi Anda telah berakhir, silakan login kembali.' });
    }
    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Public auth routes (MUST be registered before protecting /api)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan Password wajib diisi!' });
    }
    const user = await db.verifyCredentials(email, password);
    if (!user) {
      return res.status(401).json({ error: 'Email atau Password yang Anda masukkan salah!' });
    }
    const session = await db.createSession(user.id);
    res.json({ token: session.token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Protected auth routes
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  res.json(req.user);
});

app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    await db.deleteSession(req.token);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Protect all subsequent /api endpoints
app.use('/api', authenticateToken);

// --- API ENDPOINTS ---

// WEBHOOK LOGS
app.get('/api/webhook/logs', (req, res) => {
  res.json(webhookLogs);
});

// USERS & ROLE MANAGEMENT
app.get('/api/users', async (req, res) => {
  try {
    const users = await db.getUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { name, email, role, branch, department } = req.body;
    if (!name || !email || !role || !branch || !department) {
      return res.status(400).json({ error: "Semua field user wajib diisi!" });
    }
    const newUser = await db.addUser(name, email, role, branch, department);
    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!role) return res.status(400).json({ error: "Role wajib ditentukan!" });
    const updated = await db.updateUserRole(id, role);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteUser(id);
    res.json({ success: true, message: `User ${id} berhasil dihapus.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// BUDGET CAPS
app.get('/api/budgets', async (req, res) => {
  try {
    const budgets = await db.getBudgets();
    res.json(budgets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/budgets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { allocated_budget, used_budget } = req.body;
    const updated = await db.updateBudgetCap(id, allocated_budget, used_budget);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DASHBOARD METRICS
app.get('/api/dashboard', async (req, res) => {
  try {
    const tickets = await db.getTickets(req.user);
    const budgets = await db.getBudgets();

    // 1. Calculate stats
    const activeTickets = tickets.filter(t => ['pending', 'bm', 'draft'].includes(t.status)).length;
    const pendingTickets = tickets.filter(t => ['pending', 'bm'].includes(t.status)).length;
    
    const now = new Date();
    const currentMonthStr = now.toLocaleString('id-ID', { month: 'short' });
    const approvedThisMonth = tickets.filter(t => 
      ['approved', 'completed'].includes(t.status) && t.date_created.includes(currentMonthStr)
    ).length;

    // Sisa budget Marketing Balikpapan (for Andi Setiawan ID 1 default view)
    const mktBudget = budgets.find(b => b.department === 'Marketing' && b.branch === 'Balikpapan') || { allocated_budget: 40000000.00, used_budget: 18500000.00 };
    const remainingBudget = mktBudget.allocated_budget - mktBudget.used_budget;

    // 2. SLA Compliance Calculation
    const approvals = await db.getApprovals();
    let totalSlaHrs = 0;
    let countedTickets = 0;
    
    // Calculate real SLA
    tickets.forEach(t => {
      const ticketApprovals = approvals.filter(a => a.ticket_id === t.id);
      if (ticketApprovals.length) {
        const firstAppr = ticketApprovals[ticketApprovals.length - 1]; // oldest approval log
        const hrs = (new Date(firstAppr.created_at) - new Date(t.created_at)) / (1000 * 60 * 60);
        totalSlaHrs += hrs;
        countedTickets++;
      }
    });
    
    const avgSlaDays = countedTickets > 0 ? (totalSlaHrs / 24 / countedTickets).toFixed(1) : "1.2";

    res.json({
      activeTickets,
      pendingTickets,
      approvedThisMonth,
      remainingBudget,
      allocatedBudget: mktBudget.allocated_budget,
      avgSlaDays,
      recentTickets: tickets.slice(0, 5)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TICKETS
app.get('/api/tickets', async (req, res) => {
  try {
    const tickets = await db.getTickets(req.user);
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tickets', async (req, res) => {
  try {
    const { id, type, description, budget, detail } = req.body;
    const user_id = req.user.id;
    if (!id || !user_id || !type || !description) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check Budget Cap
    const users = await db.getUsers();
    const user = users.find(u => u.id === parseInt(user_id));
    if (user && budget > 0) {
      const budgets = await db.getBudgets();
      const cap = budgets.find(b => b.department === user.department && b.branch === user.branch);
      if (cap && (parseFloat(cap.used_budget) + parseFloat(budget) > parseFloat(cap.allocated_budget))) {
        return res.status(400).json({ 
          error: `Gagal! Pengajuan melebihi sisa alokasi budget departemen ${user.department} (Sisa budget: Rp ${(cap.allocated_budget - cap.used_budget).toLocaleString('id-ID')})`
        });
      }
    }

    // Auto-route to bm if budget > 5,000,000
    const status = budget > 5000000 ? 'bm' : 'pending';

    const newTicket = await db.createTicket(id, user_id, type, description, budget, status, detail);

    // Simulate n8n webhook notification
    simulateWebhook("TICKET_CREATED", {
      ticket_id: id,
      type,
      description,
      budget,
      status,
      user_name: user ? user.name : 'Unknown',
      department: user ? user.department : ''
    });

    res.status(201).json(newTicket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tickets/draft', async (req, res) => {
  try {
    const { id, type, description, budget, detail } = req.body;
    const user_id = req.user.id;
    const ticket = await db.saveTicketDraft(id, user_id, type, description, budget, detail);
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tickets/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { approver_id, notes } = req.body;
    
    // Find ticket first to see its budget and transition status
    const tickets = await db.getTickets();
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return res.status(404).json({ error: "Tiket tidak ditemukan" });

    // Transition:
    // If budget > 5m and current status is 'pending' (manager approved) -> goes to 'bm'
    // Else -> 'approved'
    const nextStatus = (ticket.budget > 5000000 && ticket.status === 'pending') ? 'bm' : 'approved';

    const updated = await db.updateTicketStatus(id, nextStatus, approver_id, notes);

    simulateWebhook("TICKET_APPROVED", {
      ticket_id: id,
      approver_id,
      notes,
      new_status: nextStatus
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tickets/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { approver_id, notes } = req.body;
    if (!notes) return res.status(400).json({ error: "Alasan penolakan wajib diisi!" });

    const updated = await db.updateTicketStatus(id, 'rejected', approver_id, notes);

    simulateWebhook("TICKET_REJECTED", {
      ticket_id: id,
      approver_id,
      reason: notes
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tickets/:id/override', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    if (!status) return res.status(400).json({ error: "Status wajib diisi!" });

    const updated = await db.adminOverrideTicket(id, status, notes);

    simulateWebhook("TICKET_ADMIN_OVERRIDE", {
      ticket_id: id,
      forced_status: status,
      notes
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tickets/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { user, role, msg } = req.body;
    if (!user || !msg) return res.status(400).json({ error: "User dan pesan wajib diisi!" });

    const updated = await db.addTicketComment(id, user, role, msg);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tickets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteTicket(id);
    res.json({ success: true, message: `Tiket ${id} berhasil dihapus.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CSV EXPORT FOR TICKETS
app.get('/api/tickets/export-csv', async (req, res) => {
  try {
    const tickets = await db.getTickets(req.user);
    
    // Construct CSV Header
    let csv = 'ID Tiket,Pemohon,Departemen,Cabang,Jenis,Deskripsi,Budget,Status,Tanggal Dibuat,Detail Pengajuan\n';
    
    tickets.forEach(t => {
      const detailStr = JSON.stringify(t.detail).replace(/"/g, '""');
      csv += `"${t.id}","${t.user_name}","${t.user_dept}","${t.user_branch}","${t.type}","${t.description.replace(/"/g, '""')}",${t.budget},"${t.status}","${t.date_created}","${detailStr}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=ga_tickets_report.csv');
    res.status(200).send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MASTER ASSETS
app.get('/api/assets', async (req, res) => {
  try {
    const assets = await db.getAssets();
    res.json(assets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/assets', async (req, res) => {
  try {
    const { code, name, category, condition, status } = req.body;
    if (!code || !name || !category) {
      return res.status(400).json({ error: "Kode, nama, dan kategori aset wajib diisi!" });
    }
    const newAsset = await db.addAsset(code, name, category, condition || 'Baik', status || 'Tersedia');
    res.status(201).json(newAsset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/assets/:id', async (req, res) => {
  try {
    const assetId = req.params.id;
    const updated = await db.updateAsset(assetId, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/assets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteAsset(id);
    res.json({ success: true, message: `Aset ${id} berhasil dihapus.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SLOTS (ROOMS & VEHICLES)
app.get('/api/slots', async (req, res) => {
  try {
    const slots = await db.getSlots();
    res.json(slots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/slots/book', async (req, res) => {
  try {
    const { category, item_name, slot_key, ticket_id } = req.body;
    if (!category || !item_name || !slot_key) {
      return res.status(400).json({ error: "Missing slot book parameters" });
    }
    const slot = await db.bookSlot(category, item_name, slot_key, true, ticket_id || null);
    res.json(slot);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/slots/free', async (req, res) => {
  try {
    const { category, item_name, slot_key } = req.body;
    if (!category || !item_name || !slot_key) {
      return res.status(400).json({ error: "Missing slot free parameters" });
    }
    const slot = await db.freeSlot(category, item_name, slot_key);
    res.json(slot);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`[SERVER] Express Server is running on http://localhost:${PORT}`);
});
