# Rayenna CRM — documentation index

Authoritative engineering and operations docs live here. The repo root keeps only **[README.md](../README.md)** (quick start). Everything else is organized below.

**Do not move or delete** in-app help content:

| Location | Product | Purpose |
|----------|---------|---------|
| `client/public/help-docs/` | CRM | Live Help articles served at `/help` |
| `client/src/help/content/` | CRM | Edit source — mirror to `public/help-docs/` before release |
| `src/content/consumer-help/` | Solar Hub | Homeowner help articles (API + seed) |

---

## Architecture & product

| Doc | Description |
|-----|-------------|
| [architecture/product-overview.md](./architecture/product-overview.md) | Functional overview, roles, main modules |
| [architecture/rayenna-crm-briefing.md](./architecture/rayenna-crm-briefing.md) | Onboarding brief for developers and stakeholders |
| [architecture/rayenna-crm-architecture.md](./architecture/rayenna-crm-architecture.md) | System topology, API map, data model, integrations |

## Deployment

| Doc | Description |
|-----|-------------|
| [deployment/vercel-parallel-deployment-plan.md](./deployment/vercel-parallel-deployment-plan.md) | **Primary** — dual frontend (Render + Vercel), env, CORS |
| [deployment/proposal-engine-vercel-deployment.md](./deployment/proposal-engine-vercel-deployment.md) | Proposal Engine static site on Vercel |
| [deployment/deployment-architecture.md](./deployment/deployment-architecture.md) | High-level deploy topology |

## Setup

| Doc | Description |
|-----|-------------|
| [setup/github-setup-complete-guide.md](./setup/github-setup-complete-guide.md) | GitHub repo, branches, CI, collaboration |

## Operations

| Doc | Description |
|-----|-------------|
| [operations/crm-smoke-checklist.md](./operations/crm-smoke-checklist.md) | Manual regression after CRM changes or deploy |
| [operations/pe-image-storage-migration-plan.md](./operations/pe-image-storage-migration-plan.md) | When to migrate PE images from DB TOAST to Cloudinary |
| [operations/uptime-robot-setup.md](./operations/uptime-robot-setup.md) | Uptime monitoring (if used) |

## Proposal Engine

| Doc | Description |
|-----|-------------|
| [proposal-engine/architecture.md](./proposal-engine/architecture.md) | PE structure, CRM integration, deploy |
| [proposal-engine/api-contract.md](./proposal-engine/api-contract.md) | API shapes and endpoints |
| [proposal-engine/smoke-checklist.md](./proposal-engine/smoke-checklist.md) | PE manual smoke tests |

App README: [proposal-engine/README.md](../proposal-engine/README.md)

## History (reference)

| Doc | Description |
|-----|-------------|
| [history/modernization-progress-crm.md](./history/modernization-progress-crm.md) | CRM modernization log — terminology, batches, file map |

## Legal

| Doc | Description |
|-----|-------------|
| [legal/copyright.txt](./legal/copyright.txt) | Copyright notice |

---

## Obsolete docs

Superseded session notes, one-off deploy guides, and legacy help trees are in **[../Bin/](../Bin/)** for your review before permanent deletion.
