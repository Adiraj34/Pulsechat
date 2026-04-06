# PulseChat

PulseChat is a full-stack chat application built with Next.js and SQLite. It supports sending and receiving messages, delete-for-me, delete-for-everyone, pinning, persistent storage, and lightweight real-time updates.

## Tech Stack

- Next.js 16 App Router
- React 19
- SQLite via `better-sqlite3`
- REST-style API routes

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- Send and view messages with timestamps
- Delete messages only for the current profile
- Delete messages for everyone with a visible placeholder
- Pin and unpin important messages
- Poll for updates every 2 seconds
- Persist chat data after refresh

## API Overview

- `GET /api/messages?userId=ava`
- `POST /api/messages`
- `DELETE /api/messages/:id?scope=me&userId=ava`
- `DELETE /api/messages/:id?scope=everyone`
- `PATCH /api/messages/:id/pin`

## Data Model

The app uses two SQLite tables:

- `messages` for content, sender, timestamps, pinned state, and deleted-for-everyone state
- `message_hidden` for per-user delete-for-me behavior

## Commit History

Meaningful commit history should reflect progress in steps instead of one large dump. A good pattern is:

1. `chore: scaffold the app`
2. `feat: add persistent chat APIs`
3. `feat: build the chat interface`
4. `docs: add setup and usage notes`

This repository is structured to support that kind of multi-step submission.
