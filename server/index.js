// Premium Express.js API server for PioneersMsg
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'pionotes_secret_key_90220_secure_12345';

// Middleware
app.use(cors());
app.use(express.json());

// JWT Token Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: "Giriş yetkisi reddedildi. Token bulunamadı." });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Geçersiz veya süresi dolmuş oturum anahtarı." });
    }
    req.user = decoded;
    next();
  });
}

// Super Admin Authorization Gate Middleware
function requireSuperAdmin(req, res, next) {
  if (req.user && req.user.role === 'superadmin') {
    next();
  } else {
    res.status(403).json({ error: "Bu işlem için Süper Admin (90220) yetkisi gereklidir." });
  }
}

// ==========================================
// 1. AUTHENTICATION ENDPOINTS
// ==========================================

// Login User
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Kullanıcı adı ve şifre zorunludur." });
    }

    // Lookup user
    const users = await db.query("SELECT * FROM users WHERE username = ?", [username.trim()]);
    if (users.length === 0) {
      return res.status(401).json({ error: "Hatalı kullanıcı adı veya şifre." });
    }

    const user = users[0];
    
    // Compare password hash
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: "Hatalı kullanıcı adı veya şifre." });
    }

    // Generate JWT Token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' } // Long expiration for convenient sidepanel usage
    );

    res.json({
      token,
      username: user.username,
      role: user.role
    });
  } catch (err) {
    console.error("Login failed:", err);
    res.status(500).json({ error: "Sunucu hatası oluştu." });
  }
});

// Change Password (Self-management)
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "Eski ve yeni şifre alanları zorunludur." });
    }

    const users = await db.query("SELECT * FROM users WHERE id = ?", [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ error: "Kullanıcı bulunamadı." });
    }

    const user = users[0];
    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) {
      return res.status(400).json({ error: "Eski şifreniz hatalı." });
    }

    // Hash and save new password
    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query("UPDATE users SET password = ? WHERE id = ?", [hashed, req.user.id]);

    res.json({ message: "Şifreniz başarıyla güncellendi." });
  } catch (err) {
    console.error("Change password failed:", err);
    res.status(500).json({ error: "Sunucu hatası oluştu." });
  }
});

// ==========================================
// 2. SUPER ADMIN USER MANAGEMENT ENDPOINTS
// ==========================================

// Register New User (Süper Admin exclusive)
app.post('/api/auth/register', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Kullanıcı adı ve şifre zorunludur." });
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.toLowerCase() === '90220') {
      return res.status(400).json({ error: "90220 adında başka bir hesap açılamaz." });
    }

    // Check availability
    const existing = await db.query("SELECT id FROM users WHERE username = ?", [trimmedUsername]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "Bu kullanıcı adı zaten alınmış." });
    }

    // Hash password & insert
    const hashedPassword = await bcrypt.hash(password, 10);
    const assignedRole = (role === 'superadmin') ? 'superadmin' : 'user';

    await db.query("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", [
      trimmedUsername,
      hashedPassword,
      assignedRole
    ]);

    res.status(201).json({ message: `Kullanıcı '${trimmedUsername}' başarıyla oluşturuldu.` });
  } catch (err) {
    console.error("Registration failed:", err);
    res.status(500).json({ error: "Sunucu hatası oluştu." });
  }
});

