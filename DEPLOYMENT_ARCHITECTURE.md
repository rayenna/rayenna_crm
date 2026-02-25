# Rayenna CRM - Deployment Architecture

## Executive Summary

Rayenna CRM is a modern, cloud-native Customer Relationship Management system built for Rayenna Energy's solar EPC operations. The platform is deployed on a unified cloud infrastructure with enterprise-grade security, automatic scaling, and continuous deployment. The **frontend runs on two production hosts in parallel**—Render (Static Site) and Vercel—for business continuity; both use the same codebase and the same Render backend API.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    USERS                                             │
│                     (Desktop / Tablet / Mobile Browsers)                             │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ HTTPS
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Dual deployment – same app, two hosts)                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                        React Single Page Application                         │   │
│  │  • React 18 + TypeScript          • Tailwind CSS (UI Framework)              │   │
│  │  • Vite (Build Tool)              • React Query (Server State)               │   │
│  │  • React Router (Navigation)      • Recharts (Analytics Dashboards)           │   │
│  │  • React Hook Form (Forms)        • Sentry (Error Tracking)                   │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│  • Render: rayenna-crm-frontend.onrender.com  • Vercel: e.g. rayennacrm.vercel.app   │
│  Single build (client/); env via VITE_*; no platform-specific code                  │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ REST API (HTTPS)
                                        │ JWT Authentication
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          BACKEND API (Render Web Service)                            │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                         Node.js + Express Server                             │   │
│  │  • TypeScript                     • JWT Authentication                       │   │
│  │  • Express Validator              • Rate Limiting                            │   │
│  │  • Prisma ORM                     • CORS (Render + Vercel origins)           │   │
│  │  • Sentry (Error Tracking)        • PDF Generation (PDFKit)                  │   │
│  │  • Excel Export (xlsx)            • Multer (File Uploads)                     │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│  URL: e.g. rayenna-crm.onrender.com  • Serves both Render and Vercel frontends       │
└─────────────────────────────────────────────────────────────────────────────────────┘
                        │                               │
           ┌────────────┴────────────┐     ┌───────────┴───────────┐
           │                         │     │                       │
           ▼                         ▼     ▼                       ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────────────────┐
│   DATABASE (Neon)   │  │ FILE STORAGE        │  │      EXTERNAL SERVICES          │
│                     │  │ (Cloudinary)        │  │                                 │
│  ┌───────────────┐  │  │                     │  │  ┌───────────────────────────┐  │
│  │  PostgreSQL   │  │  │  • Documents        │  │  │  OpenAI API               │  │
│  │  (Serverless) │  │  │  • Images           │  │  │  • AI-powered features    │  │
│  │               │  │  │  • Proposals        │  │  │  • Smart suggestions      │  │
│  │  • Auto-scale │  │  │  • Attachments      │  │  └───────────────────────────┘  │
│  │  • SSL        │  │  │                     │  │                                 │
│  │  • Backups    │  │  │  • CDN Delivery     │  │  ┌───────────────────────────┐  │
│  │  • Branching  │  │  │  • Auto-optimize    │  │  │  Sentry                   │  │
│  └───────────────┘  │  │  • Secure URLs      │  │  │  • Error monitoring       │  │
└─────────────────────┘  └─────────────────────┘  │  │  • Performance tracking   │  │
                                                   │  └───────────────────────────┘  │
                                                   └─────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            DEVELOPMENT & CI/CD (GitHub)                              │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │  • Version Control               • Automatic Deployments on Push             │   │
