import db, { ensureDatabaseReady } from "@/backend/db";
import { notFound, badRequest } from "@/backend/lib/errors";

function mapUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listUsers({ status } = {}) {
  ensureDatabaseReady();
  let query = `
    SELECT id, name, email, role, status, created_at, updated_at
    FROM users
  `;
  const params = [];

  if (status) {
    query += " WHERE status = ?";
    params.push(status);
  }

  query += " ORDER BY name COLLATE NOCASE ASC, id ASC";

  return db.prepare(query).all(...params).map(mapUser);
}

export function getUserById(userId) {
  ensureDatabaseReady();
  const row = db
    .prepare(
      `
        SELECT id, name, email, role, status, created_at, updated_at
        FROM users
        WHERE id = ?
      `,
    )
    .get(userId);

  return row ? mapUser(row) : null;
}

export function getUserByEmail(email) {
  ensureDatabaseReady();
  const row = db
    .prepare(
      `
        SELECT id, name, email, role, status, created_at, updated_at
        FROM users
        WHERE email = ?
      `,
    )
    .get(email);

  return row ? mapUser(row) : null;
}

export function createUser({ name, email, role, status }) {
  ensureDatabaseReady();
  const existingUser = getUserByEmail(email);
  if (existingUser) {
    throw badRequest("A user with this email already exists.");
  }

  const timestamp = new Date().toISOString();
  const result = db
    .prepare(
      `
        INSERT INTO users (name, email, role, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
    )
    .run(name, email, role, status, timestamp, timestamp);

  return getUserById(result.lastInsertRowid);
}

export function updateUser(userId, data) {
  ensureDatabaseReady();
  const user = getUserById(userId);
  if (!user) {
    throw notFound("User not found.");
  }

  const nextName = data.name ?? user.name;
  const nextEmail = data.email ?? user.email;
  const nextRole = data.role ?? user.role;
  const nextStatus = data.status ?? user.status;

  const emailOwner = getUserByEmail(nextEmail);
  if (emailOwner && emailOwner.id !== user.id) {
    throw badRequest("A user with this email already exists.");
  }

  const updatedAt = new Date().toISOString();
  db.prepare(
    `
      UPDATE users
      SET name = ?, email = ?, role = ?, status = ?, updated_at = ?
      WHERE id = ?
    `,
  ).run(nextName, nextEmail, nextRole, nextStatus, updatedAt, userId);

  return getUserById(userId);
}
