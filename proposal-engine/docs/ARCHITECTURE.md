# Proposal Engine – Architecture

## Overview

The Proposal Engine is a **fully isolated** full-stack module that lives inside the Rayenna CRM repository but operates completely independently.

```
proposal-engine/
├── backend/          # Express + TypeScript + Prisma (SQLite) — port 5001
├── frontend/         # React + TypeScript + Vite + Tailwind — port 5174
├── shared/           # Shared TypeScript types (no runtime deps)
└── docs/             # Documentation
```

## Isolation Guarantees

| Concern              | CRM (main)                       | Proposal Engine                  |
|----------------------|----------------------------------|----------------------------------|
| Database             | PostgreSQL (Neon, cloud)         | SQLite (local file `dev.db`)     |
| Backend port         | 3000                             | 5001                             |
| Frontend port        | 5173                             | 5174                             |
| Prisma schema        | `prisma/schema.prisma`           | `proposal-engine/backend/prisma/schema.prisma` |
| Environment file     | `.env` (root)                    | `proposal-engine/backend/.env`   |
| Node modules         | `node_modules/` (root)           | `proposal-engine/backend/node_modules/` + `proposal-engine/frontend/node_modules/` |
| Build output         | `dist/` (root) + `client/dist/`  | `proposal-engine/frontend/dist/` |

## Running Locally

### Backend
```bash
cd proposal-engine/backend
npm install
npx prisma migrate dev --name init
npm run dev
# → http://localhost:5001
# → GET /health returns { status: "ok", message: "Proposal Engine Running" }
```

### Frontend
```bash
cd proposal-engine/frontend
npm install
npm run dev
# → http://localhost:5174
```

## API Routes

| Method | Path              | Description                  |
|--------|-------------------|------------------------------|
| GET    | /health           | Health check                 |
| GET    | /api/proposals    | List all proposals           |
| GET    | /api/proposals/:id| Get proposal with full data  |
| POST   | /api/proposals    | Create proposal              |
| PATCH  | /api/proposals/:id| Update proposal              |
| DELETE | /api/proposals/:id| Delete proposal              |

## Data Models

- **Proposal** – top-level entity
- **CostingSheet** – line items attached to a proposal
- **BOM** – bill of materials items
- **ROICalculation** – financial metrics

## Planned Features

- [ ] Costing Sheet builder UI
- [ ] BOM editor with import/export
- [ ] AI Proposal generator (OpenAI integration, isolated key)
- [ ] ROI calculator with charts
- [ ] PDF export
- [ ] Email delivery
