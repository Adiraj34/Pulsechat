import db, { ensureDatabaseReady } from "@/backend/db";
import { notFound } from "@/backend/lib/errors";

function mapRecord(row) {
  return {
    id: row.id,
    amount: Number((row.amount_cents / 100).toFixed(2)),
    amountCents: row.amount_cents,
    type: row.type,
    category: row.category,
    date: row.record_date,
    notes: row.notes,
    createdByUserId: row.created_by_user_id,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listRecords({ filters = {}, pagination }) {
  ensureDatabaseReady();
  const conditions = [];
  const params = [];

  if (filters.type) {
    conditions.push("r.type = ?");
    params.push(filters.type);
  }

  if (filters.category) {
    conditions.push("r.category = ?");
    params.push(filters.category);
  }

  if (filters.dateFrom) {
    conditions.push("r.record_date >= ?");
    params.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    conditions.push("r.record_date <= ?");
    params.push(filters.dateTo);
  }

  if (filters.search) {
    conditions.push("LOWER(r.notes) LIKE ?");
    params.push(`%${filters.search.toLowerCase()}%`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const total = db
    .prepare(`SELECT COUNT(*) AS count FROM financial_records r ${whereClause}`)
    .get(...params).count;

  const rows = db
    .prepare(
      `
        SELECT
          r.id,
          r.amount_cents,
          r.type,
          r.category,
          r.record_date,
          r.notes,
          r.created_by_user_id,
          r.created_at,
          r.updated_at,
          u.name AS created_by_name
        FROM financial_records r
        JOIN users u ON u.id = r.created_by_user_id
        ${whereClause}
        ORDER BY r.record_date DESC, r.id DESC
        LIMIT ? OFFSET ?
      `,
    )
    .all(...params, pagination.pageSize, pagination.offset)
    .map(mapRecord);

  return {
    records: rows,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
    },
  };
}

export function getRecordById(recordId) {
  ensureDatabaseReady();
  const row = db
    .prepare(
      `
        SELECT
          r.id,
          r.amount_cents,
          r.type,
          r.category,
          r.record_date,
          r.notes,
          r.created_by_user_id,
          r.created_at,
          r.updated_at,
          u.name AS created_by_name
        FROM financial_records r
        JOIN users u ON u.id = r.created_by_user_id
        WHERE r.id = ?
      `,
    )
    .get(recordId);

  return row ? mapRecord(row) : null;
}

export function createRecord({ amountCents, type, category, date, notes, createdByUserId }) {
  ensureDatabaseReady();
  const timestamp = new Date().toISOString();
  const result = db
    .prepare(
      `
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
      `,
    )
    .run(amountCents, type, category, date, notes || "", createdByUserId, timestamp, timestamp);

  return getRecordById(result.lastInsertRowid);
}

export function updateRecord(recordId, data) {
  ensureDatabaseReady();
  const existing = getRecordById(recordId);
  if (!existing) {
    throw notFound("Financial record not found.");
  }

  const nextAmountCents = data.amountCents ?? existing.amountCents;
  const nextType = data.type ?? existing.type;
  const nextCategory = data.category ?? existing.category;
  const nextDate = data.date ?? existing.date;
  const nextNotes = data.notes ?? existing.notes;
  const updatedAt = new Date().toISOString();

  db.prepare(
    `
      UPDATE financial_records
      SET amount_cents = ?, type = ?, category = ?, record_date = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `,
  ).run(nextAmountCents, nextType, nextCategory, nextDate, nextNotes, updatedAt, recordId);

  return getRecordById(recordId);
}

export function deleteRecord(recordId) {
  ensureDatabaseReady();
  const existing = getRecordById(recordId);
  if (!existing) {
    throw notFound("Financial record not found.");
  }

  db.prepare("DELETE FROM financial_records WHERE id = ?").run(recordId);
  return existing;
}

export function listCategories() {
  ensureDatabaseReady();
  return db
    .prepare(
      `
        SELECT category, COUNT(*) AS record_count
        FROM financial_records
        GROUP BY category
        ORDER BY category COLLATE NOCASE ASC
      `,
    )
    .all()
    .map((row) => ({
      category: row.category,
      recordCount: row.record_count,
    }));
}