│  │  • Code Reviews                  • Branch Protection                         │   │
│  │  • Issue Tracking                • Deployment History                        │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Frontend & Backend Hosting

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (dual deployment – business continuity)             │
│                                                                                      │
│   ┌─────────────────────────────┐      ┌─────────────────────────────┐              │
│   │   RENDER STATIC SITE         │      │   VERCEL                    │              │
│   │   (Frontend)                 │      │   (Frontend)                 │              │
│   │                              │      │                             │              │
│   │  • Same React SPA             │      │  • Same React SPA           │              │
│   │  • rootDir: client            │      │  • Root Directory: client   │              │
│   │  • npm run build → dist/      │      │  • Same build → dist/       │              │
│   │  • VITE_* env in dashboard    │      │  • VITE_* env in project     │              │
│   └──────────────┬───────────────┘      └──────────────┬──────────────┘              │
│                  │                                      │                            │
│                  └──────────────────┬───────────────────┘                            │
│                                     │ REST API (HTTPS)                                │
│                                     ▼                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│   │                    RENDER WEB SERVICE (Backend API)                             │ │
│   │  • Node.js + Express  • CORS allows Render + *.vercel.app  • Single backend      │ │
│   └─────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Hosting | Purpose |
|-------|------------|---------|---------|
| **Frontend** | React 18 + TypeScript + Vite | Render Static Site **and** Vercel | Same SPA on both; business continuity |
| **Styling** | Tailwind CSS | - | Consistent, mobile-first design |
| **Backend** | Node.js + Express + TypeScript | Render Web Service | RESTful API server (serves both frontends) |
| **ORM** | Prisma | - | Type-safe database access |
| **Database** | PostgreSQL (Serverless) | Neon | Scalable data storage |
| **File Storage** | CDN-backed media | Cloudinary | Document & image management |
| **Authentication** | JWT | - | Secure, stateless auth |
| **AI Services** | OpenAI API | OpenAI | Intelligent features |
| **Monitoring** | Sentry | Sentry.io | Error tracking & performance |
| **Version Control** | Git | GitHub | CI/CD & collaboration |

---

## Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    User      │     │   Frontend   │     │   Backend    │
│   Browser    │────►│    React     │────►│   Express    │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                    ┌─────────────────────────────┼─────────────────────────────┐
                    │                             │                             │
                    ▼                             ▼                             ▼
           ┌──────────────┐             ┌──────────────┐             ┌──────────────┐
           │     Neon     │             │  Cloudinary  │             │   OpenAI     │
           │  PostgreSQL  │             │    Files     │             │     API      │
           │              │             │              │             │              │
           │ • Customers  │             │ • Documents  │             │ • AI         │
           │ • Projects   │             │ • Images     │             │   Features   │
           │ • Leads      │             │ • Proposals  │             │ • Smart      │
           │ • Invoices   │             │ • Artifacts  │             │   Suggest    │
           └──────────────┘             └──────────────┘             └──────────────┘
```

---

## Deployment Pipeline

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────────────────────────────────────────────┐
│  Developer  │────►│   GitHub    │────►│  RENDER (frontend + backend)   VERCEL (frontend only)   │
│  Git Push   │     │    main     │     │                                                         │
└─────────────┘     └─────────────┘     │   ┌─────────────────┐   ┌─────────────────┐   ┌──────────────┐ │
                                        │   │ Static Site     │   │ Web Service     │   │ Frontend     │ │
                                        │   │ (client/)       │   │ (Backend)       │   │ (client/)    │ │
                                        │   │ • npm install   │   │ • npm install   │   │ • same build │ │
                                        │   │ • npm run build │   │ • prisma gen    │   │ • dist/      │ │
                                        │   │ • publish dist/ │   │ • prisma mig    │   │ • SPA routes │ │
                                        │   │                 │   │ • tsc build     │   │              │ │
                                        │   └────────┬────────┘   └────────┬────────┘   └──────┬───────┘ │
                                        │            │                    │                    │         │
                                        │            └────────────────────┼────────────────────┘         │
                                        │                                 │  Both frontends → same API   │
                                        └─────────────────────────────────┴───────────────────────────────┘
```

---

## Security Architecture

| Security Layer | Implementation |
|----------------|----------------|
| **Authentication** | JWT tokens with secure secrets |
| **Session Security** | Auto-logout on browser close |
| | 5-minute inactivity timeout with warning |
| **Transport Security** | HTTPS/SSL on all connections |
| **CORS Policy** | Whitelist-only: Render (*.onrender.com) and Vercel (*.vercel.app) frontend origins |
| **Rate Limiting** | API request throttling |
| **Data Encryption** | SSL database connections |
| **Input Validation** | Express Validator on all endpoints |
| **Sensitive Data** | Passwords/tokens never logged (Sentry scrubbing) |
| **Access Control** | Role-based (Admin, Sales, Operations) |

---

