# Proposal Engine

A **fully isolated** full-stack module for generating costing sheets, bills of materials, AI-based proposals, and ROI calculations.

> ⚠️ This module is completely independent from the main Rayenna CRM. It does NOT share any database, environment variables, API routes, or build pipeline.

## Quick Start

### 1. Backend (port 5001)

```bash
cd proposal-engine/backend
npm install
npx prisma migrate dev --name init
npm run dev
```

Test: `curl http://localhost:5001/health`

Expected response:
```json
{
  "status": "ok",
  "message": "Proposal Engine Running",
  "module": "proposal-engine",
  "version": "1.0.0"
}
```

### 2. Frontend (port 5174)

```bash
cd proposal-engine/frontend
npm install
npm run dev
```

Open: http://localhost:5174

## Structure

```
proposal-engine/
├── backend/
│   ├── prisma/schema.prisma   # SQLite schema (isolated)
│   ├── src/
│   │   ├── index.ts           # Entry point
│   │   ├── app.ts             # Express app
│   │   ├── lib/prisma.ts      # Prisma client
│   │   └── routes/
│   │       ├── health.ts      # GET /health
│   │       └── proposals.ts   # CRUD /api/proposals
│   ├── .env                   # Local env (not committed)
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── pages/
│   │       ├── Dashboard.tsx  # Landing page
│   │       └── NotFound.tsx
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── package.json
├── shared/
│   └── types.ts               # Shared TypeScript interfaces
└── docs/
    └── ARCHITECTURE.md
```

## Ports

| Service  | Port |
|----------|------|
| Backend  | 5001 |
| Frontend | 5174 |

## See Also

- [Architecture](./docs/ARCHITECTURE.md)
