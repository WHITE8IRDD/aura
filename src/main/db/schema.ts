import type Database from 'better-sqlite3'

type Migration = (db: Database.Database) => void

const MIGRATIONS: Migration[] = [
  (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS history (
        url TEXT PRIMARY KEY, title TEXT NOT NULL DEFAULT '',
        visited_at INTEGER NOT NULL, visit_count INTEGER NOT NULL DEFAULT 1
      );
      CREATE INDEX IF NOT EXISTS idx_history_visited ON history(visited_at DESC);
      CREATE INDEX IF NOT EXISTS idx_history_count ON history(visit_count DESC);
      CREATE TABLE IF NOT EXISTS bookmark_folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS bookmarks (
        id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT NOT NULL, title TEXT NOT NULL,
        folder_id INTEGER REFERENCES bookmark_folders(id) ON DELETE SET NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_bookmarks_folder ON bookmarks(folder_id);
      CREATE INDEX IF NOT EXISTS idx_bookmarks_url ON bookmarks(url);
      CREATE TABLE IF NOT EXISTS downloads (
        id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT NOT NULL, filename TEXT NOT NULL,
        save_path TEXT NOT NULL, mime_type TEXT,
        total_bytes INTEGER NOT NULL DEFAULT 0, received_bytes INTEGER NOT NULL DEFAULT 0,
        state TEXT NOT NULL DEFAULT 'progressing',
        started_at INTEGER NOT NULL, completed_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_downloads_started ON downloads(started_at DESC);
    `)
  },
  (db) => {
    db.exec(`
      ALTER TABLE bookmarks ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
      CREATE INDEX IF NOT EXISTS idx_bookmarks_sort ON bookmarks(sort_order);
    `)
    const rows = db.prepare('SELECT id FROM bookmarks ORDER BY created_at ASC').all() as { id: number }[]
    const update = db.prepare('UPDATE bookmarks SET sort_order = ? WHERE id = ?')
    let i = 0
    for (const row of rows) update.run(i++, row.id)
  },
  (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS reading_list (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL, title TEXT NOT NULL, excerpt TEXT,
        added_at INTEGER NOT NULL, read_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_reading_added ON reading_list(added_at DESC);
      CREATE INDEX IF NOT EXISTS idx_reading_read ON reading_list(read_at);
      CREATE TABLE IF NOT EXISTS boosts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        host TEXT NOT NULL, name TEXT NOT NULL, css TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_boosts_host ON boosts(host);
      CREATE TABLE IF NOT EXISTS sidebar_panels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL, title TEXT NOT NULL, icon_url TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_panels_sort ON sidebar_panels(sort_order);
    `)
  },
  (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        page_url TEXT, page_title TEXT,
        created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_ai_conv_updated ON ai_conversations(updated_at DESC);
      CREATE TABLE IF NOT EXISTS ai_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL, content TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_ai_msg_conv ON ai_messages(conversation_id);
    `)
  },
  (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `)
  },
  (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS tab_sessions (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        window_id    INTEGER NOT NULL DEFAULT 0,
        tab_order    INTEGER NOT NULL,
        url          TEXT NOT NULL,
        title        TEXT,
        pinned       INTEGER NOT NULL DEFAULT 0,
        group_id     INTEGER,
        updated_at   INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE INDEX IF NOT EXISTS idx_tab_sessions_order
        ON tab_sessions(window_id, tab_order);
      CREATE INDEX IF NOT EXISTS idx_tab_sessions_pinned
        ON tab_sessions(pinned, tab_order);
    `)
  },
  (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS autofill_profiles (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        label           TEXT NOT NULL DEFAULT 'Profile',
        full_name_enc   TEXT,
        given_name_enc  TEXT,
        family_name_enc TEXT,
        email_enc       TEXT,
        phone_enc       TEXT,
        organization_enc TEXT,
        street_enc      TEXT,
        city_enc        TEXT,
        region_enc      TEXT,
        postal_code_enc TEXT,
        country_enc     TEXT,
        created_at      INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at      INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE INDEX IF NOT EXISTS idx_autofill_updated
        ON autofill_profiles(updated_at DESC);
    `)
  },
  (db) => {
    db.exec(`
      DROP TABLE IF EXISTS ai_messages;
      DROP TABLE IF EXISTS ai_conversations;
      DELETE FROM settings WHERE key LIKE 'ai%';
      DELETE FROM settings WHERE key IN ('ntpShowGreeting', 'ntpShowMascot', 'ntpMascotStyle');
    `)
  }
]

export function runMigrations(db: Database.Database): void {
  const current = db.pragma('user_version', { simple: true }) as number
  for (let i = current; i < MIGRATIONS.length; i++) {
    db.transaction(() => {
      MIGRATIONS[i](db)
      db.pragma(`user_version = ${i + 1}`)
    })()
    console.log(`[Aura/db] Migrated to schema v${i + 1}`)
  }
}
