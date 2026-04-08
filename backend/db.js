import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { ROLES, USER_STATUSES, RECORD_TYPES } from "@/backend/constants";

const configuredDatabasePath = process.env.DATABASE_PATH?.trim();
const configuredDataDirectory = process.env.DATABASE_DIR?.trim();

const dataDirectory = configuredDataDirectory
  ? path.resolve(configuredDataDirectory)
  : path.join(process.cwd(), "backend", "data");

const databasePath = configuredDatabasePath
  ? path.resolve(configuredDatabasePath)
  : path.join(dataDirectory, "finance-dashboard.db");

const databaseDirectory = path.dirname(databasePath);

if (!fs.existsSync(databaseDirectory)) {
  fs.mkdirSync(databaseDirectory, { recursive: true });
}

const db = new Database(databasePath, { timeout: 5000 });
db.pragma("busy_timeout = 5000");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK(role IN ('viewer', 'analyst', 'admin')),
    status TEXT NOT NULL CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS financial_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount_cents INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    category TEXT NOT NULL,
    record_date TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    created_by_user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(created_by_user_id) REFERENCES users(id)
  );
`);

let isInitialized = false;

function seedUsers() {
  const count = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
  if (count > 0) {
    return;
  }

  const now = new Date().toISOString();
  const users = [
    ["Arjun Mehta", "arjun.m@finveil.local", ROLES.ADMIN, USER_STATUSES.ACTIVE, now, now],
    ["Sara Khan", "sara.k@finveil.local", ROLES.ANALYST, USER_STATUSES.ACTIVE, now, now],
    ["Nisha Roy", "nisha.r@finveil.local", ROLES.VIEWER, USER_STATUSES.ACTIVE, now, now],
    ["Kabir Sen", "kabir.s@finveil.local", ROLES.ANALYST, USER_STATUSES.INACTIVE, now, now],
  ];

  const insert = db.prepare(`
    INSERT INTO users (name, email, role, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    for (const user of users) {
      insert.run(...user);
    }
  });

  transaction();
}

function seedRecords() {
  const count = db
    .prepare("SELECT COUNT(*) AS count FROM financial_records")
    .get().count;
  if (count > 0) {
    return;
  }

  const adminId = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get("arjun.m@finveil.local")?.id;

  if (!adminId) {
    return;
  }

  const baseNow = new Date().toISOString();
  const records = [
    [245000, RECORD_TYPES.INCOME, "Consulting", "2026-01-09", "Quarterly advisory retainer", adminId, baseNow, baseNow],
    [38000, RECORD_TYPES.EXPENSE, "Payroll", "2026-01-11", "Operations support stipend", adminId, baseNow, baseNow],
    [92000, RECORD_TYPES.EXPENSE, "Marketing", "2026-01-20", "Campaign spend for product launch", adminId, baseNow, baseNow],
    [276000, RECORD_TYPES.INCOME, "Subscriptions", "2026-02-03", "Annual enterprise subscription billing", adminId, baseNow, baseNow],
    [41000, RECORD_TYPES.EXPENSE, "Software", "2026-02-08", "Tooling and infrastructure licenses", adminId, baseNow, baseNow],
    [26500, RECORD_TYPES.EXPENSE, "Travel", "2026-02-17", "Client workshop travel reimbursement", adminId, baseNow, baseNow],
    [295500, RECORD_TYPES.INCOME, "Consulting", "2026-03-05", "Implementation milestone payment", adminId, baseNow, baseNow],
    [54000, RECORD_TYPES.EXPENSE, "Payroll", "2026-03-12", "Specialist contractor payout", adminId, baseNow, baseNow],
    [18500, RECORD_TYPES.EXPENSE, "Office", "2026-03-18", "Workspace and utilities", adminId, baseNow, baseNow],
    [321000, RECORD_TYPES.INCOME, "Investments", "2026-04-01", "Seed capital tranche credited", adminId, baseNow, baseNow],
    [48000, RECORD_TYPES.EXPENSE, "Operations", "2026-04-03", "Compliance and accounting services", adminId, baseNow, baseNow],
    [23500, RECORD_TYPES.EXPENSE, "Software", "2026-04-05", "Quarterly analytics suite renewal", adminId, baseNow, baseNow],
  ];

  const insert = db.prepare(`
    INSERT INTO financial_records (
      amount_cents,
      type,
      category,
      record_date,
      notes,
      created_by_user_id,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    for (const record of records) {
      insert.run(...record);
    }
  });

  transaction();
}

export function ensureDatabaseReady() {
  if (isInitialized) {
    return db;
  }

  seedUsers();
  seedRecords();
  isInitialized = true;
  return db;
}

export default db;
