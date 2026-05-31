// Premium Cloudflare Workers API Server utilizing Hono framework and Serverless D1 SQL Database
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { sign, verify } from 'hono/jwt';

const app = new Hono();
const JWT_SECRET = 'pionotes_secret_key_90220_secure_12345';

// Enable global CORS middleware
app.use('*', cors());

// SHA-256 Web Crypto standard hashing helper
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Global JWT authentication middleware (URL-compatible fallback with Express API)
app.use('/api/*', async (c, next) => {
  if (c.req.path === '/api/auth/login') {
    await next();
    return;
  }
  
  const authHeader = c.req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return c.json({ error: "Giriş yetkisi reddedildi. Token bulunamadı." }, 401);
  }

  try {
    const decoded = await verify(token, JWT_SECRET);
    c.set('user', decoded);
    await next();
  } catch (err) {
    return c.json({ error: "Geçersiz veya süresi dolmuş oturum anahtarı." }, 401);
  }
});

// Admin Route Gate
const requireSuperAdmin = async (c, next) => {
  const user = c.get('user');
  if (user && user.role === 'superadmin') {
    await next();
  } else {
    return c.json({ error: "Bu işlem için Süper Admin (90220) yetkisi gereklidir." }, 403);
  }
};

// ==========================================
// 1. AUTHENTICATION ENDPOINTS
// ==========================================

// Login User
app.post('/api/auth/login', async (c) => {
  try {
    const { username, password } = await c.req.json();
    if (!username || !password) {
      return c.json({ error: "Kullanıcı adı ve şifre zorunludur." }, 400);
    }

    const trimmedUsername = username.trim();
    const hashedPassword = await hashPassword(password);

    // Lookup user in Cloudflare D1 Database
    const user = await c.env.DB.prepare("SELECT * FROM users WHERE username = ?")
      .bind(trimmedUsername)
      .first();

    if (!user || user.password !== hashedPassword) {
      return c.json({ error: "Hatalı kullanıcı adı veya şifre." }, 401);
    }

    // Generate JWT Token
    const token = await sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET
    );

    return c.json({
      token,
      username: user.username,
      role: user.role
    });
  } catch (err) {
    console.error("Login failed:", err);
    return c.json({ error: "Sunucu hatası oluştu." }, 500);
  }
});

// Change Password
app.post('/api/auth/change-password', async (c) => {
  try {
    const currentUser = c.get('user');
    const { oldPassword, newPassword } = await c.req.json();
    if (!oldPassword || !newPassword) {
      return c.json({ error: "Eski ve yeni şifre alanları zorunludur." }, 400);
    }

    const user = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?")
      .bind(currentUser.id)
      .first();

    if (!user) {
      return c.json({ error: "Kullanıcı bulunamadı." }, 404);
    }

    const oldHashed = await hashPassword(oldPassword);
    if (user.password !== oldHashed) {
      return c.json({ error: "Eski şifreniz hatalı." }, 400);
    }

    const newHashed = await hashPassword(newPassword);
    await c.env.DB.prepare("UPDATE users SET password = ? WHERE id = ?")
      .bind(newHashed, currentUser.id)
      .run();

    return c.json({ message: "Şifreniz başarıyla güncellendi." });
  } catch (err) {
    return c.json({ error: "Sunucu hatası oluştu." }, 500);
  }
});

// ==========================================
// 2. SUPER ADMIN USER MANAGEMENT ENDPOINTS
// ==========================================

// Register New User (Süper Admin exclusive)
app.post('/api/auth/register', requireSuperAdmin, async (c) => {
  try {
    const { username, password, role } = await c.req.json();
    if (!username || !password) {
      return c.json({ error: "Kullanıcı adı ve şifre zorunludur." }, 400);
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.toLowerCase() === '90220') {
      return c.json({ error: "90220 adında başka bir hesap açılamaz." }, 400);
    }

    // Check availability
    const existing = await c.env.DB.prepare("SELECT id FROM users WHERE username = ?")
      .bind(trimmedUsername)
      .first();

    if (existing) {
      return c.json({ error: "Bu kullanıcı adı zaten alınmış." }, 400);
    }

    // Hash password & insert
    const hashedPassword = await hashPassword(password);
    const assignedRole = (role === 'superadmin') ? 'superadmin' : 'user';

    await c.env.DB.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)")
      .bind(trimmedUsername, hashedPassword, assignedRole)
      .run();

    return c.json({ message: `Kullanıcı '${trimmedUsername}' başarıyla oluşturuldu.` }, 201);
  } catch (err) {
    console.error("Registration failed:", err);
    return c.json({ error: "Sunucu hatası oluştu." }, 500);
  }
});

