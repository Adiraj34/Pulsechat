# PulseChat

PulseChat is a full-stack chat application built with Next.js and SQLite. It supports sending and receiving messages, delete-for-me, delete-for-everyone, pinning, persistent storage, and lightweight real-time updates.

## Submission Links

- Public GitHub Repository: https://github.com/Adiraj34/Pulsechat
- Live Deployed Application: Pending deployment

## Project Overview

PulseChat is a team chat room that demonstrates real-world message workflows:

- Send and read messages in a shared room
- Delete a message only for the current user profile (delete-for-me)
- Delete a message for all users with an audit-friendly placeholder
- Pin and unpin important messages
- Persist messages in SQLite and restore on refresh
- Poll for updates to simulate near real-time behavior

## Project Structure

- frontend/ contains UI files (chat page and global styles).
- backend/ contains server-side modules (database, message services, and route handlers).
- app/ contains thin Next.js entry files for pages and API route mapping.
- backend/data/ stores SQLite database files.

## Tech Stack

- Next.js 16 App Router
- React 19
- SQLite via `better-sqlite3`
- REST-style API routes

## Run Locally

### Prerequisites

- Node.js 20+
- npm 10+

### Installation and Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build Check

```bash
npm run build
npm start
```

## Features

- Send and view messages with timestamps
- Delete messages only for the current profile
- Delete messages for everyone with a visible placeholder
- Pin and unpin important messages
- Poll for updates every 2 seconds
- Persist chat data after refresh

## Approach and Design Decisions

- Next.js App Router was used so the page and API handlers live in one framework while still supporting clear frontend/backend module boundaries.
- A dedicated frontend folder keeps UI logic isolated from server concerns.
- A dedicated backend folder keeps data access and route handlers modular and reusable.
- SQLite with better-sqlite3 was selected for a zero-setup local database and deterministic behavior.
- Message deletion for everyone keeps a placeholder instead of hard-delete for better conversation traceability.
- Polling every 2 seconds was chosen over websockets to keep the implementation lightweight and easy to run.

## Tradeoffs and Assumptions

### Tradeoffs

- Polling is simpler than websockets but less efficient for high-scale real-time updates.
- SQLite is easy for local and small deployments but not ideal for horizontally scaled multi-instance production.
- The app uses a shared room model without channels/threads to keep scope focused.

### Assumptions

- User identity is simulated by profile switching in the UI (no authentication system).
- Message payloads are trusted only after backend validation.
- A message deleted for everyone should remain visible as a deletion notice.

## API Documentation

### Base URL

- Local: http://localhost:3000
- Production: use your deployed domain

### Endpoints

1. GET /api/messages?userId=ava

- Description: returns all visible messages for a given user profile.
- Query params:
  - userId (required)
- Success response: 200

```json
{
  "messages": [
    {
      "id": 1,
      "senderId": "ava",
      "senderName": "Ava Patel",
      "content": "Daily update",
      "createdAt": "2026-04-06T12:08:05.946Z",
      "isDeletedForEveryone": false,
      "isPinned": true
    }
  ]
}
```

2. POST /api/messages

- Description: creates a new message.
- Request body:

```json
{
  "senderId": "ava",
  "senderName": "Ava Patel",
  "content": "Hello team"
}
```

- Success response: 201

```json
{
  "message": {
    "id": 2,
    "senderId": "ava",
    "senderName": "Ava Patel",
    "content": "Hello team",
    "createdAt": "2026-04-06T12:10:00.000Z",
    "isDeletedForEveryone": false,
    "isPinned": false
  }
}
```

3. DELETE /api/messages/:id?scope=me&userId=ava

- Description: hides the message only for the specified user profile.
- Query params:
  - scope=me
  - userId (required when scope is me)

4. DELETE /api/messages/:id?scope=everyone

- Description: marks the message as deleted for everyone and replaces content with a deletion notice.

5. PATCH /api/messages/:id/pin

- Description: pins or unpins a message.
- Request body:

```json
{
  "pinned": true
}
```

### Error Handling

- Invalid requests return 400 with an error message.
- Not found resources return 404 with an error message.

## Data Model

The app uses two SQLite tables:

- messages for content, sender, timestamps, pinned state, and deleted-for-everyone state
- message_hidden for per-user delete-for-me behavior

Database files are stored in backend/data/.

## Commit History

Meaningful commit history should reflect progress in steps instead of one large dump. A good pattern is:

1. chore: scaffold the app
2. feat: add persistent chat APIs
3. feat: build the chat interface
4. docs: add setup and usage notes

This repository is structured to support that kind of multi-step submission.
