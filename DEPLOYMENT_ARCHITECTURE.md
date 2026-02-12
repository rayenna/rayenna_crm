# Rayenna CRM - Deployment Architecture

## Executive Summary

Rayenna CRM is a modern, cloud-native Customer Relationship Management system built for Rayenna Energy's solar EPC operations. The platform is deployed on a unified cloud infrastructure with enterprise-grade security, automatic scaling, and continuous deployment.

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
│                          FRONTEND (Render Static Site)                               │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                        React Single Page Application                         │   │
│  │  • React 18 + TypeScript          • Tailwind CSS (UI Framework)              │   │
│  │  • Vite (Build Tool)              • React Query (Server State)               │   │
│  │  • React Router (Navigation)      • Recharts (Analytics Dashboards)          │   │
│  │  • React Hook Form (Forms)        • Sentry (Error Tracking)                  │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                           URL: rayenna-crm-frontend.onrender.com                     │
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
│  │  • Prisma ORM                     • CORS Security                            │   │
│  │  • Sentry (Error Tracking)        • PDF Generation (PDFKit)                  │   │
│  │  • Excel Export (xlsx)            • Multer (File Uploads)                    │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                           URL: rayenna-crm-backend.onrender.com                      │
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

## Unified Render Platform

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              RENDER CLOUD PLATFORM                                   │
│                                                                                      │
│   ┌─────────────────────────────┐      ┌─────────────────────────────┐              │
│   │     STATIC SITE             │      │      WEB SERVICE            │              │
│   │     (Frontend)              │      │      (Backend API)          │              │
│   │                             │      │                             │              │
│   │  • React SPA                │ ───► │  • Node.js + Express        │              │
│   │  • Auto-build on push       │      │  • Auto-deploy on push      │              │
│   │  • SPA routing (404.html)   │      │  • Prisma migrations        │              │
│   │  • Asset optimization       │      │  • Environment variables    │              │
│   └─────────────────────────────┘      └─────────────────────────────┘              │
│                                                                                      │
│                         • Unified Dashboard & Monitoring                             │
│                         • Automatic SSL Certificates                                 │
│                         • Git-based CI/CD Pipeline                                   │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Hosting | Purpose |
|-------|------------|---------|---------|
| **Frontend** | React 18 + TypeScript + Vite | Render Static Site | Modern, responsive user interface |
| **Styling** | Tailwind CSS | - | Consistent, mobile-first design |
| **Backend** | Node.js + Express + TypeScript | Render Web Service | RESTful API server |
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
┌─────────────┐     ┌─────────────┐     ┌─────────────────────────────────────────┐
│  Developer  │────►│   GitHub    │────►│              RENDER                      │
│  Git Push   │     │    main     │     │                                         │
└─────────────┘     └─────────────┘     │   ┌─────────────┐   ┌─────────────┐     │
                                        │   │Static Site  │   │Web Service  │     │
                                        │   │             │   │             │     │
                                        │   │• npm install│   │• npm install│     │
                                        │   │• npm build  │   │• prisma gen │     │
                                        │   │• Deploy     │   │• prisma mig │     │
                                        │   │             │   │• tsc build  │     │
                                        │   │             │   │• Start      │     │
                                        │   └─────────────┘   └─────────────┘     │
                                        └─────────────────────────────────────────┘
```

---

## Security Architecture

| Security Layer | Implementation |
|----------------|----------------|
| **Authentication** | JWT tokens with secure secrets |
| **Session Security** | Auto-logout on browser close |
| | 5-minute inactivity timeout with warning |
| **Transport Security** | HTTPS/SSL on all connections |
| **CORS Policy** | Whitelist-only origin policy |
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
| **Frontend** | Render Static Site with CDN | Fast global delivery |
| **Backend** | Render auto-scaling | Handles traffic spikes |
| **Database** | Neon serverless PostgreSQL | Scales to zero, auto-scales up |
| **Files** | Cloudinary CDN | Global distribution, auto-optimization |

---

## Key Platform Benefits

### Unified Render Hosting

| Benefit | Description |
|---------|-------------|
| **Single Platform** | Frontend + Backend on same provider |
| **Unified Dashboard** | Monitor both services in one place |
| **Automatic SSL** | Free HTTPS certificates |
| **Git Integration** | Auto-deploy on every push to `main` |
| **Environment Sync** | Easy env var management across services |
| **Cost Efficiency** | Single billing, predictable costs |

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
- **Security**: Multi-layer security with JWT auth, CORS, rate limiting, and encryption
- **Scalability**: Serverless database and auto-scaling backend
- **Performance**: CDN delivery for frontend and media assets
- **Maintainability**: Unified platform with Git-based CI/CD

---

*Document generated for Board Presentation - February 2026*