// Get Users List (Süper Admin exclusive)
app.get('/api/users', requireSuperAdmin, async (c) => {
  try {
    const { results } = await c.env.DB.prepare("SELECT id, username, role FROM users ORDER BY username ASC").all();
    return c.json(results);
  } catch (err) {
    return c.json({ error: "Sunucu hatası." }, 500);
  }
});

// Delete User Account (Süper Admin exclusive)
app.delete('/api/users/:id', requireSuperAdmin, async (c) => {
  try {
    const userIdToDelete = c.req.param('id');

    const targetUser = await c.env.DB.prepare("SELECT username, role FROM users WHERE id = ?")
      .bind(userIdToDelete)
      .first();

    if (!targetUser) {
      return c.json({ error: "Silinecek kullanıcı bulunamadı." }, 404);
    }

    if (targetUser.username === '90220' || targetUser.role === 'superadmin') {
      return c.json({ error: "Yönetici (Super Admin) hesapları bu şekilde silinemez!" }, 400);
    }

    // Cascading deletes on folders and notes
    await c.env.DB.prepare("DELETE FROM notes WHERE user_id = ?").bind(userIdToDelete).run();
    await c.env.DB.prepare("DELETE FROM folders WHERE user_id = ?").bind(userIdToDelete).run();
    await c.env.DB.prepare("DELETE FROM users WHERE id = ?").bind(userIdToDelete).run();

    return c.json({ message: "Kullanıcı hesabı ve tüm verileri silindi." });
  } catch (err) {
    return c.json({ error: "Sunucu hatası." }, 500);
  }
});

// ==========================================
// 3. FOLDERS CRUD API
// ==========================================

// Get Folders
app.get('/api/folders', async (c) => {
  try {
    const user = c.get('user');
    const { results } = await c.env.DB.prepare(
      "SELECT id, name, emoji, (user_id IS NULL) as is_global FROM folders WHERE user_id = ? OR user_id IS NULL ORDER BY name ASC"
    ).bind(user.id).all();
    return c.json(results);
  } catch (err) {
    return c.json({ error: "Veriler getirilirken hata oluştu." }, 500);
  }
});

// Create Folder
app.post('/api/folders', async (c) => {
  try {
    const user = c.get('user');
    const { id, name, emoji, isGlobal } = await c.req.json();
    if (!id || !name) {
      return c.json({ error: "Klasör kimliği ve adı zorunludur." }, 400);
    }

    const isSuperAdmin = user.role === 'superadmin';
    const folderUserId = (isGlobal && isSuperAdmin) ? null : user.id;

    await c.env.DB.prepare("INSERT INTO folders (id, user_id, name, emoji) VALUES (?, ?, ?, ?)")
      .bind(id, folderUserId, name, emoji || "📁")
      .run();

    return c.json({ message: "Klasör oluşturuldu." }, 201);
  } catch (err) {
    return c.json({ error: "Sunucu hatası." }, 500);
  }
});

// Delete Folder
app.delete('/api/folders/:id', async (c) => {
  try {
    const user = c.get('user');
    const folderId = c.req.param('id');

    const folder = await c.env.DB.prepare("SELECT user_id FROM folders WHERE id = ?")
      .bind(folderId)
      .first();

    if (!folder) {
      return c.json({ error: "Klasör bulunamadı." }, 404);
    }

    const isSuperAdmin = user.role === 'superadmin';
    if (folder.user_id === null && !isSuperAdmin) {
      return c.json({ error: "Sabit Genel Klasörleri sadece Süper Admin silebilir." }, 403);
    }

    if (folder.user_id !== null && folder.user_id !== user.id && !isSuperAdmin) {
      return c.json({ error: "Bu işlem için yetkiniz bulunmamaktadır." }, 403);
    }

    await c.env.DB.prepare("DELETE FROM folders WHERE id = ?").bind(folderId).run();
    await c.env.DB.prepare("UPDATE notes SET folder_id = 'none' WHERE folder_id = ?").bind(folderId).run();

    return c.json({ message: "Klasör silindi, içindeki notlar Klasörsüz kategorisine aktarıldı." });
  } catch (err) {
    return c.json({ error: "Sunucu hatası." }, 500);
  }
});

