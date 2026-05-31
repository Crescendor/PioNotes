// Premium dynamic Database connector supporting PostgreSQL (prod) and SQLite (dev/local fallback)
const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

let pgPool = null;
let sqliteDb = null;
const isPg = !!process.env.DATABASE_URL;

if (isPg) {
  console.log("Database: Connecting to PostgreSQL via environment URL...");
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Dynamic SSL compatibility for cloud setups like Railway
  });
} else {
  console.log("Database: Connecting to local SQLite file-base...");
  const dbPath = path.join(__dirname, 'database.sqlite');
  sqliteDb = new sqlite3.Database(dbPath);
}

// Global SQL adapter to translate ? placeholders into pg-compliant $1, $2 syntax dynamically
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (isPg) {
      let pgSql = sql;
      let count = 1;
      while (pgSql.includes('?')) {
        pgSql = pgSql.replace('?', `$${count}`);
        count++;
      }
      pgPool.query(pgSql, params, (err, res) => {
        if (err) return reject(err);
        resolve(res.rows);
      });
    } else {
      const isSelect = sql.trim().toLowerCase().startsWith('select');
      if (isSelect) {
        sqliteDb.all(sql, params, (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        });
      } else {
        sqliteDb.run(sql, params, function(err) {
          if (err) return reject(err);
          resolve({ lastID: this.lastID, changes: this.changes });
        });
      }
    }
  });
}

// Unified Database and schema initializer
async function initDb() {
  try {
    if (isPg) {
      // PostgreSQL Table initializations
      await query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'user'
        )
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS folders (
          id VARCHAR(255) PRIMARY KEY,
          user_id INT,
          name VARCHAR(255) NOT NULL,
          emoji VARCHAR(50)
        )
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS notes (
          id VARCHAR(255) PRIMARY KEY,
          user_id INT,
          folder_id VARCHAR(255),
          title VARCHAR(255),
          content TEXT,
          color VARCHAR(50),
          created_at BIGINT
        )
      `);
    } else {
      // SQLite Table initializations
      await query(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT DEFAULT 'user'
        )
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS folders (
          id TEXT PRIMARY KEY,
          user_id INTEGER,
          name TEXT NOT NULL,
          emoji TEXT
        )
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS notes (
          id TEXT PRIMARY KEY,
          user_id INTEGER,
          folder_id TEXT,
          title TEXT,
          content TEXT,
          color TEXT,
          created_at INTEGER
        )
      `);
    }

    // Auto-bootstrap Super Admin account (90220) if missing
    const admins = await query("SELECT * FROM users WHERE username = '90220'");
    if (admins.length === 0) {
      const defaultPassword = "pionotes123";
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      await query("INSERT INTO users (username, password, role) VALUES (?, ?, 'superadmin')", ["90220", hashedPassword]);
      console.log(`\n======================================================`);
      console.log(`[DATABASE INITIALIZATION]`);
      console.log(`Super Admin account '90220' auto-created successfully!`);
      console.log(`Default Password: ${defaultPassword}`);
      console.log(`Please change your password immediately after your first login.`);
      console.log(`======================================================\n`);
    }
  } catch (err) {
    console.error("Database schema initialization failed:", err);
  }
}

module.exports = {
  query,
  initDb,
  isPg
};
