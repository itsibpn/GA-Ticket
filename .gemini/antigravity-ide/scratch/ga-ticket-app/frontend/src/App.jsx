import React, { useState, useEffect } from 'react';

// API Base URL
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : '/api';

const typeIcon = { hotel: 'ti-building', pesawat: 'ti-plane', alat: 'ti-tool', kendaraan: 'ti-car', zoom: 'ti-video', meeting: 'ti-door', aset: 'ti-box' };
const typeName = { hotel: 'Hotel', pesawat: 'Pesawat', alat: 'Alat', kendaraan: 'Kendaraan', zoom: 'Zoom', meeting: 'Meeting' };

export default function App() {
  // --- SECURE AUTHENTICATION STATES ---
  const [sessionToken, setSessionToken] = useState(localStorage.getItem('ga_session_token') || '');
  const [currentUser, setCurrentUser] = useState(null);
  
  // Login Form input states
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // --- DATA STATES ---
  const [users, setUsers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [assets, setAssets] = useState([]);
  const [slots, setSlots] = useState([]);
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    activeTickets: 0, pendingTickets: 0, approvedThisMonth: 0, remainingBudget: 0, allocatedBudget: 40000000.00, avgSlaDays: "1.2", recentTickets: []
  });

  // UI Navigation & View States
  const [currentTab, setCurrentTab] = useState('dash');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifUnread, setNotifUnread] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [darkMode, setDarkMode] = useState(false);

  // Filters for Ticket List
  const [statusFilter, setStatusFilter] = useState('semua');
  const [typeFilter, setTypeFilter] = useState('');

  // Selected Ticket in Side Panel
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [newComment, setNewComment] = useState('');

  // Multi-step form state (Buat Tiket)
  const [formStep, setFormStep] = useState(0);
  const [ticketType, setTicketType] = useState('hotel');
  const [formData, setFormData] = useState({});
  const [isFormValid, setIsFormValid] = useState(true);
  const [ktpAttached, setKtpAttached] = useState(false);

  // Modals & Action States
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState({ action: '', ticketId: '' });
  const [modalNote, setModalNote] = useState('');
  
  // Asset Management Form (Admin)
  const [newAssetCode, setNewAssetCode] = useState('');
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetCat, setNewAssetCat] = useState('Elektronik');
  const [showBarcodePrint, setShowBarcodePrint] = useState(null);

  // User Management Form (Admin)
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('employee');
  const [newUserBranch, setNewUserBranch] = useState('Balikpapan');
  const [newUserDept, setNewUserDept] = useState('Marketing');

  // Budget Allocation state
  const [editBudgetCapId, setEditBudgetCapId] = useState(null);
  const [editBudgetAllocated, setEditBudgetAllocated] = useState('');

  // --- TOAST NOTIFICATIONS HELPER ---
  const addToast = (type, msg, icon = 'ti-info-circle') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, msg, icon }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, bye: true } : t));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 300);
    }, 4000);
  };

  // --- CENTRALIZED SECURE API FETCH WRAPPER ---
  const apiFetch = async (endpoint, options = {}) => {
    // Inject Authorization Header dynamically
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const res = await fetch(endpoint, config);
      
      // Auto-handle Session Expiry/Revocation (401 Unauthorized)
      if (res.status === 401) {
        localStorage.removeItem('ga_session_token');
        setSessionToken('');
        setCurrentUser(null);
        addToast('err', 'Sesi Anda telah berakhir, silakan login kembali.', 'ti-lock');
        throw new Error('Unauthorized');
      }

      return res;
    } catch (err) {
      if (err.message !== 'Unauthorized') {
        console.error('API Fetch Error:', err);
      }
      throw err;
    }
  };

  // --- AUTHENTICATION FLOWS ---

  // Check and Verify Session on Mount
  useEffect(() => {
    const verifyActiveSession = async () => {
      if (!sessionToken) return;
      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        });
        if (res.ok) {
          const profile = await res.json();
          setCurrentUser(profile);
        } else {
          // Token expired or invalid
          localStorage.removeItem('ga_session_token');
          setSessionToken('');
          setCurrentUser(null);
        }
      } catch (err) {
        console.error('Session verification failed:', err);
      }
    };

    verifyActiveSession();
  }, [sessionToken]);

  // Login handler
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) {
      setLoginError('Harap isi Email dan Password!');
      return;
    }

    setLoginError('');
    setIsLoggingIn(true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, password: passwordInput })
      });

      const data = await res.json();
      setIsLoggingIn(false);

      if (res.ok) {
        localStorage.setItem('ga_session_token', data.token);
        setSessionToken(data.token);
        setCurrentUser(data.user);
        addToast('ok', `Selamat datang kembali, ${data.user.name}!`, 'ti-user-check');
        setEmailInput('');
        setPasswordInput('');
        setFormStep(0);
        setCurrentTab('dash');
      } else {
        setLoginError(data.error || 'Terjadi kesalahan sistem saat masuk.');
      }
    } catch (err) {
      setIsLoggingIn(false);
      setLoginError('Koneksi backend gagal! Pastikan server Express aktif.');
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
    } catch (err) {}

    localStorage.removeItem('ga_session_token');
    setSessionToken('');
    setCurrentUser(null);
    addToast('warn', 'Anda berhasil keluar dari sistem.', 'ti-logout');
  };

  // --- FETCH ALL APPLICATION DATA ---
  const fetchAllData = async () => {
    if (!sessionToken) return;
    try {
      const usersRes = await apiFetch(`${API_URL}/users`);
      const usersData = await usersRes.json();
      setUsers(usersData);

      const ticketsRes = await apiFetch(`${API_URL}/tickets`);
      const ticketsData = await ticketsRes.json();
      setTickets(ticketsData);

      const budgetsRes = await apiFetch(`${API_URL}/budgets`);
      const budgetsData = await budgetsRes.json();
      setBudgets(budgetsData);

      const assetsRes = await apiFetch(`${API_URL}/assets`);
      const assetsData = await assetsRes.json();
      setAssets(assetsData);

      const slotsRes = await apiFetch(`${API_URL}/slots`);
      const slotsData = await slotsRes.json();
      setSlots(slotsData);

      const dashRes = await apiFetch(`${API_URL}/dashboard`);
      const dashData = await dashRes.json();
      setDashboardStats(dashData);

      const whRes = await apiFetch(`${API_URL}/webhook/logs`);
      const whData = await whRes.json();
      setWebhookLogs(whData);

    } catch (err) {
      // Handled by interceptor
    }
  };

  useEffect(() => {
    if (sessionToken) {
      fetchAllData();
    }
  }, [sessionToken]);

  // Update remaining budget dynamic displays when currentUser changes
  useEffect(() => {
    if (currentUser && budgets.length) {
      const myBudget = budgets.find(b => b.department === currentUser.department && b.branch === currentUser.branch);
      if (myBudget) {
        setDashboardStats(prev => ({
          ...prev,
          remainingBudget: myBudget.allocated_budget - myBudget.used_budget,
          allocatedBudget: myBudget.allocated_budget
        }));
      }
    }
  }, [currentUser, budgets]);

  // Handle Search Input
  const handleSearch = (val) => {
    setSearchQuery(val);
    if (!val || val.length < 2) {
      setSearchResults([]);
      return;
    }
    const ticketHits = tickets.filter(t => t.id.toLowerCase().includes(val.toLowerCase()) || t.description.toLowerCase().includes(val.toLowerCase()));
    const assetHits = assets.filter(a => a.code.toLowerCase().includes(val.toLowerCase()) || a.name.toLowerCase().includes(val.toLowerCase()));
    
    const combined = [
      ...ticketHits.map(t => ({ id: t.id, type: t.type, desc: t.description, kind: 'ticket' })),
      ...assetHits.map(a => ({ id: a.code, type: 'aset', desc: a.name, kind: 'asset' }))
    ];
    setSearchResults(combined.slice(0, 5));
  };

  const handleSearchResultClick = (hit) => {
    setSearchQuery('');
    setSearchResults([]);
    if (hit.kind === 'asset') {
      setCurrentTab('aset');
    } else {
      setCurrentTab('tiket');
      setSelectedTicketId(hit.id);
    }
  };

  // Toggle Dark Mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.body.classList.toggle('dark-mode');
  };

  // --- WORKFLOW SUBMISSION & ACTIONS ---
  const handleCreateTicket = async (status = 'pending') => {
    if (status !== 'draft') {
      let missingFields = false;
      const fields = formConfig[ticketType].fields;
      fields.forEach(f => {
        if (f.req && !formData[f.id]) missingFields = true;
      });
      if (missingFields) {
        setIsFormValid(false);
        addToast('warn', 'Harap lengkapi semua field yang wajib diisi!', 'ti-alert-circle');
        return;
      }
    }

    const ticketId = 'TKT-2024-' + Math.floor(100 + Math.random() * 900);
    const budgetVal = parseFloat(formData.budget) || 0;
    
    const deptCap = budgets.find(b => b.department === currentUser.department && b.branch === currentUser.branch);
    if (status !== 'draft' && deptCap && budgetVal > 0) {
      const sisa = deptCap.allocated_budget - deptCap.used_budget;
      if (budgetVal > sisa) {
        addToast('err', `Gagal! Sisa alokasi budget ${currentUser.department} tidak mencukupi (Sisa: Rp ${sisa.toLocaleString('id-ID')})`, 'ti-ban');
        return;
      }
    }

    const desc = ticketType === 'hotel' ? `Hotel ${formData.hotel || ''}, ${formData.tamu || 1} orang`
               : ticketType === 'pesawat' ? `${formData.dari || ''} → ${formData.ke || ''}, ${formData.tgl || ''}`
               : ticketType === 'alat' ? `Pinjam ${formData.aset || ''} - ${formData.tujuan || ''}`
               : ticketType === 'kendaraan' ? `Booking ${formData.kend || ''} ke ${formData.tujuan || ''}`
               : ticketType === 'zoom' ? `Meeting zoom: ${formData.topik || ''}`
               : `Ruang: ${formData.ruang || ''} - ${formData.acara || ''}`;

    try {
      const endpoint = status === 'draft' ? `${API_URL}/tickets/draft` : `${API_URL}/tickets`;
      const res = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          id: ticketId,
          user_id: currentUser.id,
          type: ticketType,
          description: desc,
          budget: budgetVal,
          detail: formData
        })
      });

      if (res.ok) {
        addToast('ok', status === 'draft' ? 'Draft tiket berhasil disimpan!' : 'Tiket berhasil dikirim! Menunggu approval.', 'ti-check');
        fetchAllData();
        setCurrentTab('tiket');
        setFormStep(0);
        setFormData({});
        setKtpAttached(false);
      } else {
        const errorData = await res.json();
        addToast('err', errorData.error || 'Gagal menyimpan tiket.', 'ti-x');
      }
    } catch (err) {}
  };

  const handleApprovalAction = async (action, ticketId) => {
    setModalAction({ action, ticketId });
    setModalNote('');
    setShowModal(true);
  };

  const submitModalAction = async () => {
    const { action, ticketId } = modalAction;
    if (action === 'reject' && !modalNote.trim()) {
      addToast('warn', 'Alasan penolakan wajib diisi!', 'ti-alert-circle');
      return;
    }

    try {
      const endpoint = `${API_URL}/tickets/${ticketId}/${action === 'approve' ? 'approve' : 'reject'}`;
      const res = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          approver_id: currentUser.id,
          notes: modalNote
        })
      });

      if (res.ok) {
        addToast(action === 'approve' ? 'ok' : 'err', `Tiket ${ticketId} berhasil ${action === 'approve' ? 'disetujui' : 'ditolak'}.`, action === 'approve' ? 'ti-check' : 'ti-x');
        setShowModal(false);
        fetchAllData();
        setSelectedTicketId(null);
      }
    } catch (err) {}
  };

  const handleAdminOverride = async (ticketId, forcedStatus) => {
    const notes = prompt("Masukkan catatan override admin (wajib):");
    if (!notes) return;

    try {
      const res = await apiFetch(`${API_URL}/tickets/${ticketId}/override`, {
        method: 'POST',
        body: JSON.stringify({
          status: forcedStatus,
          notes: notes
        })
      });

      if (res.ok) {
        addToast('ok', `Admin sukses memaksa status tiket ke ${forcedStatus.toUpperCase()}`, 'ti-shield');
        fetchAllData();
        setSelectedTicketId(null);
      }
    } catch (err) {}
  };

  const handleAdminDeleteTicket = async (ticketId) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus permanen tiket ${ticketId}?`)) return;

    try {
      const res = await apiFetch(`${API_URL}/tickets/${ticketId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        addToast('err', `Tiket ${ticketId} berhasil dihapus permanen.`, 'ti-trash');
        fetchAllData();
        setSelectedTicketId(null);
      }
    } catch (err) {}
  };

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const res = await apiFetch(`${API_URL}/tickets/${selectedTicketId}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          user: currentUser.name,
          role: currentUser.role,
          msg: newComment
        })
      });

      if (res.ok) {
        setNewComment('');
        fetchAllData();
      }
    } catch (err) {}
  };

  // Add Asset (Admin)
  const handleAddAsset = async (e) => {
    e.preventDefault();
    if (!newAssetCode || !newAssetName) {
      addToast('warn', 'Kode dan Nama aset wajib diisi!', 'ti-alert');
      return;
    }

    try {
      const res = await apiFetch(`${API_URL}/assets`, {
        method: 'POST',
        body: JSON.stringify({
          code: newAssetCode,
          name: newAssetName,
          category: newAssetCat
        })
      });

      if (res.ok) {
        addToast('ok', 'Aset baru berhasil ditambahkan!', 'ti-box');
        setNewAssetCode('');
        setNewAssetName('');
        fetchAllData();
      }
    } catch (err) {}
  };

  // Update Asset Condition / Status (Admin)
  const handleUpdateAsset = async (id, condition, status) => {
    try {
      const res = await apiFetch(`${API_URL}/assets/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ condition, status })
      });

      if (res.ok) {
        addToast('ok', 'Status aset berhasil diperbarui.', 'ti-box');
        fetchAllData();
      }
    } catch (err) {}
  };

  const handleDeleteAsset = async (id) => {
    if (!confirm("Hapus aset ini secara permanen?")) return;
    try {
      const res = await apiFetch(`${API_URL}/assets/${id}`, { method: 'DELETE' });
      if (res.ok) {
        addToast('err', 'Aset berhasil dihapus.', 'ti-trash');
        fetchAllData();
      }
    } catch (err) {}
  };

  // Add New User (Admin)
  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) {
      addToast('warn', 'Nama dan Email wajib diisi!', 'ti-alert-circle');
      return;
    }

    try {
      const res = await apiFetch(`${API_URL}/users`, {
        method: 'POST',
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          role: newUserRole,
          branch: newUserBranch,
          department: newUserDept
        })
      });

      if (res.ok) {
        addToast('ok', `User baru ${newUserName} berhasil dibuat! Password default: password123`, 'ti-user-plus');
        setNewUserName('');
        setNewUserEmail('');
        fetchAllData();
      }
    } catch (err) {}
  };

  // Change user role dynamically (Admin)
  const handleChangeUserRole = async (userId, newRole) => {
    try {
      const res = await apiFetch(`${API_URL}/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole })
      });

      if (res.ok) {
        addToast('ok', `Berhasil mengubah role pengguna ke ${newRole.toUpperCase()}!`, 'ti-refresh');
        fetchAllData();
      }
    } catch (err) {}
  };

  const handleDeleteUser = async (userId) => {
    if (currentUser && currentUser.id === userId) {
      addToast('warn', 'Anda tidak dapat menghapus akun Anda sendiri!', 'ti-ban');
      return;
    }
    if (!confirm("Hapus akun pengguna ini secara permanen?")) return;

    try {
      const res = await apiFetch(`${API_URL}/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        addToast('err', 'Akun pengguna berhasil dihapus.', 'ti-user-minus');
        fetchAllData();
      }
    } catch (err) {}
  };

  // Update budget caps (Admin)
  const handleUpdateBudgetCap = async (id, allocated, used) => {
    try {
      const res = await apiFetch(`${API_URL}/budgets/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ allocated_budget: allocated, used_budget: used })
      });

      if (res.ok) {
        addToast('ok', 'Alokasi cap budget diperbarui!', 'ti-coin');
        setEditBudgetCapId(null);
        fetchAllData();
      }
    } catch (err) {}
  };

  // Slot calendar booking
  const handleBookSlot = async (category, itemName, slotKey) => {
    const match = slots.find(s => s.category === category && s.item_name === itemName && s.slot_key === slotKey);
    if (match && match.is_booked) {
      if (currentUser.role === 'admin') {
        if (confirm(`Admin Override: Bebaskan booking slot ini?`)) {
          try {
            const res = await apiFetch(`${API_URL}/slots/free`, {
              method: 'POST',
              body: JSON.stringify({ category, item_name: itemName, slot_key: slotKey })
            });
            if (res.ok) {
              addToast('ok', 'Booking slot dilepas oleh Admin.', 'ti-calendar-check');
              fetchAllData();
            }
          } catch (err) {}
        }
      } else {
        addToast('warn', 'Slot ini sudah dibooking!', 'ti-calendar-off');
      }
      return;
    }

    try {
      const res = await apiFetch(`${API_URL}/slots/book`, {
        method: 'POST',
        body: JSON.stringify({
          category,
          item_name: itemName,
          slot_key: slotKey
        })
      });

      if (res.ok) {
        addToast('ok', 'Slot berhasil dipesan! Silakan lanjutkan isi tiket pengajuan.', 'ti-calendar-check');
        fetchAllData();
      }
    } catch (err) {}
  };

  const handleExportCSV = () => {
    // CSV export requires bearing authorization header, but window.open does not support headers.
    // So we fetch the CSV as blob with the token and download it securely client-side! This is 100% SECURE.
    apiFetch(`${API_URL}/tickets/export-csv`)
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ga_tickets_report.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        addToast('ok', 'Ekspor CSV berhasil diunduh secara aman.', 'ti-file-spreadsheet');
      })
      .catch(err => {
        addToast('err', 'Gagal mengekspor CSV.', 'ti-x');
      });
  };

  const ticketDetailObj = tickets.find(t => t.id === selectedTicketId);

  // --- WIZARD CONFIG ---
  const formConfig = {
    hotel: {
      fields: [
        { id: 'hotel', label: 'Nama Hotel', type: 'text', placeholder: 'cth: Aston Makassar', req: true },
        { id: 'checkin', label: 'Tanggal Check-in', type: 'date', req: true },
        { id: 'checkout', label: 'Tanggal Check-out', type: 'date', req: true },
        { id: 'tamu', label: 'Jumlah Tamu', type: 'number', placeholder: '1', req: true },
        { id: 'budget', label: 'Estimasi Budget', type: 'budget', req: true },
        { id: 'catatan', label: 'Catatan Keperluan', type: 'textarea', full: true }
      ]
    },
    pesawat: {
      fields: [
        { id: 'dari', label: 'Kota Asal', type: 'text', placeholder: 'Jakarta (CGK)', req: true },
        { id: 'ke', label: 'Kota Tujuan', type: 'text', placeholder: 'Balikpapan (BPN)', req: true },
        { id: 'tgl', label: 'Tanggal Berangkat', type: 'date', req: true },
        { id: 'balik', label: 'Tanggal Pulang (PP)', type: 'date' },
        { id: 'budget', label: 'Estimasi Budget', type: 'budget', req: true },
        { id: 'maskapai', label: 'Maskapai Preferensi', type: 'select', opts: ['Tidak ada preferensi', 'Garuda Indonesia', 'Lion Air', 'Batik Air'] },
        { id: 'ktp', label: 'Lampiran KTP', type: 'upload', full: true, req: true }
      ]
    },
    alat: {
      fields: [
        { id: 'aset', label: 'Kode / Nama Aset', type: 'text', placeholder: 'cth: BPN-AST-0001 (Laptop)', req: true },
        { id: 'mulai', label: 'Tanggal Pinjam', type: 'date', req: true },
        { id: 'kembali', label: 'Tanggal Kembali', type: 'date', req: true },
        { id: 'tujuan', label: 'Tujuan Penggunaan', type: 'textarea', full: true, req: true }
      ]
    },
    kendaraan: {
      fields: [
        { id: 'kend', label: 'Pilih Kendaraan', type: 'select', opts: ['Toyota Avanza B-1234-AB', 'Honda Jazz B-5678-CD', 'Toyota Innova B-9012-EF', 'Honda Beat B-3456-GH'], req: true },
        { id: 'supir', label: 'Kebutuhan Supir', type: 'select', opts: ['Tidak perlu', 'Perlu supir'] },
        { id: 'mulai', label: 'Tanggal Mulai', type: 'date', req: true },
        { id: 'selesai', label: 'Tanggal Selesai', type: 'date', req: true },
        { id: 'tujuan', label: 'Tujuan Perjalanan', type: 'text', placeholder: 'cth: Bandara Sepinggan', req: true, full: true }
      ]
    },
    zoom: {
      fields: [
        { id: 'topik', label: 'Topik Meeting', type: 'text', placeholder: 'cth: Review Anggaran Q1', req: true, full: true },
        { id: 'tgl', label: 'Tanggal', type: 'date', req: true },
        { id: 'jam', label: 'Jam Mulai', type: 'time' },
        { id: 'durasi', label: 'Durasi (menit)', type: 'number', placeholder: '60' },
        { id: 'peserta', label: 'Jumlah Peserta', type: 'number', placeholder: '10' },
        { id: 'agenda', label: 'Agenda Meeting', type: 'textarea', full: true }
      ]
    },
    meeting: {
      fields: [
        { id: 'ruang', label: 'Pilih Ruangan', type: 'select', opts: ['Ruang Rapat A (Kap. 10)', 'Ruang Rapat B (Kap. 20)', 'Ruang Direksi (Kap. 8)', 'Aula Utama (Kap. 50)'], req: true },
        { id: 'tgl', label: 'Tanggal', type: 'date', req: true },
        { id: 'mulai', label: 'Jam Mulai', type: 'time' },
        { id: 'selesai', label: 'Jam Selesai', type: 'time' },
        { id: 'acara', label: 'Nama Acara / Rapat', type: 'text', req: true, full: true },
        { id: 'peserta', label: 'Jumlah Peserta', type: 'number' },
        { id: 'peralatan', label: 'Peralatan Tambahan', type: 'select', opts: ['Tidak ada', 'Proyektor', 'Proyektor + Sound', 'Video Conference Kit'] }
      ]
    }
  };

  const handleFormFieldChange = (id, val) => {
    setFormData(prev => ({ ...prev, [id]: val }));
    setIsFormValid(true);
  };

  const handleFakeUpload = (id) => {
    setKtpAttached(true);
    setFormData(prev => ({ ...prev, [id]: 'KTP_Andi_Setiawan.pdf (1.2 MB)' }));
    addToast('ok', 'File KTP berhasil dilampirkan!', 'ti-file-check');
  };

  const deptCapObj = currentUser ? budgets.find(b => b.department === currentUser.department && b.branch === currentUser.branch) : null;
  const budgetVal = parseFloat(formData.budget) || 0;
  const sisaBudget = deptCapObj ? deptCapObj.allocated_budget - deptCapObj.used_budget : 0;
  const budgetPercentage = deptCapObj ? Math.min(100, Math.round((budgetVal / sisaBudget) * 100)) : 0;
  const budgetBarColor = budgetVal > sisaBudget ? 'var(--red)' : budgetVal > 5000000 ? 'var(--amb)' : 'var(--grn)';

  const isSuperAdmin = currentUser && currentUser.role === 'admin';
  const isManagerOrBM = currentUser && ['manager', 'bm', 'admin'].includes(currentUser.role);

  // --- RENDERING VIEWS ---

  // 1. SECURE LOGIN SCREEN VIEW
  if (!sessionToken || !currentUser) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo-container">
              <span className="login-logo-icon"><i className="ti ti-shield-lock" aria-hidden="true"></i></span>
              <h1 className="login-logo">GA<b>Ticket</b></h1>
            </div>
            <p className="login-sub">Sistem Informasi Otorisasi & Pengajuan Tiket GA</p>
            <p className="login-desc">Silakan masukkan e-mail perusahaan dan kata sandi untuk mengakses layanan operasional kantor.</p>
          </div>

          <form onSubmit={handleLoginSubmit}>
            {loginError && (
              <div className="login-alert">
                <i className="ti ti-alert-triangle" aria-hidden="true"></i>
                <span>{loginError}</span>
              </div>
            )}

            <div className="login-input-wrap">
              <i className="ti ti-mail prefix-icon" aria-hidden="true"></i>
              <input 
                type="email" 
                placeholder="Email Perusahaan" 
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="login-input-wrap">
              <i className="ti ti-lock prefix-icon" aria-hidden="true"></i>
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder="Kata Sandi" 
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button 
                type="button" 
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Sembunyikan Sandi' : 'Tampilkan Sandi'}
              >
                <i className={`ti ${showPassword ? 'ti-eye-off' : 'ti-eye'}`} aria-hidden="true"></i>
              </button>
            </div>

            <button className="btn btn-primary btn-login" type="submit" disabled={isLoggingIn}>
              {isLoggingIn ? (
                <>
                  <i className="ti ti-loader animate-spin" aria-hidden="true"></i>
                  <span>Memverifikasi Akses...</span>
                </>
              ) : (
                <>
                  <i className="ti ti-login" aria-hidden="true"></i>
                  <span>Masuk ke Portal</span>
                </>
              )}
            </button>
          </form>

          <div className="login-footer">
            <span className="login-footer-text">
              <i className="ti ti-info-circle" aria-hidden="true"></i> 
              Lupa kata sandi atau butuh bantuan akses? Silakan hubungi <b>Administrator General Affairs</b>.
            </span>
          </div>
        </div>

        {/* Dynamic toasts inside login */}
        <div className="toast-stack">
          {toasts.map(t => (
            <div className={`toast ${t.type} ${t.bye ? 'bye' : ''}`} key={t.id}>
              <i className={`ti ${t.icon}`} aria-hidden="true"></i>
              <span style={{ flex: 1 }}>{t.msg}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. MAIN LOGGED-IN PORTAL VIEW
  return (
    <div className="app">
      {/* --- TOPBAR --- */}
      <div className="topbar">
        <div className="logo">GA<b>Ticket</b></div>
        
        {/* Global Search */}
        <div className="search-wrap">
          <i className="ti ti-search" aria-hidden="true"></i>
          <input 
            className="search-input" 
            placeholder="Cari nomor tiket, aset, pemohon..." 
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map(hit => (
                <div key={hit.id} className="search-item" onClick={() => handleSearchResultClick(hit)}>
                  <i className={`ti ${typeIcon[hit.type] || 'ti-ticket'}`} aria-hidden="true" style={{ color: 'var(--mu)' }}></i>
                  <span className="s-num">{hit.id}</span>
                  <span style={{ color: 'var(--mu)', textTransform: 'capitalize' }}>{hit.desc} ({hit.type})</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Topbar Right elements */}
        <div className="topbar-r">
          {/* Dark Mode switch */}
          <button className="theme-toggle-btn" onClick={toggleDarkMode} title="Toggle Tema">
            <i className={`ti ${darkMode ? 'ti-sun' : 'ti-moon'}`} style={{ fontSize: '18px' }} aria-hidden="true"></i>
          </button>

          {/* Notifications */}
          <button className="notif-btn" onClick={() => { setShowNotifPanel(!showNotifPanel); setNotifUnread(false); }} aria-label="Notifikasi">
            <i className="ti ti-bell" style={{ fontSize: '18px' }} aria-hidden="true"></i>
            {notifUnread && <span className="notif-dot"></span>}
          </button>
          
          {showNotifPanel && (
            <div className="notif-panel">
              <div className="notif-hd">
                <span>Notifikasi Baru</span>
                <button className="btn btn-sm" onClick={() => { setNotifUnread(false); setShowNotifPanel(false); }}>Tandai Dibaca</button>
              </div>
              <div className="notif-item unread" onClick={() => { setShowNotifPanel(false); setCurrentTab('tiket'); setSelectedTicketId('TKT-2024-0147'); }}>
                <div className="notif-title">Tiket baru menunggu persetujuan</div>
                <div className="notif-body">TKT-2024-0147 — Tiket Pesawat oleh Andi S.</div>
                <div className="notif-time">5 menit lalu</div>
              </div>
              <div className="notif-item unread" onClick={() => { setShowNotifPanel(false); setCurrentTab('tiket'); setSelectedTicketId('TKT-2024-0146'); }}>
                <div className="notif-title">Budget melebihi batas — BM review</div>
                <div className="notif-body">TKT-2024-0146 — Hotel Makassar Rp 6,2 jt</div>
                <div className="notif-time">1 jam lalu</div>
              </div>
            </div>
          )}

          {/* Current User Badge */}
          <span className="role-badge">{currentUser.role === 'bm' ? 'Branch Manager' : currentUser.role}</span>
          <div className="avatar" title={currentUser.name}>{currentUser.avatar_initials}</div>
          
          {/* Logout Button */}
          <button className="btn btn-sm btn-no" onClick={handleLogout} title="Keluar"><i className="ti ti-logout" aria-hidden="true"></i> Logout</button>
        </div>
      </div>

      {/* --- SIDEBAR NAV --- */}
      <div className="sidebar">
        <div className="nav-sec">
          <div className={`nav-item ${currentTab === 'dash' ? 'active' : ''}`} onClick={() => { setCurrentTab('dash'); fetchAllData(); }}><i className="ti ti-layout-dashboard" aria-hidden="true"></i>Dashboard</div>
          <div className={`nav-item ${currentTab === 'buat' ? 'active' : ''}`} onClick={() => { setCurrentTab('buat'); setFormStep(0); setFormData({}); setKtpAttached(false); }}><i className="ti ti-plus-circle" aria-hidden="true"></i>Buat Tiket Baru</div>
        </div>

        <div className="nav-sec">
          <div className="nav-lbl">Tiket Saya</div>
          <div className={`nav-item ${currentTab === 'tiket' ? 'active' : ''}`} onClick={() => { setCurrentTab('tiket'); fetchAllData(); }}><i className="ti ti-ticket" aria-hidden="true"></i>Semua Tiket</div>
          <div className={`nav-item ${currentTab === 'draft' ? 'active' : ''}`} onClick={() => setCurrentTab('draft')}><i className="ti ti-pencil" aria-hidden="true"></i>Draft</div>
        </div>

        {isManagerOrBM && (
          <div className="nav-sec">
            <div className="nav-lbl">Persetujuan</div>
            <div className={`nav-item ${currentTab === 'appr' ? 'active' : ''}`} onClick={() => setCurrentTab('appr')}>
              <i className="ti ti-checks" aria-hidden="true"></i>Approve Tiket
              {tickets.filter(t => t.status === (currentUser.role === 'bm' ? 'bm' : 'pending')).length > 0 && (
                <span className="nav-badge new">{tickets.filter(t => t.status === (currentUser.role === 'bm' ? 'bm' : 'pending')).length}</span>
              )}
            </div>
            <div className={`nav-item ${currentTab === 'riwayat' ? 'active' : ''}`} onClick={() => setCurrentTab('riwayat')}><i className="ti ti-history" aria-hidden="true"></i>Riwayat Approval</div>
          </div>
        )}

        <div className="nav-sec">
          <div className="nav-lbl">Operasional GA</div>
          <div className={`nav-item ${currentTab === 'aset' ? 'active' : ''}`} onClick={() => setCurrentTab('aset')}><i className="ti ti-box" aria-hidden="true"></i>Master Aset</div>
          <div className={`nav-item ${currentTab === 'jadwal' ? 'active' : ''}`} onClick={() => setCurrentTab('jadwal')}><i className="ti ti-calendar" aria-hidden="true"></i>Jadwal & Slot</div>
          {isSuperAdmin && (
            <div className={`nav-item ${currentTab === 'laporan' ? 'active' : ''}`} onClick={() => setCurrentTab('laporan')}><i className="ti ti-chart-bar" aria-hidden="true"></i>Laporan Analitik</div>
          )}
        </div>

        {isSuperAdmin && (
          <div className="nav-sec">
            <div className="nav-lbl">Super Admin Control</div>
            <div className={`nav-item ${currentTab === 'user-mgmt' ? 'active' : ''}`} onClick={() => setCurrentTab('user-mgmt')}><i className="ti ti-users" aria-hidden="true"></i>Manajemen User</div>
            <div className={`nav-item ${currentTab === 'budget-mgmt' ? 'active' : ''}`} onClick={() => setCurrentTab('budget-mgmt')}><i className="ti ti-wallet" aria-hidden="true"></i>Alokasi Budget</div>
            <div className={`nav-item ${currentTab === 'webhook' ? 'active' : ''}`} onClick={() => setCurrentTab('webhook')}><i className="ti ti-webhook" aria-hidden="true"></i>Webhook Logs</div>
          </div>
        )}
      </div>

      {/* --- MAIN MAIN AREA --- */}
      <div className="main">

        {/* --- 1. DASHBOARD TAB --- */}
        {currentTab === 'dash' && (
          <div className="page-view animate">
            <div className="pg-hd">
              <div>
                <h1 className="pg-title">Dashboard</h1>
                <div className="pg-sub">Selamat pagi, {currentUser.name} · Cabang {currentUser.branch} ({currentUser.department})</div>
              </div>
              <button className="btn btn-primary" onClick={() => setCurrentTab('buat')}><i className="ti ti-plus" aria-hidden="true"></i>Tiket Baru</button>
            </div>

            {/* Statistics Row */}
            <div className="stat-grid">
              <div className="stat">
                <div className="stat-lbl">Tiket Aktif</div>
                <div className="stat-val" style={{ color: 'var(--blu)' }}>{dashboardStats.activeTickets}</div>
                <div className="stat-delta">↑ 2 minggu ini</div>
              </div>
              <div className="stat">
                <div className="stat-lbl">Menunggu Tindakan</div>
                <div className="stat-val" style={{ color: 'var(--amb)' }}>{dashboardStats.pendingTickets}</div>
                <div className="stat-delta">Butuh persetujuan Anda</div>
              </div>
              <div className="stat">
                <div className="stat-lbl">Disetujui Bulan Ini</div>
                <div className="stat-val" style={{ color: 'var(--grn)' }}>{dashboardStats.approvedThisMonth}</div>
                <div className="stat-delta">Tingkat SLA {dashboardStats.avgSlaDays <= 2 ? 'Kepatuhan 98%' : 'Perlu evaluasi'}</div>
              </div>
              <div className="stat">
                <div className="stat-lbl">Sisa Alokasi Anggaran</div>
                <div className="stat-val" style={{ fontSize: '18px', fontWeight: 'bold' }}>Rp {dashboardStats.remainingBudget.toLocaleString('id-ID')}</div>
                <div className="stat-delta">dari Rp {dashboardStats.allocatedBudget.toLocaleString('id-ID')} alokasi {currentUser.department}</div>
              </div>
            </div>

            {/* Charts splits */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '16px', marginBottom: '16px' }}>
              <div className="card">
                <div className="card-hd"><span className="sec-title">Aktivitas Tiket GA — 7 Hari Terakhir</span></div>
                <div className="chart-wrap">
                  <div className="mini-bar">
                    {[
                      { d: 'Sen', n: 4, a: 3 },
                      { d: 'Sel', n: 2, a: 2 },
                      { d: 'Rab', n: 6, a: 5 },
                      { d: 'Kam', n: 3, a: 2 },
                      { d: 'Jum', n: 5, a: 4 },
                      { d: 'Sab', n: 1, a: 0 },
                      { d: 'Min', n: 0, a: 0 }
                    ].map(x => {
                      const max = 8;
                      const hIn = Math.round((x.n / max) * 100);
                      const hOk = Math.round((x.a / max) * 100);
                      return (
                        <div className="bar-grp" key={x.d}>
                          <div className="bar-container">
                            <div className="bar" style={{ height: `${hOk}%`, background: 'var(--grn-bg)', border: '0.5px solid var(--grn-bd)' }} title={`${x.a} Disetujui`}></div>
                            <div className="bar" style={{ height: `${hIn}%`, background: 'var(--blu-bg)', border: '0.5px solid var(--blu-bd)' }} title={`${x.n} Masuk`}></div>
                          </div>
                          <div className="bar-day">{x.d}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-hd"><span className="sec-title">Distribusi Kategori Tiket</span></div>
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { name: 'Hotel', pct: 35, color: 'var(--amb-bd)', bg: 'var(--amb-bg)' },
                    { name: 'Pesawat', pct: 25, color: 'var(--blu-bd)', bg: 'var(--blu-bg)' },
                    { name: 'Peminjaman Alat', pct: 20, color: 'var(--tel-bd)', bg: 'var(--tel-bg)' },
                    { name: 'Kendaraan', pct: 15, color: 'var(--pur-bd)', bg: 'var(--pur-bg)' },
                    { name: 'Lainnya', pct: 5, color: 'var(--bd3)', bg: 'var(--surf2)' }
                  ].map(c => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} key={c.name}>
                      <span style={{ fontSize: '11px', color: 'var(--mu)', width: '90px' }}>{c.name}</span>
                      <div style={{ flex: 1, height: '6px', background: 'var(--surf3)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${c.pct}%`, background: c.color, borderRadius: '3px' }}></div>
                      </div>
                      <span style={{ fontSize: '11.5px', color: 'var(--tx)', width: '32px', textAlign: 'right' }}>{c.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Dashboard Tickets Table */}
            <div className="card">
              <div className="card-hd"><span className="sec-title">Tiket Terbaru</span><button className="btn btn-sm" onClick={() => setCurrentTab('tiket')}>Lihat Semua</button></div>
              <table>
                <colgroup><col style={{ width: '130px' }}/><col style={{ width: '100px' }}/><col/><col style={{ width: '120px' }}/><col style={{ width: '140px' }}/><col style={{ width: '90px' }}/></colgroup>
                <thead>
                  <tr>
                    <th>No. Tiket</th>
                    <th>Jenis</th>
                    <th>Keterangan</th>
                    <th>Estimasi Budget</th>
                    <th>Status</th>
                    <th>Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.slice(0, 5).map(t => (
                    <tr key={t.id} onClick={() => { setCurrentTab('tiket'); setSelectedTicketId(t.id); }}>
                      <td className="mono">{t.id}</td>
                      <td><span className="type-chip"><i className={`ti ${typeIcon[t.type] || 'ti-ticket'}`} aria-hidden="true"></i>{typeName[t.type]}</span></td>
                      <td style={{ color: 'var(--mu)' }}>{t.description}</td>
                      <td>{t.budget > 0 ? 'Rp ' + t.budget.toLocaleString('id-ID') : '—'}</td>
                      <td>
                        <span className={`chip chip-${t.status === 'pending' ? 'pend' : t.status === 'bm' ? 'bm' : t.status === 'approved' ? 'ok' : t.status === 'rejected' ? 'no' : 'draft'}`}>
                          <i className={`ti ${t.status === 'approved' ? 'ti-check' : t.status === 'rejected' ? 'ti-x' : 'ti-clock'}`} aria-hidden="true"></i>
                          {t.status === 'bm' ? 'BM Pending' : t.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--hi)' }}>{t.date_created}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- 2. BUAT TIKET TAB (Multi-Step Form) --- */}
        {currentTab === 'buat' && (
          <div className="page-view animate">
            <div className="pg-hd">
              <div>
                <h1 className="pg-title">Buat Tiket Baru</h1>
                <div className="pg-sub">Formulir dinamis pengajuan kebutuhan operasional General Affairs</div>
              </div>
            </div>

            <div className="prog-bar">
              <div className="prog-step">
                <div className={`prog-dot ${formStep > 0 ? 'done' : formStep === 0 ? 'act' : ''}`}>
                  {formStep > 0 ? <i className="ti ti-check" aria-hidden="true" style={{ fontSize: '11px' }}></i> : 1}
                </div>
                <div className={`prog-lbl ${formStep === 0 ? 'act' : ''}`}>Pilih Kategori</div>
              </div>
              <div className="prog-step">
                <div className={`prog-dot ${formStep > 1 ? 'done' : formStep === 1 ? 'act' : ''}`}>
                  {formStep > 1 ? <i className="ti ti-check" aria-hidden="true" style={{ fontSize: '11px' }}></i> : 2}
                </div>
                <div className={`prog-lbl ${formStep === 1 ? 'act' : ''}`}>Detail Keperluan</div>
              </div>
              <div className="prog-step">
                <div className={`prog-dot ${formStep === 2 ? 'act' : ''}`}>3</div>
                <div className={`prog-lbl ${formStep === 2 ? 'act' : ''}`}>Review & Kirim</div>
              </div>
            </div>

            {/* Step 1: Select Type */}
            {formStep === 0 && (
              <div className="form-section animate">
                <div className="form-section-title"><i className="ti ti-category" aria-hidden="true"></i>Pilih jenis pengajuan</div>
                <div className="type-grid">
                  <div className={`type-btn ${ticketType === 'hotel' ? 'sel' : ''}`} onClick={() => setTicketType('hotel')}><i className="ti ti-building" aria-hidden="true"></i><span>Hotel</span></div>
                  <div className={`type-btn ${ticketType === 'pesawat' ? 'sel' : ''}`} onClick={() => setTicketType('pesawat')}><i className="ti ti-plane" aria-hidden="true"></i><span>Pesawat</span></div>
                  <div className={`type-btn ${ticketType === 'alat' ? 'sel' : ''}`} onClick={() => setTicketType('alat')}><i className="ti ti-tool" aria-hidden="true"></i><span>Peminjaman Aset</span></div>
                  <div className={`type-btn ${ticketType === 'kendaraan' ? 'sel' : ''}`} onClick={() => setTicketType('kendaraan')}><i className="ti ti-car" aria-hidden="true"></i><span>Kendaraan GA</span></div>
                  <div className={`type-btn ${ticketType === 'zoom' ? 'sel' : ''}`} onClick={() => setTicketType('zoom')}><i className="ti ti-video" aria-hidden="true"></i><span>Link Zoom Pro</span></div>
                  <div className={`type-btn ${ticketType === 'meeting' ? 'sel' : ''}`} onClick={() => setTicketType('meeting')}><i className="ti ti-door" aria-hidden="true"></i><span>Ruang Rapat</span></div>
                </div>
                <div className="btn-row">
                  <button className="btn btn-primary" onClick={() => setFormStep(1)}>Lanjut <i className="ti ti-arrow-right" aria-hidden="true"></i></button>
                </div>
              </div>
            )}

            {/* Step 2: Dynamic Fields Form */}
            {formStep === 1 && (
              <div className="animate">
                {['hotel', 'pesawat'].includes(ticketType) && (
                  <div className="info-box info-blue">
                    <i className="ti ti-info-circle" aria-hidden="true"></i>
                    <span>Informasi: Anggaran di atas <strong>Rp 5.000.000</strong> memerlukan verifikasi bertingkat dari Branch Manager (BM) secara otomatis.</span>
                  </div>
                )}
                
                {budgetVal > sisaBudget && (
                  <div className="info-box info-red" style={{ background: 'var(--red-bg)', color: 'var(--red-tx)', borderColor: 'var(--red-bd)' }}>
                    <i className="ti ti-ban" aria-hidden="true"></i>
                    <span><strong>Gagal!</strong> Estimasi budget (Rp {budgetVal.toLocaleString('id-ID')}) melampaui sisa alokasi departemen Anda (Rp {sisaBudget.toLocaleString('id-ID')}). Pengajuan akan diblokir.</span>
                  </div>
                )}

                {budgetVal > 5000000 && budgetVal <= sisaBudget && (
                  <div className="info-box info-amb">
                    <i className="ti ti-alert-triangle" aria-hidden="true"></i>
                    <span><strong>Perhatian:</strong> Budget melebihi batas Rp 5 juta — Tiket akan otomatis diarahkan ke Branch Manager untuk ditinjau.</span>
                  </div>
                )}

                <div className="form-section">
                  <div className="form-section-title"><i className={`ti ${typeIcon[ticketType]}`} aria-hidden="true"></i>Isi detail {typeName[ticketType]}</div>
                  <div className="form-grid">
                    {formConfig[ticketType].fields.map(f => {
                      if (f.type === 'textarea') {
                        return (
                          <div className="form-group full" key={f.id}>
                            <label>{f.label}{f.req && <span className="req">*</span>}</label>
                            <textarea 
                              className={!isFormValid && f.req && !formData[f.id] ? 'err' : ''}
                              value={formData[f.id] || ''} 
                              onChange={(e) => handleFormFieldChange(f.id, e.target.value)} 
                              placeholder={f.placeholder || ''}
                            />
                            {!isFormValid && f.req && !formData[f.id] && <span className="err-msg">Kolom ini wajib diisi</span>}
                          </div>
                        );
                      }
                      
                      if (f.type === 'select') {
                        return (
                          <div className="form-group" key={f.id}>
                            <label>{f.label}{f.req && <span className="req">*</span>}</label>
                            <select 
                              value={formData[f.id] || ''} 
                              onChange={(e) => handleFormFieldChange(f.id, e.target.value)}
                            >
                              <option value="">-- Pilih --</option>
                              {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </div>
                        );
                      }

                      if (f.type === 'budget') {
                        return (
                          <div className="form-group" key={f.id}>
                            <label>{f.label}{f.req && <span className="req">*</span>}</label>
                            <div className="budget-input-wrap">
                              <span className="prefix">Rp</span>
                              <input 
                                type="number" 
                                className={!isFormValid && f.req && !formData[f.id] ? 'err' : ''}
                                value={formData[f.id] || ''} 
                                onChange={(e) => handleFormFieldChange(f.id, e.target.value)}
                                placeholder="0" 
                              />
                            </div>
                            <div className="budget-bar">
                              <div className="budget-fill" style={{ width: `${budgetPercentage}%`, background: budgetBarColor }}></div>
                            </div>
                            {!isFormValid && f.req && !formData[f.id] && <span className="err-msg">Estimasi budget wajib ditentukan</span>}
                          </div>
                        );
                      }

                      if (f.type === 'upload') {
                        return (
                          <div className="form-group full" key={f.id}>
                            <label>{f.label}{f.req && <span className="req">*</span>}</label>
                            <div className={`upload-zone ${ktpAttached ? 'has-file' : ''}`} onClick={() => handleFakeUpload(f.id)}>
                              <i className={`ti ${ktpAttached ? 'ti-file-check' : 'ti-upload'}`} aria-hidden="true"></i>
                              <p>{ktpAttached ? 'KTP_Andi_Setiawan.pdf (1.2 MB)' : 'Klik untuk melampirkan KTP (JPG/PDF, maks 5MB)'}</p>
                              <p style={{ fontSize: '11px', color: 'var(--hi)', marginTop: '4px' }}>Tersimpan aman di GA File Storage</p>
                            </div>
                            {!isFormValid && f.req && !formData[f.id] && <span className="err-msg">Lampiran KTP/Dokumen wajib diunggah</span>}
                          </div>
                        );
                      }

                      return (
                        <div className="form-group" key={f.id}>
                          <label>{f.label}{f.req && <span className="req">*</span>}</label>
                          <input 
                            type={f.type} 
                            className={!isFormValid && f.req && !formData[f.id] ? 'err' : ''}
                            value={formData[f.id] || ''} 
                            onChange={(e) => handleFormFieldChange(f.id, e.target.value)}
                            placeholder={f.placeholder || ''}
                          />
                          {!isFormValid && f.req && !formData[f.id] && <span className="err-msg">Kolom ini wajib diisi</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="btn-row">
                  <button className="btn" onClick={() => setFormStep(0)}><i className="ti ti-arrow-left" aria-hidden="true"></i> Kembali</button>
                  <button className="btn" onClick={() => handleCreateTicket('draft')}><i className="ti ti-device-floppy" aria-hidden="true"></i> Simpan Draft</button>
                  <button className="btn btn-primary" onClick={() => setFormStep(2)}>Review Pengajuan <i className="ti ti-arrow-right" aria-hidden="true"></i></button>
                </div>
              </div>
            )}

            {/* Step 3: Review Form */}
            {formStep === 2 && (
              <div className="form-section animate">
                <div className="form-section-title"><i className="ti ti-clipboard-check" aria-hidden="true"></i>Tinjau Ulang Pengajuan Anda</div>
                <div className="detail-kv">
                  <span className="k">Jenis Pengajuan</span>
                  <span className="v" style={{ textTransform: 'uppercase' }}>{ticketType}</span>
                  <span className="k">Pemohon</span>
                  <span className="v">{currentUser.name}</span>
                  <span className="k">Departemen / Cabang</span>
                  <span className="v">{currentUser.department} · {currentUser.branch}</span>
                  <span className="k">Rincian Data</span>
                  <span className="v">
                    <pre style={{ fontFamily: 'inherit', whiteSpace: 'pre-wrap', color: 'var(--mu)', fontSize: '13px' }}>
                      {JSON.stringify(formData, null, 2)}
                    </pre>
                  </span>
                </div>

                <div className="info-box info-grn" style={{ marginTop: '16px' }}>
                  <i className="ti ti-send" aria-hidden="true"></i>
                  <span>Setelah dikirim, notifikasi sistem akan dikirim ke Telegram n8n Manager Anda untuk segera ditinjau.</span>
                </div>

                <div className="btn-row">
                  <button className="btn" onClick={() => setFormStep(1)}><i className="ti ti-arrow-left" aria-hidden="true"></i> Edit Data</button>
                  <button className="btn btn-primary" onClick={() => handleCreateTicket('pending')} disabled={budgetVal > sisaBudget}>
                    <i className="ti ti-send" aria-hidden="true"></i> Kirim Pengajuan Sekarang
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- 3. SEMUA TIKET TAB (Filtering + Side Panel Details) --- */}
        {currentTab === 'tiket' && (
          <div className="page-view animate">
            <div className="pg-hd">
              <div>
                <h1 className="pg-title">Daftar Tiket Pengajuan</h1>
                <div className="pg-sub">Log riwayat seluruh pengajuan operasional GA Anda</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-ok btn-sm" onClick={handleExportCSV}>
                  <i className="ti ti-file-spreadsheet" aria-hidden="true"></i> Ekspor CSV
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => setCurrentTab('buat')}>
                  <i className="ti ti-plus" aria-hidden="true"></i> Tiket Baru
                </button>
              </div>
            </div>

            {/* Filter pills */}
            <div className="filter-row">
              <div className={`pill-filter ${statusFilter === 'semua' ? 'on' : ''}`} onClick={() => setStatusFilter('semua')}><i className="ti ti-list" aria-hidden="true"></i> Semua</div>
              <div className={`pill-filter ${statusFilter === 'pending' ? 'on' : ''}`} onClick={() => setStatusFilter('pending')}>Pending Manager</div>
              <div className={`pill-filter ${statusFilter === 'bm' ? 'on' : ''}`} onClick={() => setStatusFilter('bm')}>Pending BM</div>
              <div className={`pill-filter ${statusFilter === 'approved' ? 'on' : ''}`} onClick={() => setStatusFilter('approved')}>Disetujui</div>
              <div className={`pill-filter ${statusFilter === 'rejected' ? 'on' : ''}`} onClick={() => setStatusFilter('rejected')}>Ditolak</div>
              <div className={`pill-filter ${statusFilter === 'draft' ? 'on' : ''}`} onClick={() => setStatusFilter('draft')}>Draft</div>

              <select 
                value={typeFilter} 
                onChange={(e) => setTypeFilter(e.target.value)}
                style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: '12px' }}
              >
                <option value="">Semua Kategori</option>
                <option value="hotel">Hotel</option>
                <option value="pesawat">Pesawat</option>
                <option value="alat">Peminjaman Aset</option>
                <option value="kendaraan">Kendaraan</option>
                <option value="zoom">Zoom</option>
                <option value="meeting">Ruang Rapat</option>
              </select>
            </div>

            {/* Grid Layout Split table & Side Panel details */}
            <div className="split">
              <div className="card" style={{ marginBottom: 0 }}>
                <table>
                  <colgroup><col style={{ width: '110px' }}/><col style={{ width: '100px' }}/><col/><col style={{ width: '110px' }}/><col style={{ width: '130px' }}/></colgroup>
                  <thead>
                    <tr>
                      <th>Tiket ID</th>
                      <th>Jenis</th>
                      <th>Keterangan</th>
                      <th>Budget</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets
                      .filter(t => {
                        if (statusFilter !== 'semua') {
                          if (statusFilter === 'pending' && t.status !== 'pending') return false;
                          if (statusFilter === 'bm' && t.status !== 'bm') return false;
                          if (statusFilter === 'approved' && t.status !== 'approved') return false;
                          if (statusFilter === 'rejected' && t.status !== 'rejected') return false;
                          if (statusFilter === 'draft' && t.status !== 'draft') return false;
                        }
                        if (typeFilter && t.type !== typeFilter) return false;
                        return true;
                      })
                      .map(t => (
                        <tr key={t.id} onClick={() => setSelectedTicketId(t.id)} className={selectedTicketId === t.id ? 'active-row' : ''}>
                          <td className="mono">{t.id}</td>
                          <td><span className="type-chip"><i className={`ti ${typeIcon[t.type] || 'ti-ticket'}`} aria-hidden="true"></i>{typeName[t.type]}</span></td>
                          <td style={{ color: 'var(--mu)' }}>{t.description}</td>
                          <td>{t.budget > 0 ? 'Rp ' + t.budget.toLocaleString('id-ID') : '—'}</td>
                          <td>
                            <span className={`chip chip-${t.status === 'pending' ? 'pend' : t.status === 'bm' ? 'bm' : t.status === 'approved' ? 'ok' : t.status === 'rejected' ? 'no' : 'draft'}`}>
                              <i className={`ti ${t.status === 'approved' ? 'ti-check' : t.status === 'rejected' ? 'ti-x' : 'ti-clock'}`} aria-hidden="true"></i>
                              {t.status === 'bm' ? 'BM Pending' : t.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Side Panel details */}
              {selectedTicketId && ticketDetailObj && (
                <div className="detail-panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '8px', borderBottom: '0.5px solid var(--bd2)' }}>
                    <div className="sec-title"><i className="ti ti-ticket" aria-hidden="true"></i> {ticketDetailObj.id}</div>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mu)' }} onClick={() => setSelectedTicketId(null)}><i className="ti ti-x" aria-hidden="true"></i></button>
                  </div>
                  
                  <div className="detail-kv">
                    <span className="k">Pemohon</span>
                    <span className="v">{ticketDetailObj.user_name} ({ticketDetailObj.user_dept})</span>
                    <span className="k">Tipe</span>
                    <span className="v" style={{ textTransform: 'capitalize' }}>{ticketDetailObj.type}</span>
                    <span className="k">Budget</span>
                    <span className="v">{ticketDetailObj.budget > 0 ? 'Rp ' + ticketDetailObj.budget.toLocaleString('id-ID') : '—'}</span>
                    
                    {Object.entries(ticketDetailObj.detail).map(([key, val]) => (
                      <React.Fragment key={key}>
                        <span className="k" style={{ textTransform: 'capitalize' }}>{key}</span>
                        <span className="v">{String(val)}</span>
                      </React.Fragment>
                    ))}
                  </div>

                  <div className="sec-title" style={{ fontSize: '12px', margin: '14px 0 10px' }}>Alur Persetujuan Tiket</div>
                  <div className="tl" style={{ marginBottom: '16px' }}>
                    <div className="tl-row">
                      <div className="tl-dot done"><i className="ti ti-check" aria-hidden="true" style={{ fontSize: '10px' }}></i></div>
                      <div className="tl-body"><div className="tl-name">Tiket Dibuat</div><div className="tl-time">Otomatis masuk sistem</div></div>
                    </div>
                    <div className="tl-row">
                      <div className={`tl-dot ${['approved', 'rejected', 'bm'].includes(ticketDetailObj.status) ? 'done' : ticketDetailObj.status === 'pending' ? 'act' : 'wait'}`}>
                        {['approved', 'rejected', 'bm'].includes(ticketDetailObj.status) ? <i className="ti ti-check" aria-hidden="true" style={{ fontSize: '10px' }}></i> : <i className="ti ti-clock" aria-hidden="true" style={{ fontSize: '10px' }}></i>}
                      </div>
                      <div className="tl-body"><div className="tl-name">Persetujuan Manager</div><div className="tl-time">{ticketDetailObj.status === 'pending' ? 'Menunggu Review' : 'Selesai'}</div></div>
                    </div>
                    {ticketDetailObj.budget > 5000000 && (
                      <div className="tl-row">
                        <div className={`tl-dot ${['approved', 'rejected'].includes(ticketDetailObj.status) && ticketDetailObj.status !== 'bm' ? 'done' : ticketDetailObj.status === 'bm' ? 'act' : 'wait'}`}>
                          {['approved', 'rejected'].includes(ticketDetailObj.status) && ticketDetailObj.status !== 'bm' ? <i className="ti ti-check" aria-hidden="true" style={{ fontSize: '10px' }}></i> : <i className="ti ti-clock" aria-hidden="true" style={{ fontSize: '10px' }}></i>}
                        </div>
                        <div className="tl-body"><div className="tl-name">Branch Manager (BM)</div><div className="tl-time">{ticketDetailObj.status === 'bm' ? 'Menunggu Persetujuan BM' : 'Selesai'}</div></div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', borderTop: '0.5px solid var(--bd2)', paddingTop: '12px' }}>
                    {ticketDetailObj.status === 'pending' && currentUser.role === 'manager' && (
                      <>
                        <button className="btn btn-sm btn-ok" onClick={() => handleApprovalAction('approve', ticketDetailObj.id)}><i className="ti ti-check" aria-hidden="true"></i> Setujui</button>
                        <button className="btn btn-sm btn-no" onClick={() => handleApprovalAction('reject', ticketDetailObj.id)}><i className="ti ti-x" aria-hidden="true"></i> Tolak</button>
                      </>
                    )}
                    {ticketDetailObj.status === 'bm' && currentUser.role === 'bm' && (
                      <>
                        <button className="btn btn-sm btn-ok" onClick={() => handleApprovalAction('approve', ticketDetailObj.id)}><i className="ti ti-check" aria-hidden="true"></i> Setujui BM</button>
                        <button className="btn btn-sm btn-no" onClick={() => handleApprovalAction('reject', ticketDetailObj.id)}><i className="ti ti-x" aria-hidden="true"></i> Tolak BM</button>
                      </>
                    )}

                    {/* Admin Override Controls */}
                    {isSuperAdmin && (
                      <div style={{ display: 'flex', gap: '4px', width: '100%', flexWrap: 'wrap', marginTop: '6px', padding: '6px', border: '1px dashed var(--pur-bd)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--pur-tx)', width: '100%', marginBottom: '4px' }}>🛡️ Admin Overrides Panel</div>
                        <button className="btn btn-sm" style={{ background: 'var(--pur-bg)', color: 'var(--pur-tx)', borderColor: 'var(--pur-bd)' }} onClick={() => handleAdminOverride(ticketDetailObj.id, 'approved')}>Setujui Paksa</button>
                        <button className="btn btn-sm" style={{ background: 'var(--red-bg)', color: 'var(--red-tx)', borderColor: 'var(--red-bd)' }} onClick={() => handleAdminOverride(ticketDetailObj.id, 'rejected')}>Tolak Paksa</button>
                        <button className="btn btn-sm btn-no" onClick={() => handleAdminDeleteTicket(ticketDetailObj.id)}><i className="ti ti-trash" aria-hidden="true"></i> Hapus</button>
                      </div>
                    )}
                  </div>

                  {/* DISCUSSION/CHAT SECTION */}
                  <div className="chat-sec">
                    <div className="sec-title" style={{ fontSize: '12px', marginBottom: '8px' }}><i className="ti ti-messages" aria-hidden="true"></i> Diskusi Tiket</div>
                    <div className="chat-box">
                      {ticketDetailObj.comments && ticketDetailObj.comments.map((c, idx) => (
                        <div className="chat-bubble" key={idx}>
                          <div className="c-meta">
                            <span>{c.user} ({c.role})</span>
                            <span>{c.time}</span>
                          </div>
                          <div className="c-text">{c.msg}</div>
                        </div>
                      ))}
                      {(!ticketDetailObj.comments || ticketDetailObj.comments.length === 0) && (
                        <div style={{ textAlign: 'center', color: 'var(--hi)', padding: '10px 0', fontSize: '11.5px' }}>Belum ada obrolan diskusi.</div>
                      )}
                    </div>
                    <form className="chat-input-wrap" onSubmit={handleSendComment}>
                      <input 
                        placeholder="Tulis pesan klarifikasi..." 
                        value={newComment} 
                        onChange={(e) => setNewComment(e.target.value)}
                      />
                      <button className="btn btn-primary btn-sm" type="submit"><i className="ti ti-send" aria-hidden="true"></i></button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- 4. DRAFT TAB --- */}
        {currentTab === 'draft' && (
          <div className="page-view animate">
            <div className="pg-hd">
              <div>
                <h1 className="pg-title">Draft Tersimpan</h1>
                <div className="pg-sub">Tiket pengajuan yang belum dikirim ke antrean approval</div>
              </div>
            </div>

            <div className="card">
              <table>
                <colgroup><col style={{ width: '130px' }}/><col style={{ width: '120px' }}/><col/><col style={{ width: '110px' }}/><col style={{ width: '100px' }}/></colgroup>
                <thead>
                  <tr>
                    <th>No. Draft</th>
                    <th>Jenis</th>
                    <th>Deskripsi</th>
                    <th>Estimasi Budget</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.filter(t => t.status === 'draft').map(t => (
                    <tr key={t.id}>
                      <td className="mono">{t.id}</td>
                      <td><span className="type-chip"><i className={`ti ${typeIcon[t.type]}`} aria-hidden="true"></i>{t.type}</span></td>
                      <td style={{ color: 'var(--mu)' }}>{t.description}</td>
                      <td>{t.budget > 0 ? 'Rp ' + t.budget.toLocaleString('id-ID') : '—'}</td>
                      <td>
                        <button className="btn btn-sm btn-primary" onClick={() => {
                          setTicketType(t.type);
                          setFormData(t.detail);
                          setFormStep(1);
                          setCurrentTab('buat');
                        }}><i className="ti ti-edit" aria-hidden="true"></i> Edit & Kirim</button>
                      </td>
                    </tr>
                  ))}
                  {tickets.filter(t => t.status === 'draft').length === 0 && (
                    <tr>
                      <td colSpan="5">
                        <div className="empty"><i className="ti ti-pencil" aria-hidden="true"></i> Tidak ada draft tersimpan</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- 5. APPROVAL TAB (Manager/BM) --- */}
        {currentTab === 'appr' && (
          <div className="page-view animate">
            <div className="pg-hd">
              <div>
                <h1 className="pg-title">Persetujuan Tiket GA</h1>
                <div className="pg-sub">Daftar tiket yang menunggu tindakan otorisasi Anda</div>
              </div>
            </div>

            <div className="split">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {tickets
                  .filter(t => t.status === (currentUser.role === 'bm' ? 'bm' : 'pending'))
                  .map(t => (
                    <div className="card" key={t.id}>
                      <div className="card-hd">
                        <span style={{ fontWeight: '600' }}>{t.id} — PENGANJUAN {t.type.toUpperCase()}</span>
                        <span className="chip chip-pend">Menunggu Otorisasi</span>
                      </div>
                      <div style={{ padding: '16px' }}>
                        <div style={{ fontSize: '13px', color: 'var(--mu)', marginBottom: '10px' }}>
                          <strong>Keterangan:</strong> {t.description} <br/>
                          <strong>Pemohon:</strong> {t.user_name} ({t.user_dept}) <br/>
                          <strong>Estimasi Budget:</strong> {t.budget > 0 ? 'Rp ' + t.budget.toLocaleString('id-ID') : '—'}
                        </div>
                        {t.budget > 5000000 && (
                          <div className="info-box info-amb">
                            <i className="ti ti-alert-triangle" aria-hidden="true"></i>
                            <span>Budget melampaui Rp 5.000.000. Jika disetujui, tiket akan diteruskan ke Branch Manager (BM) secara otomatis.</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn btn-sm btn-ok" onClick={() => handleApprovalAction('approve', t.id)}><i className="ti ti-check" aria-hidden="true"></i> Setujui</button>
                          <button className="btn btn-sm btn-no" onClick={() => handleApprovalAction('reject', t.id)}><i className="ti ti-x" aria-hidden="true"></i> Tolak</button>
                        </div>
                      </div>
                    </div>
                  ))}
                {tickets.filter(t => t.status === (currentUser.role === 'bm' ? 'bm' : 'pending')).length === 0 && (
                  <div className="empty"><i className="ti ti-checks" aria-hidden="true"></i> Tidak ada antrean tiket pending saat ini.</div>
                )}
              </div>

              <div className="card" style={{ padding: '16px' }}>
                <div className="sec-title" style={{ marginBottom: '12px' }}><i className="ti ti-timeline" aria-hidden="true"></i> SLA Kepatuhan Approval</div>
                <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--mu)' }}>Rata-rata waktu approve</span>
                    <span style={{ fontWeight: '600' }}>{dashboardStats.avgSlaDays} Hari</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--mu)' }}>Target SLA internal</span>
                    <span style={{ fontWeight: '600' }}>2.0 Hari Kerja</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--mu)' }}>Kepatuhan Bulan Ini</span>
                    <span style={{ fontWeight: '600', color: 'var(--grn-tx)' }}>96% Sesuai SLA</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- 6. RIWAYAT APPROVAL TAB --- */}
        {currentTab === 'riwayat' && (
          <div className="page-view animate">
            <div className="pg-hd">
              <div>
                <h1 className="pg-title">Riwayat Otorisasi Approval</h1>
                <div className="pg-sub">Log lengkap tindakan persetujuan dan penolakan tiket pengajuan</div>
              </div>
            </div>

            <div className="card">
              <table>
                <colgroup><col style={{ width: '130px' }}/><col style={{ width: '120px' }}/><col/><col style={{ width: '120px' }}/><col style={{ width: '120px' }}/><col style={{ width: '100px' }}/></colgroup>
                <thead>
                  <tr>
                    <th>No. Tiket</th>
                    <th>Jenis</th>
                    <th>Deskripsi</th>
                    <th>Budget</th>
                    <th>Keputusan</th>
                    <th>Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets
                    .filter(t => ['approved', 'rejected', 'completed'].includes(t.status))
                    .map(t => (
                      <tr key={t.id} onClick={() => { setCurrentTab('tiket'); setSelectedTicketId(t.id); }}>
                        <td className="mono">{t.id}</td>
                        <td><span className="type-chip"><i className={`ti ${typeIcon[t.type]}`} aria-hidden="true"></i>{t.type}</span></td>
                        <td style={{ color: 'var(--mu)' }}>{t.description}</td>
                        <td>{t.budget > 0 ? 'Rp ' + t.budget.toLocaleString('id-ID') : '—'}</td>
                        <td>
                          <span className={`chip chip-${t.status === 'approved' ? 'ok' : t.status === 'rejected' ? 'no' : 'comp'}`}>
                            <i className={`ti ${t.status === 'approved' ? 'ti-check' : 'ti-x'}`} aria-hidden="true"></i>
                            {t.status}
                          </span>
                        </td>
                        <td style={{ color: 'var(--hi)' }}>{t.date_created}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- 7. MASTER ASET TAB --- */}
        {currentTab === 'aset' && (
          <div className="page-view animate">
            <div className="pg-hd">
              <div>
                <h1 className="pg-title">Master Aset GA</h1>
                <div className="pg-sub">Manajemen inventaris aset operasional yang dapat dipinjam oleh karyawan</div>
              </div>
            </div>

            <div className="split">
              <div className="card">
                <table>
                  <colgroup><col style={{ width: '130px' }}/><col/><col style={{ width: '100px' }}/><col style={{ width: '90px' }}/><col style={{ width: '110px' }}/><col style={{ width: '100px' }}/></colgroup>
                  <thead>
                    <tr>
                      <th>Kode Aset</th>
                      <th>Nama Barang</th>
                      <th>Kategori</th>
                      <th>Kondisi</th>
                      <th>Status</th>
                      <th>Barcode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map(a => (
                      <tr key={a.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 'bold' }}>{a.code}</td>
                        <td>{a.name}</td>
                        <td>{a.category}</td>
                        <td>
                          <select 
                            value={a.condition} 
                            disabled={!isSuperAdmin}
                            onChange={(e) => handleUpdateAsset(a.id, e.target.value, a.status)}
                            style={{ padding: '2px 4px', fontSize: '11px', width: 'auto' }}
                          >
                            <option value="Baik">Baik</option>
                            <option value="Servis">Servis</option>
                            <option value="Rusak">Rusak</option>
                          </select>
                        </td>
                        <td>
                          <select 
                            value={a.status} 
                            disabled={!isSuperAdmin}
                            onChange={(e) => handleUpdateAsset(a.id, a.condition, e.target.value)}
                            style={{ padding: '2px 4px', fontSize: '11px', width: 'auto' }}
                          >
                            <option value="Tersedia">Tersedia</option>
                            <option value="Dipinjam">Dipinjam</option>
                            <option value="Tidak Tersedia">Tidak Tersedia</option>
                          </select>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '2px' }}>
                            <button className="btn btn-sm" onClick={() => setShowBarcodePrint(a)} title="Cetak Barcode"><i className="ti ti-printer" aria-hidden="true"></i></button>
                            {isSuperAdmin && <button className="btn btn-sm btn-no" onClick={() => handleDeleteAsset(a.id)}><i className="ti ti-trash" aria-hidden="true"></i></button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="card" style={{ padding: '16px' }}>
                <div className="sec-title" style={{ marginBottom: '12px' }}><i className="ti ti-box" aria-hidden="true"></i> {isSuperAdmin ? 'Registrasi Aset Baru' : 'Info Peminjaman'}</div>
                {isSuperAdmin ? (
                  <form onSubmit={handleAddAsset}>
                    <div className="form-group" style={{ marginBottom: '10px' }}>
                      <label>Kode Register Aset</label>
                      <input placeholder="cth: BPN-AST-0005" value={newAssetCode} onChange={(e) => setNewAssetCode(e.target.value)}/>
                    </div>
                    <div className="form-group" style={{ marginBottom: '10px' }}>
                      <label>Nama Aset / Barang</label>
                      <input placeholder="cth: MacBook Pro 16 M3" value={newAssetName} onChange={(e) => setNewAssetName(e.target.value)}/>
                    </div>
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <label>Kategori</label>
                      <select value={newAssetCat} onChange={(e) => setNewAssetCat(e.target.value)}>
                        <option value="Elektronik">Elektronik</option>
                        <option value="Kendaraan">Kendaraan</option>
                        <option value="Perabot">Perabot</option>
                        <option value="Perlengkapan">Perlengkapan</option>
                      </select>
                    </div>
                    <button className="btn btn-primary" type="submit" style={{ width: '100%' }}><i className="ti ti-plus" aria-hidden="true"></i> Daftarkan Aset</button>
                  </form>
                ) : (
                  <div style={{ fontSize: '12.5px', color: 'var(--mu)', lineHeight: '1.5' }}>
                    Untuk mengajukan peminjaman aset di atas, silakan buat tiket baru dengan kategori <strong>Peminjaman Alat</strong>. Barcode cetak digunakan untuk verifikasi inventaris fisik oleh staf GA di lokasi.
                  </div>
                )}
              </div>
            </div>
            
            {showBarcodePrint && (
              <div className="modal-wrap">
                <div className="modal" style={{ width: '320px', textAlign: 'center' }}>
                  <div className="modal-title">Cetak Barcode Register Aset</div>
                  <div className="modal-sub">Model Label: 30x50mm Thermal Sticker</div>
                  <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', display: 'inline-block', border: '1px solid #ddd', margin: '10px 0' }}>
                    <div style={{ fontSize: '11px', color: '#333', fontWeight: 'bold', marginBottom: '4px' }}>GA PROPERTY OF GATICKET</div>
                    <div style={{ display: 'flex', justifyContent: 'center', height: '40px', gap: '2px', background: '#000', padding: '4px 10px', width: '160px', margin: '0 auto' }}>
                      <div style={{ width: '3px', background: '#fff' }}></div><div style={{ width: '1px', background: '#fff' }}></div>
                      <div style={{ width: '4px', background: '#fff' }}></div><div style={{ width: '2px', background: '#fff' }}></div>
                      <div style={{ width: '2px', background: '#fff' }}></div><div style={{ width: '3px', background: '#fff' }}></div>
                      <div style={{ width: '1px', background: '#fff' }}></div><div style={{ width: '4px', background: '#fff' }}></div>
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#000', fontWeight: 'bold', marginTop: '6px' }}>{showBarcodePrint.code}</div>
                    <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>{showBarcodePrint.name}</div>
                  </div>
                  <div className="modal-footer">
                    <button className="btn btn-sm" onClick={() => setShowBarcodePrint(null)}>Tutup</button>
                    <button className="btn btn-sm btn-primary" onClick={() => { addToast('ok', 'Mengirim perintah cetak sticker...', 'ti-printer'); setShowBarcodePrint(null); }}>Cetak Sekarang</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- 8. JADWAL & SLOT TAB --- */}
        {currentTab === 'jadwal' && (
          <div className="page-view animate">
            <div className="pg-hd">
              <div>
                <h1 className="pg-title">Jadwal & Ketersediaan Slot</h1>
                <div className="pg-sub">Cek ketersediaan ruang rapat dan kendaraan operasional secara real-time</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="card" style={{ padding: '16px' }}>
                <div className="sec-title" style={{ marginBottom: '12px' }}><i className="ti ti-door" aria-hidden="true" style={{ color: 'var(--blu)' }}></i> Ruang Rapat — Januari 2025</div>
                <div style={{ fontSize: '12px', color: 'var(--mu)', marginBottom: '12px' }}>
                  Klik nomor hari untuk memesan/merilis slot ketersediaan.<br/>
                  Keterangan: <span style={{ color: 'var(--grn-tx)', fontWeight: 'bold' }}>■ Tersedia</span> &nbsp; <span style={{ color: 'var(--red-tx)', fontWeight: 'bold' }}>■ Dibooking</span>
                </div>

                <div style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--mu)', marginBottom: '4px' }}>Ruang Rapat A (Kapasitas 10 Orang)</div>
                <div className="avail-grid" style={{ marginBottom: '20px' }}>
                  {Array.from({ length: 14 }, (_, i) => {
                    const slotKey = String(i + 1);
                    const isBusy = slots.some(s => s.category === 'room' && s.item_name === 'Ruang Rapat A' && s.slot_key === slotKey && s.is_booked);
                    return (
                      <div 
                        key={slotKey} 
                        className={`avail-slot ${isBusy ? 'busy' : 'free'}`}
                        onClick={() => handleBookSlot('room', 'Ruang Rapat A', slotKey)}
                      >
                        {slotKey}
                      </div>
                    );
                  })}
                </div>

                <div style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--mu)', marginBottom: '4px' }}>Ruang Rapat B (Kapasitas 20 Orang)</div>
                <div className="avail-grid">
                  {Array.from({ length: 14 }, (_, i) => {
                    const slotKey = String(i + 1);
                    const isBusy = slots.some(s => s.category === 'room' && s.item_name === 'Ruang Rapat B' && s.slot_key === slotKey && s.is_booked);
                    return (
                      <div 
                        key={slotKey} 
                        className={`avail-slot ${isBusy ? 'busy' : 'free'}`}
                        onClick={() => handleBookSlot('room', 'Ruang Rapat B', slotKey)}
                      >
                        {slotKey}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="card" style={{ padding: '16px' }}>
                <div className="sec-title" style={{ marginBottom: '12px' }}><i className="ti ti-car" aria-hidden="true" style={{ color: 'var(--amb)' }}></i> Kendaraan GA — Minggu Ini</div>
                <table style={{ tableLayout: 'auto' }}>
                  <thead>
                    <tr>
                      <th>Kendaraan</th>
                      <th>Sen</th>
                      <th>Sel</th>
                      <th>Rab</th>
                      <th>Kam</th>
                      <th>Jum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: 'Avanza B-1234-AB' },
                      { name: 'Honda Jazz' },
                      { name: 'Innova B-9012-EF' }
                    ].map(v => (
                      <tr key={v.name}>
                        <td style={{ fontSize: '12px', fontWeight: 'bold' }}>{v.name}</td>
                        {['Sen', 'Sel', 'Rab', 'Kam', 'Jum'].map(day => {
                          const isBusy = slots.some(s => s.category === 'vehicle' && s.item_name === v.name && s.slot_key === day && s.is_booked);
                          return (
                            <td key={day} onClick={() => handleBookSlot('vehicle', v.name, day)}>
                              <span className={`chip chip-${isBusy ? 'no' : 'ok'}`} style={{ fontSize: '10px', padding: '2px 6px', cursor: 'pointer' }}>
                                {isBusy ? 'Booking' : 'Tersedia'}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- 9. LAPORAN TAB --- */}
        {currentTab === 'laporan' && (
          <div className="page-view animate">
            <div className="pg-hd">
              <div>
                <h1 className="pg-title">Laporan Penggunaan Anggaran</h1>
                <div className="pg-sub">Statistik penyerapan budget operasional General Affairs</div>
              </div>
            </div>

            <div className="stat-grid" style={{ marginBottom: '16px' }}>
              <div className="stat">
                <div className="stat-lbl">Total Tiket Bulan Ini</div>
                <div className="stat-val">24 Tiket</div>
                <div className="stat-delta">↑ 18% vs bulan lalu</div>
              </div>
              <div className="stat">
                <div className="stat-lbl">Total Budget Dipakai</div>
                <div className="stat-val" style={{ color: 'var(--blu)' }}>Rp 42.100.000</div>
                <div className="stat-delta">82% dari alokasi kumulatif</div>
              </div>
              <div className="stat">
                <div className="stat-lbl">Avg SLA Otorisasi</div>
                <div className="stat-val" style={{ color: 'var(--grn)' }}>1.4 Hari</div>
                <div className="stat-delta">Target SLA: maks 2 days</div>
              </div>
              <div className="stat">
                <div className="stat-lbl">Kategori Tertinggi</div>
                <div className="stat-val" style={{ fontSize: '18px' }}>Tiket Pesawat</div>
                <div className="stat-delta">Menyerap 45% budget GA</div>
              </div>
            </div>

            <div className="card" style={{ padding: '20px' }}>
              <div className="sec-title" style={{ marginBottom: '14px' }}><i className="ti ti-coins" aria-hidden="true"></i> Penyerapan Budget Per Departemen (Cabang Balikpapan)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {budgets.map(b => {
                  const pct = Math.round((b.used_budget / b.allocated_budget) * 100);
                  return (
                    <div key={b.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', fontWeight: '500' }}>
                        <span>{b.department}</span>
                        <span>Rp {b.used_budget.toLocaleString('id-ID')} / Rp {b.allocated_budget.toLocaleString('id-ID')}</span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--surf3)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--blu-bd)', borderRadius: '4px' }}></div>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--hi)', marginTop: '4px' }}>{pct}% Anggaran Terpakai</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* --- 10. MANAJEMEN USER TAB (Admin only) --- */}
        {currentTab === 'user-mgmt' && (
          <div className="page-view animate">
            <div className="pg-hd">
              <div>
                <h1 className="pg-title">Manajemen User & Role</h1>
                <div className="pg-sub">Kelola akun karyawan, hak akses, dan pengaturan departemen</div>
              </div>
            </div>

            <div className="split">
              <div className="card">
                <div className="card-hd"><span className="sec-title">Daftar Pengguna Aktif</span></div>
                <table>
                  <colgroup><col style={{ width: '60px' }}/><col/><col/><col style={{ width: '130px' }}/><col style={{ width: '130px' }}/><col style={{ width: '90px' }}/></colgroup>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nama</th>
                      <th>Email</th>
                      <th>Departemen · Cabang</th>
                      <th>Role Hak Akses</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td className="mono">{u.id}</td>
                        <td style={{ fontWeight: '600' }}>{u.name}</td>
                        <td style={{ color: 'var(--mu)' }}>{u.email}</td>
                        <td style={{ fontSize: '12px' }}>{u.department} · {u.branch}</td>
                        <td>
                          <select 
                            value={u.role}
                            onChange={(e) => handleChangeUserRole(u.id, e.target.value)}
                            style={{ padding: '4px 8px', fontSize: '12px', textTransform: 'capitalize' }}
                          >
                            <option value="employee">Employee</option>
                            <option value="manager">Manager</option>
                            <option value="bm">Branch Manager</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td>
                          <button className="btn btn-sm btn-no" onClick={() => handleDeleteUser(u.id)}><i className="ti ti-trash" aria-hidden="true"></i></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="card" style={{ padding: '16px' }}>
                <div className="sec-title" style={{ marginBottom: '12px' }}><i className="ti ti-user-plus" aria-hidden="true"></i> Registrasi Akun Baru</div>
                <form onSubmit={handleAddUser}>
                  <div className="form-group" style={{ marginBottom: '10px' }}>
                    <label>Nama Lengkap</label>
                    <input placeholder="cth: Dewi Lestari" value={newUserName} onChange={(e) => setNewUserName(e.target.value)}/>
                  </div>
                  <div className="form-group" style={{ marginBottom: '10px' }}>
                    <label>Email Perusahaan</label>
                    <input type="email" placeholder="dewi@gaticket.co.id" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)}/>
                  </div>
                  <div className="form-group" style={{ marginBottom: '10px' }}>
                    <label>Departemen</label>
                    <select value={newUserDept} onChange={(e) => setNewUserDept(e.target.value)}>
                      <option value="Marketing">Marketing</option>
                      <option value="Operasional">Operasional</option>
                      <option value="HR">HR</option>
                      <option value="IT">IT</option>
                      <option value="Management">Management</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: '10px' }}>
                    <label>Cabang</label>
                    <select value={newUserBranch} onChange={(e) => setNewUserBranch(e.target.value)}>
                      <option value="Balikpapan">Balikpapan</option>
                      <option value="Jakarta">Jakarta</option>
                      <option value="Surabaya">Surabaya</option>
                      <option value="Makassar">Makassar</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label>Role Awal</label>
                    <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)}>
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="bm">Branch Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <button className="btn btn-primary" type="submit" style={{ width: '100%' }}><i className="ti ti-plus" aria-hidden="true"></i> Daftarkan User</button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* --- 11. BUDGET MANAGEMENT TAB (Admin only) --- */}
        {currentTab === 'budget-mgmt' && (
          <div className="page-view animate">
            <div className="pg-hd">
              <div>
                <h1 className="pg-title">Alokasi Anggaran Cap Budget</h1>
                <div className="pg-sub">Kelola penetapan batas pagu anggaran per departemen per cabang</div>
              </div>
            </div>

            <div className="card">
              <div className="card-hd"><span className="sec-title">Alokasi Cap Budget Aktif</span></div>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Departemen</th>
                    <th>Cabang</th>
                    <th>Alokasi Cap Budget</th>
                    <th>Terpakai</th>
                    <th>Sisa Saldo</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {budgets.map(b => (
                    <tr key={b.id}>
                      <td className="mono">{b.id}</td>
                      <td style={{ fontWeight: '600' }}>{b.department}</td>
                      <td>{b.branch}</td>
                      <td>
                        {editBudgetCapId === b.id ? (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <input 
                              type="number" 
                              value={editBudgetAllocated} 
                              onChange={(e) => setEditBudgetAllocated(e.target.value)}
                              style={{ width: '140px', padding: '4px 8px' }}
                            />
                            <button className="btn btn-sm btn-primary" onClick={() => handleUpdateBudgetCap(b.id, editBudgetAllocated, b.used_budget)}>Save</button>
                            <button className="btn btn-sm" onClick={() => setEditBudgetCapId(null)}>Cancel</button>
                          </div>
                        ) : (
                          <span>Rp {b.allocated_budget.toLocaleString('id-ID')}</span>
                        )}
                      </td>
                      <td style={{ color: 'var(--red-tx)' }}>Rp {b.used_budget.toLocaleString('id-ID')}</td>
                      <td style={{ fontWeight: 'bold', color: 'var(--grn-tx)' }}>Rp {(b.allocated_budget - b.used_budget).toLocaleString('id-ID')}</td>
                      <td>
                        {editBudgetCapId !== b.id && (
                          <button className="btn btn-sm" onClick={() => {
                            setEditBudgetCapId(b.id);
                            setEditBudgetAllocated(b.allocated_budget);
                          }}><i className="ti ti-edit" aria-hidden="true"></i> Edit Cap</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- 12. WEBHOOK LOGS TAB (Admin only) --- */}
        {currentTab === 'webhook' && (
          <div className="page-view animate">
            <div className="pg-hd">
              <div>
                <h1 className="pg-title">Simulator Webhook logs (Telegram / n8n)</h1>
                <div className="pg-sub">Monitor log pengiriman trigger JSON webhook riil dari server ke Telegram n8n</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {webhookLogs.map(l => (
                <div className="webhook-log-card" key={l.id}>
                  <div className="webhook-log-hd">
                    <span style={{ fontWeight: 'bold', color: 'var(--pur-tx)' }}>🟢 {l.event} · {l.id}</span>
                    <span style={{ color: 'var(--mu)', fontSize: '11px' }}>{l.time} · Status: <strong>{l.status} OK</strong> · Target: <code>{l.target}</code></span>
                  </div>
                  <pre className="webhook-code">{JSON.stringify(l.payload, null, 2)}</pre>
                </div>
              ))}
              {webhookLogs.length === 0 && (
                <div className="empty"><i className="ti ti-webhook" aria-hidden="true"></i> Belum ada aktivitas terkirim. Buat/Approve tiket untuk memicu webhook logs.</div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* --- CONFIRMATION MODAL --- */}
      {showModal && (
        <div className="modal-wrap">
          <div className="modal animate">
            <div className="modal-title">{modalAction.action === 'approve' ? 'Konfirmasi Persetujuan Tiket' : 'Konfirmasi Penolakan Tiket'}</div>
            <div className="modal-sub">
              {modalAction.action === 'approve' 
                ? `Apakah Anda yakin ingin menyetujui tiket ${modalAction.ticketId}? Tindakan ini akan diteruskan ke proses GA.`
                : `Masukkan alasan penolakan tiket ${modalAction.ticketId}. Pemohon akan otomatis menerima alasan ini.`}
            </div>
            
            <div className="form-group">
              <label>{modalAction.action === 'approve' ? 'Catatan Tambahan (Opsional)' : 'Alasan Penolakan (Wajib)'}</label>
              <textarea 
                placeholder={modalAction.action === 'approve' ? 'Tambahkan catatan...' : 'Tulis alasan penolakan di sini...'}
                value={modalNote}
                onChange={(e) => setModalNote(e.target.value)}
                required={modalAction.action === 'reject'}
              />
            </div>

            <div className="modal-footer">
              <button className="btn btn-sm" onClick={() => setShowModal(false)}>Batal</button>
              <button 
                className={`btn btn-sm ${modalAction.action === 'approve' ? 'btn-ok' : 'btn-no'}`}
                onClick={submitModalAction}
              >
                {modalAction.action === 'approve' ? 'Ya, Setujui' : 'Ya, Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- TOASTS STACK --- */}
      <div className="toast-stack">
        {toasts.map(t => (
          <div className={`toast ${t.type} ${t.bye ? 'bye' : ''}`} key={t.id}>
            <i className={`ti ${t.icon}`} aria-hidden="true"></i>
            <span style={{ flex: 1 }}>{t.msg}</span>
            <button 
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mu)', padding: '2px', lineHeight: 1 }}
              onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            >
              <i className="ti ti-x" aria-hidden="true" style={{ fontSize: '13px' }}></i>
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}