// ==========================================
// 4. NOTES CRUD API
// ==========================================

// Get Notes
app.get('/api/notes', async (c) => {
  try {
    const user = c.get('user');
    const { results } = await c.env.DB.prepare(
      "SELECT id, folder_id as folderId, title, content, color, created_at as createdAt, (user_id IS NULL) as is_global FROM notes WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC"
    ).bind(user.id).all();
    
    // Cloudflare D1 stores large integers accurately, but let's double ensure numeric format
    const formatted = results.map(n => ({
      ...n,
      createdAt: parseInt(n.createdAt),
      is_global: !!n.is_global
    }));

    return c.json(formatted);
  } catch (err) {
    return c.json({ error: "Notlar yüklenirken hata oluştu." }, 500);
  }
});

// Create Note
app.post('/api/notes', async (c) => {
  try {
    const user = c.get('user');
    const { id, folderId, title, content, color, isGlobal } = await c.req.json();
    if (!id || !content) {
      return c.json({ error: "Not içeriği boş olamaz." }, 400);
    }

    const isSuperAdmin = user.role === 'superadmin';
    const noteUserId = (isGlobal && isSuperAdmin) ? null : user.id;

    await c.env.DB.prepare("INSERT INTO notes (id, user_id, folder_id, title, content, color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(id, noteUserId, folderId || 'none', title || '', content, color || 'blue', Date.now())
      .run();

    return c.json({ message: "Not oluşturuldu." }, 201);
  } catch (err) {
    return c.json({ error: "Sunucu hatası." }, 500);
  }
});

// Update Note
app.put('/api/notes/:id', async (c) => {
  try {
    const user = c.get('user');
    const noteId = c.req.param('id');
    const { folderId, title, content, color, isGlobal } = await c.req.json();

    const note = await c.env.DB.prepare("SELECT user_id FROM notes WHERE id = ?")
      .bind(noteId)
      .first();

    if (!note) {
      return c.json({ error: "Not bulunamadı." }, 404);
    }

    const isSuperAdmin = user.role === 'superadmin';
    if (note.user_id === null && !isSuperAdmin) {
      return c.json({ error: "Sabit Genel Notları yalnızca Süper Admin düzenleyebilir." }, 403);
    }

    if (note.user_id !== null && note.user_id !== user.id && !isSuperAdmin) {
      return c.json({ error: "Bu işlem için yetkiniz yok." }, 403);
    }

    const noteUserId = (isGlobal && isSuperAdmin) ? null : (note.user_id || user.id);

    await c.env.DB.prepare("UPDATE notes SET user_id = ?, folder_id = ?, title = ?, content = ?, color = ?, created_at = ? WHERE id = ?")
      .bind(noteUserId, folderId || 'none', title || '', content, color || 'blue', Date.now(), noteId)
      .run();

    return c.json({ message: "Not güncellendi." });
  } catch (err) {
    return c.json({ error: "Sunucu hatası." }, 500);
  }
});

// Delete Note
app.delete('/api/notes/:id', async (c) => {
  try {
    const user = c.get('user');
    const noteId = c.req.param('id');

    const note = await c.env.DB.prepare("SELECT user_id FROM notes WHERE id = ?")
      .bind(noteId)
      .first();

    if (!note) {
      return c.json({ error: "Not bulunamadı." }, 404);
    }

    const isSuperAdmin = user.role === 'superadmin';
    if (note.user_id === null && !isSuperAdmin) {
      return c.json({ error: "Sabit Genel Notları yalnızca Süper Admin silebilir." }, 403);
    }

    if (note.user_id !== null && note.user_id !== user.id && !isSuperAdmin) {
      return c.json({ error: "Bu işlem için yetkiniz yok." }, 403);
    }

    await c.env.DB.prepare("DELETE FROM notes WHERE id = ?").bind(noteId).run();
    return c.json({ message: "Not başarıyla silindi." });
  } catch (err) {
    return c.json({ error: "Sunucu hatası." }, 500);
  }
});

// Fallback index landing page
app.get('/', (c) => {
  return c.text('PioNotes Cloudflare Worker API is running smoothly! 🍑✨');
});

export default app;
