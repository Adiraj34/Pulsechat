import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dataDirectory = path.join(process.cwd(), "data");
const databasePath = path.join(dataDirectory, "chat.db");

if (!fs.existsSync(dataDirectory)) {
  fs.mkdirSync(dataDirectory, { recursive: true });
}

const db = new Database(databasePath, { timeout: 5000 });
db.pragma("busy_timeout = 5000");
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    is_deleted_for_everyone INTEGER NOT NULL DEFAULT 0,
    is_pinned INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS message_hidden (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(message_id, user_id),
    FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE
  );
`);

export default db;