// Get all users list (Süper Admin exclusive)
app.get('/api/users', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const users = await db.query("SELECT id, username, role FROM users ORDER BY username ASC");
    res.json(users);
  } catch (err) {
    console.error("Fetch users failed:", err);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

// Delete user account (Süper Admin exclusive)
app.delete('/api/users/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const userIdToDelete = req.params.id;

    // Safety checks
    const users = await db.query("SELECT username, role FROM users WHERE id = ?", [userIdToDelete]);
    if (users.length === 0) {
      return res.status(404).json({ error: "Silinecek kullanıcı bulunamadı." });
    }

    const targetUser = users[0];
    if (targetUser.username === '90220' || targetUser.role === 'superadmin') {
      return res.status(400).json({ error: "Yönetici (Super Admin) hesapları bu şekilde silinemez!" });
    }

    // 1. Delete user notes and folders first to prevent orphans, or re-assign
    await db.query("DELETE FROM notes WHERE user_id = ?", [userIdToDelete]);
    await db.query("DELETE FROM folders WHERE user_id = ?", [userIdToDelete]);
    
    // 2. Delete user
    await db.query("DELETE FROM users WHERE id = ?", [userIdToDelete]);

    res.json({ message: "Kullanıcı hesabı ve tüm verileri silindi." });
  } catch (err) {
    console.error("Delete user failed:", err);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

// ==========================================
// 3. FOLDERS CRUD API
// ==========================================

// Get Folders (Returns User's private folders + Global folders)
app.get('/api/folders', authenticateToken, async (req, res) => {
  try {
    // Return private folders (user_id = req.user.id) and global folders (user_id is NULL)
    const folders = await db.query(
      "SELECT id, name, emoji, (user_id IS NULL) as is_global FROM folders WHERE user_id = ? OR user_id IS NULL ORDER BY name ASC",
      [req.user.id]
    );
    res.json(folders);
  } catch (err) {
    console.error("Fetch folders failed:", err);
    res.status(500).json({ error: "Veriler getirilirken hata oluştu." });
  }
});

// Create Folder
app.post('/api/folders', authenticateToken, async (req, res) => {
  try {
    const { id, name, emoji, isGlobal } = req.body;
    if (!id || !name) {
      return res.status(400).json({ error: "Klasör kimliği ve adı zorunludur." });
    }

    const isSuperAdmin = req.user.role === 'superadmin';
    const folderUserId = (isGlobal && isSuperAdmin) ? null : req.user.id;

    await db.query("INSERT INTO folders (id, user_id, name, emoji) VALUES (?, ?, ?, ?)", [
      id,
      folderUserId,
      name,
      emoji || "📁"
    ]);

    res.status(201).json({ message: "Klasör oluşturuldu." });
  } catch (err) {
    console.error("Create folder failed:", err);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

// Delete Folder
app.delete('/api/folders/:id', authenticateToken, async (req, res) => {
  try {
    const folderId = req.params.id;

    // Check folder details & ownership
    const folders = await db.query("SELECT user_id FROM folders WHERE id = ?", [folderId]);
    if (folders.length === 0) {
      return res.status(404).json({ error: "Klasör bulunamadı." });
    }

    const folder = folders[0];
    const isSuperAdmin = req.user.role === 'superadmin';

    // If global folder, only Super Admin can delete it
    if (folder.user_id === null && !isSuperAdmin) {
      return res.status(403).json({ error: "Sabit Genel Klasörleri sadece Süper Admin silebilir." });
    }

    // Normal users can only delete their own private folders
    if (folder.user_id !== null && folder.user_id !== req.user.id && !isSuperAdmin) {
      return res.status(403).json({ error: "Bu işlem için yetkiniz bulunmamaktadır." });
    }

    // Delete folder
    await db.query("DELETE FROM folders WHERE id = ?", [folderId]);

    // Unassign related notes (set folder_id to none) for private notes or if superadmin deletes a global folder
    await db.query("UPDATE notes SET folder_id = 'none' WHERE folder_id = ?", [folderId]);

    res.json({ message: "Klasör silindi, içindeki notlar Klasörsüz kategorisine aktarıldı." });
  } catch (err) {
    console.error("Delete folder failed:", err);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

// ==========================================
// 4. NOTES CRUD API
// ==========================================

// Get Notes (Returns User's private notes + Global notes)
app.get('/api/notes', authenticateToken, async (req, res) => {
  try {
    // Return private notes (user_id = req.user.id) and global notes (user_id is NULL)
    const notes = await db.query(
      "SELECT id, folder_id as \"folderId\", title, content, color, created_at as \"createdAt\", (user_id IS NULL) as is_global FROM notes WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC",
      [req.user.id]
    );
    
    // Ensure accurate integer typing for createdAt
    const formattedNotes = notes.map(n => ({
      ...n,
      createdAt: parseInt(n.createdAt)
    }));

    res.json(formattedNotes);
  } catch (err) {
    console.error("Fetch notes failed:", err);
    res.status(500).json({ error: "Notlar yüklenirken hata oluştu." });
  }
});

// Create Note
app.post('/api/notes', authenticateToken, async (req, res) => {
  try {
    const { id, folderId, title, content, color, isGlobal } = req.body;
    if (!id || !content) {
      return res.status(400).json({ error: "Not içeriği boş olamaz." });
    }

    const isSuperAdmin = req.user.role === 'superadmin';
    const noteUserId = (isGlobal && isSuperAdmin) ? null : req.user.id;

    await db.query("INSERT INTO notes (id, user_id, folder_id, title, content, color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", [
      id,
      noteUserId,
      folderId || 'none',
      title || '',
      content,
      color || 'blue',
      Date.now()
    ]);

    res.status(201).json({ message: "Not oluşturuldu." });
  } catch (err) {
    console.error("Create note failed:", err);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

// Update Note
app.put('/api/notes/:id', authenticateToken, async (req, res) => {
  try {
    const noteId = req.params.id;
    const { folderId, title, content, color, isGlobal } = req.body;

    // Check ownership
    const notes = await db.query("SELECT user_id FROM notes WHERE id = ?", [noteId]);
    if (notes.length === 0) {
      return res.status(404).json({ error: "Not bulunamadı." });
    }

    const note = notes[0];
    const isSuperAdmin = req.user.role === 'superadmin';

    // If global note, only Super Admin can edit it
    if (note.user_id === null && !isSuperAdmin) {
      return res.status(403).json({ error: "Sabit Genel Notları yalnızca Süper Admin düzenleyebilir." });
    }

    // Normal users can only edit their own private notes
    if (note.user_id !== null && note.user_id !== req.user.id && !isSuperAdmin) {
      return res.status(403).json({ error: "Bu işlem için yetkiniz yok." });
    }

    // Update fields
    const noteUserId = (isGlobal && isSuperAdmin) ? null : (note.user_id || req.user.id);

    await db.query("UPDATE notes SET user_id = ?, folder_id = ?, title = ?, content = ?, color = ?, created_at = ? WHERE id = ?", [
      noteUserId,
      folderId || 'none',
      title || '',
      content,
      color || 'blue',
      Date.now(),
      noteId
    ]);

    res.json({ message: "Not güncellendi." });
  } catch (err) {
    console.error("Update note failed:", err);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

// Delete Note
app.delete('/api/notes/:id', authenticateToken, async (req, res) => {
  try {
    const noteId = req.params.id;

    // Check ownership
    const notes = await db.query("SELECT user_id FROM notes WHERE id = ?", [noteId]);
    if (notes.length === 0) {
      return res.status(404).json({ error: "Not bulunamadı." });
    }

    const note = notes[0];
    const isSuperAdmin = req.user.role === 'superadmin';

    // If global note, only Super Admin can delete it
    if (note.user_id === null && !isSuperAdmin) {
      return res.status(403).json({ error: "Sabit Genel Notları yalnızca Süper Admin silebilir." });
    }

    // Normal users can only delete their own notes
    if (note.user_id !== null && note.user_id !== req.user.id && !isSuperAdmin) {
      return res.status(403).json({ error: "Bu işlem için yetkiniz yok." });
    }

    await db.query("DELETE FROM notes WHERE id = ?", [noteId]);
    res.json({ message: "Not başarıyla silindi." });
  } catch (err) {
    console.error("Delete note failed:", err);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

// ==========================================
// 5. SERVER BOOTSTRAP
// ==========================================
app.get('/', (req, res) => {
  res.send('PioNotes Online API Server is running smoothly! 🍑🚀');
});

// Initialize database schemas and listen
db.initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`PioNotes server running successfully!`);
    console.log(`Server API URL: http://localhost:${PORT}`);
    console.log(`Database Mode: ${db.isPg ? 'Cloud PostgreSQL' : 'Local SQLite File'}`);
    console.log(`======================================================\n`);
  });
});
