const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Crear carpeta database si no existe
const dbDir = path.join(__dirname, '..', 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = process.env.DB_PATH || path.join(dbDir, 'sieme.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

// Crear tablas
function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      email TEXT,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS municipalities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      population INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS colonies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      municipality_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      population INTEGER,
      socioeconomic_level TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (municipality_id) REFERENCES municipalities(id)
    );

    CREATE TABLE IF NOT EXISTS vote_intention (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      colony_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      mc_percentage REAL,
      morena_percentage REAL,
      other_percentage REAL,
      undecided_percentage REAL,
      sample_size INTEGER,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (colony_id) REFERENCES colonies(id)
    );

    CREATE TABLE IF NOT EXISTS welfare_beneficiaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      colony_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      program_name TEXT NOT NULL,
      beneficiaries_count INTEGER,
      percentage_population REAL,
      new_beneficiaries INTEGER,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (colony_id) REFERENCES colonies(id)
    );

    CREATE TABLE IF NOT EXISTS perception (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      colony_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      welfare_perception REAL,
      mc_perception REAL,
      morena_perception REAL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (colony_id) REFERENCES colonies(id)
    );

    CREATE TABLE IF NOT EXISTS risk_assessment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      colony_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      risk_level TEXT NOT NULL,
      risk_score REAL,
      factors TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (colony_id) REFERENCES colonies(id)
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      colony_id INTEGER,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_by INTEGER,
      resolved_by INTEGER,
      created_at INTEGER NOT NULL,
      resolved_at INTEGER,
      FOREIGN KEY (colony_id) REFERENCES colonies(id),
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (resolved_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_colonies_municipality ON colonies(municipality_id);
    CREATE INDEX IF NOT EXISTS idx_vote_intention_colony_date ON vote_intention(colony_id, date);
    CREATE INDEX IF NOT EXISTS idx_welfare_colony_date ON welfare_beneficiaries(colony_id, date);
    CREATE INDEX IF NOT EXISTS idx_perception_colony_date ON perception(colony_id, date);
    CREATE INDEX IF NOT EXISTS idx_risk_colony_date ON risk_assessment(colony_id, date);
    CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
    CREATE INDEX IF NOT EXISTS idx_alerts_colony ON alerts(colony_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
  `);
}

// Limpiar sesiones expiradas
function cleanExpiredSessions() {
  const now = Date.now();
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
}

module.exports = {
  db,
  createTables,
  cleanExpiredSessions
};
