-- PioNotes Cloudflare D1 Serverless Database Schema Migration Script
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS folders;
DROP TABLE IF EXISTS notes;

-- Users Table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'user'
);

-- Folders Table
CREATE TABLE folders (
  id TEXT PRIMARY KEY,
  user_id INTEGER,
  name TEXT NOT NULL,
  emoji TEXT
);

-- Notes Table
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  user_id INTEGER,
  folder_id TEXT,
  title TEXT,
  content TEXT,
  color TEXT,
  created_at INTEGER
);

-- Pre-seed default Super Admin 90220
-- The password hash here is the SHA-256 of 'pionotes123'
INSERT INTO users (username, password, role) VALUES ('90220', 'b42f61cd3561a0961804fa1c74236a2818c306ea64ecab6eb78c90352ef29d0f', 'superadmin');