## Security Flow

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│                              SECURITY LAYERS                                        │
│                                                                                     │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐            │
│  │   HTTPS     │──►│    CORS     │──►│    JWT      │──►│   Role      │            │
│  │   SSL/TLS   │   │  Whitelist  │   │   Auth      │   │   Check     │            │
│  └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘            │
│                                                                                     │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                              │
│  │    Rate     │   │   Input     │   │  Sensitive  │                              │
│  │   Limiting  │   │ Validation  │   │  Scrubbing  │                              │
│  └─────────────┘   └─────────────┘   └─────────────┘                              │
└────────────────────────────────────────────────────────────────────────────────────┘
```

---

## High Availability & Scalability

| Component | Strategy | Benefit |
|-----------|----------|---------|
| **Frontend** | Dual deployment (Render Static Site + Vercel) | Business continuity; same build, two hosts |
| **Backend** | Render Web Service | Single API for both frontends; auto-deploy on push |
| **Database** | Neon serverless PostgreSQL | Scales to zero, auto-scales up |
| **Files** | Cloudinary CDN | Global distribution, auto-optimization |

---

## Key Platform Benefits

### Dual Frontend (Render + Vercel)

| Benefit | Description |
|---------|-------------|
| **Business continuity** | Two production frontends; if one platform has an incident, the other can be used |
| **Single codebase** | Same `client/` build; no platform-specific code; env via `VITE_*` only |
| **Zero-downtime option** | Render remains primary; Vercel is additive; no breaking of existing production |
| **Unified backend** | One Render backend serves both frontends; CORS allows both origins |

### Render & Vercel Hosting

| Benefit | Description |
|---------|-------------|
| **Render** | Frontend (Static Site) + Backend (Web Service); unified dashboard; Git auto-deploy |
| **Vercel** | Frontend only; Root Directory = `client`; same build command; env in project settings |
| **Automatic SSL** | HTTPS on both Render and Vercel |
| **Environment** | `VITE_API_BASE_URL` (and optional `VITE_SENTRY_DSN`) set in each platform’s dashboard |

### Cloud-Native Architecture

| Benefit | Description |
|---------|-------------|
| **Zero Downtime Deploys** | Rolling deployments with health checks |
| **Auto-Scaling** | Handles variable load automatically |
| **Managed Infrastructure** | No server maintenance required |
| **Global Performance** | CDN for static assets and media |

---

## External Service Integrations

| Service | Provider | Purpose |
|---------|----------|---------|
| **Frontend hosting** | Render + Vercel | Dual production frontends; same build, env via VITE_* |
| **Backend hosting** | Render | Single Web Service; serves both frontends |
| **Database** | Neon | Serverless PostgreSQL with auto-scaling |
| **File Storage** | Cloudinary | Document/image CDN with optimization |
| **AI Features** | OpenAI | Intelligent suggestions and analysis |
| **Error Tracking** | Sentry | Real-time monitoring and alerting |
| **Version Control** | GitHub | Source code and CI/CD |

---

## Monitoring & Observability

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              MONITORING STACK                                        │
│                                                                                      │
│   ┌───────────────────────┐   ┌───────────────────────┐   ┌───────────────────────┐ │
│   │       SENTRY          │   │    RENDER LOGS        │   │    NEON METRICS       │ │
│   │                       │   │                       │   │                       │ │
│   │ • Frontend errors     │   │ • Application logs    │   │ • Query performance   │ │
│   │ • Backend errors      │   │ • Build logs          │   │ • Connection stats    │ │
│   │ • Performance traces  │   │ • Deploy history      │   │ • Storage usage       │ │
│   │ • User impact         │   │ • Service health      │   │ • Auto-scaling events │ │
│   └───────────────────────┘   └───────────────────────┘   └───────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Summary

Rayenna CRM is built on a **modern, scalable, and secure** cloud architecture that provides:

- **Reliability**: Automatic deployments, health monitoring, and error tracking
- **Security**: Multi-layer security with JWT auth, CORS (Render + Vercel origins), rate limiting, and encryption
- **Scalability**: Serverless database and auto-scaling backend
- **Performance**: CDN delivery for frontend and media assets; dual frontend (Render + Vercel) for continuity
- **Maintainability**: Single codebase; Git-based CI/CD; same build deploys to both frontend hosts

For detailed steps and verification of the dual frontend setup, see **VERCEL_PARALLEL_DEPLOYMENT_PLAN.md**.

---

*Document updated for Board Presentation - February 2026*
