import db from "@/lib/db";

function mapMessage(row) {
  return {
    id: row.id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    content: row.content,
    createdAt: row.created_at,
    isDeletedForEveryone: Boolean(row.is_deleted_for_everyone),
    isPinned: Boolean(row.is_pinned)
  };
}

export function listMessages(userId) {
  const query = `
    SELECT
      m.id,
      m.sender_id,
      m.sender_name,
      m.content,
      m.created_at,
      m.is_deleted_for_everyone,
      m.is_pinned
    FROM messages m
    LEFT JOIN message_hidden h
      ON h.message_id = m.id
      AND h.user_id = ?
    WHERE h.id IS NULL
    ORDER BY datetime(m.created_at) ASC, m.id ASC
  `;

  return db.prepare(query).all(userId).map(mapMessage);
}

export function createMessage({ senderId, senderName, content }) {
  const createdAt = new Date().toISOString();
  const result = db
    .prepare(
      `
        INSERT INTO messages (sender_id, sender_name, content, created_at)
        VALUES (?, ?, ?, ?)
      `
    )
    .run(senderId, senderName, content, createdAt);

  const row = db
    .prepare(
      `
        SELECT id, sender_id, sender_name, content, created_at, is_deleted_for_everyone, is_pinned
        FROM messages
        WHERE id = ?
      `
    )
    .get(result.lastInsertRowid);

  return mapMessage(row);
}

export function hideMessageForUser(messageId, userId) {
  const createdAt = new Date().toISOString();
  db.prepare(
    `
      INSERT OR IGNORE INTO message_hidden (message_id, user_id, created_at)
      VALUES (?, ?, ?)
    `
  ).run(messageId, userId, createdAt);
}

export function deleteMessageForEveryone(messageId) {
  db.prepare(
    `
      UPDATE messages
      SET content = 'This message was deleted for everyone.',
          is_deleted_for_everyone = 1,
          is_pinned = 0
      WHERE id = ?
    `
  ).run(messageId);
}

export function setPinnedState(messageId, pinned) {
  db.prepare(
    `
      UPDATE messages
      SET is_pinned = ?
      WHERE id = ? AND is_deleted_for_everyone = 0
    `
  ).run(pinned ? 1 : 0, messageId);
}

export function getMessageById(messageId) {
  const row = db
    .prepare(
      `
        SELECT id, sender_id, sender_name, content, created_at, is_deleted_for_everyone, is_pinned
        FROM messages
        WHERE id = ?
      `
    )
    .get(messageId);

  return row ? mapMessage(row) : null;
}
