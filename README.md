# FinVeil Control Center

FinVeil Control Center is a full-stack finance dashboard submission built for the **Finance Data Processing and Access Control Backend** assignment. It combines a role-aware backend with a polished frontend so the reviewer can inspect APIs, permissions, validations, and dashboard workflows in one runnable project.

## What This Project Covers

This implementation directly addresses the assignment requirements:

- User creation and management
- Role-based access control for `viewer`, `analyst`, and `admin`
- Active and inactive user states
- Financial record CRUD with filtering and pagination
- Dashboard summary APIs for totals, category breakdowns, recent activity, and monthly trends
- Backend validation and structured error handling
- Persistent storage using SQLite
- A basic but polished frontend that demonstrates the backend behavior clearly

## Tech Stack

- Next.js 16 (App Router)
- React 19
- SQLite with `better-sqlite3`
- REST-style API routes

## Why This Structure

The project keeps page/UI concerns and backend logic separate while still staying simple to run:

- `app/` contains the Next.js entry points and API route exports
- `backend/` contains database setup, business logic, validation, auth/access control, and route handlers
- `frontend/` contains the dashboard UI and styling
- `backend/data/` stores the local SQLite database file

This keeps the architecture easy to review without overengineering the assignment.

## Local Setup

### Prerequisites

- Node.js 20+
- npm 10+

### Install and Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Check

```bash
npm run build
npm start
```

## Seeded Demo Users

The app ships with seeded users so the reviewer can immediately test permissions from the frontend.

| Name | Role | Status | Purpose |
| --- | --- | --- | --- |
| Arjun Mehta | Admin | Active | Full access to users and records |
| Sara Khan | Analyst | Active | Can read records and dashboard insights |
| Nisha Roy | Viewer | Active | Can read dashboard summaries only |
| Kabir Sen | Analyst | Inactive | Demonstrates inactive access restriction |

The frontend includes a role switcher that changes the acting user context. Backend authorization is still enforced server-side through the `x-user-id` header.

## Assignment Mapping

### 1. User and Role Management

Implemented through:

- `GET /api/users`
- `POST /api/users`
- `GET /api/users/:id`
- `PATCH /api/users/:id`

Behavior:

- Admins can create users and update roles/status
- All active authenticated users can read the user directory
- Inactive users are blocked from access entirely

### 2. Financial Records Management

Implemented through:

- `GET /api/records`
- `POST /api/records`
- `GET /api/records/:id`
- `PATCH /api/records/:id`
- `DELETE /api/records/:id`

Supported fields:

- `amount`
- `type`
- `category`
- `date`
- `notes`

Supported filters:

- `type`
- `category`
- `dateFrom`
- `dateTo`
- `search`
- pagination via `page` and `pageSize`

### 3. Dashboard Summary APIs

Implemented through:

- `GET /api/dashboard/summary?months=6`

Returns:

- total income
- total expenses
- net balance
- category-wise totals
- recent activity
- monthly trend data
- counts of income and expense records

### 4. Access Control Logic

Implemented in backend helpers and enforced by route handlers.

Permission model:

- `viewer`: can read dashboard summaries only
- `analyst`: can read dashboard summaries and financial records
- `admin`: can manage users and fully manage financial records

Access is enforced in the backend, not only in the UI.

### 5. Validation and Error Handling

The backend validates:

- missing or malformed JSON bodies
- invalid user roles or statuses
- invalid email format
- invalid record types
- invalid date format
- invalid amount values
- invalid pagination values
- invalid date range filters

Errors return appropriate HTTP status codes such as `400`, `401`, `403`, `404`, and `500`.

### 6. Data Persistence

SQLite is used for local persistence. The database file is created automatically at:

- `backend/data/finance-dashboard.db`

The app seeds initial users and records on first run.

## API Reference

### Authentication Context

This project uses mock authentication to keep the assignment focused on backend design.

Pass the acting user with:

- request header: `x-user-id: <userId>`

The frontend already does this automatically.

### `GET /api/users`

Returns all users.

Example response:

```json
{
  "users": [
    {
      "id": 1,
      "name": "Arjun Mehta",
      "email": "arjun.m@finveil.local",
      "role": "admin",
      "status": "active",
      "createdAt": "2026-04-08T00:00:00.000Z",
      "updatedAt": "2026-04-08T00:00:00.000Z"
    }
  ]
}
```

### `POST /api/users`

Admin only.

Request body:

```json
{
  "name": "Mira Das",
  "email": "mira.d@finveil.local",
  "role": "viewer",
  "status": "active"
}
```

### `PATCH /api/users/:id`

Admin only. Supports partial updates.

Example body:

```json
{
  "role": "analyst",
  "status": "inactive"
}
```

### `GET /api/records`

Analyst or admin only.

Query params:

- `page`
- `pageSize`
- `type`
- `category`
- `dateFrom`
- `dateTo`
- `search`

### `POST /api/records`

Admin only.

Request body:

```json
{
  "amount": 12500,
  "type": "income",
  "category": "Consulting",
  "date": "2026-04-08",
  "notes": "Advisory engagement payment"
}
```

### `PATCH /api/records/:id`

Admin only. Supports partial updates.

### `DELETE /api/records/:id`

Admin only.

### `GET /api/dashboard/summary?months=6`

Available to viewer, analyst, and admin users.

## Frontend Notes

The frontend is intentionally included even though the assignment is backend-heavy because it helps demonstrate:

- permission-aware rendering
- record creation and editing flows
- user management flows
- dashboard aggregation output
- role switching for quick evaluation

It is not just a CRUD table pasted on top of APIs; the UI is designed to make the backend logic obvious during review.

## Key Design Decisions

- **SQLite for simplicity**: zero external setup, deterministic local behavior, persistent storage
- **Mock auth via header**: enough to demonstrate access control without adding unnecessary auth complexity
- **Service-style backend modules**: keeps route handlers thin and business logic reusable
- **Strict backend enforcement**: UI hides actions, but server checks are the real source of truth
- **Seed data**: makes the project reviewable immediately after `npm install` and `npm run dev`

## Assumptions and Tradeoffs

### Assumptions

- The assignment values backend reasoning more than full authentication implementation
- One local SQLite database is sufficient for this assessment scope
- Amounts are stored internally in paise/cents (`amount_cents`) to avoid floating point persistence issues

### Tradeoffs

- Authentication is mocked rather than token-based to keep scope focused
- SQLite is ideal for local demo and assessment work, but not for horizontally scaled production systems
- The dashboard summary is global rather than scoped per user because the assignment describes a shared finance dashboard system

## Nice-to-Have Enhancements Included

- pagination for record listing
- note search filter
- seeded sample data
- responsive UI
- mock multi-user switching for access-control demonstration

## If You Want To Deploy

This project can be deployed as a standard Next.js app. For persistent hosting, the main consideration would be using a persistent filesystem or swapping SQLite for a managed database.

## Submission Summary

This repository is meant to be upload-ready as-is. It demonstrates:

- backend architecture and separation of concerns
- business logic and access rules
- financial data processing
- validation and API behavior
- persistence and seeded sample data
- a reviewer-friendly frontend for fast evaluation
