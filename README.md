# ReachInbox Email Job Scheduler

A production-grade full-stack email job scheduler built for the ReachInbox.ai engineering assignment. Accepts email scheduling requests via REST API and Web UI, schedules them with future delays using BullMQ + Redis (no cron), sends via Nodemailer + Ethereal fake SMTP, enforces idempotency, restart persistence, atomic rate limiting, live Slack alerts, Elasticsearch search indexing, and real Google OAuth.

---

## 🏗️ Architecture Overview

```
                      ┌─────────────────────────────────┐
                      │    Next.js 16 Web Dashboard     │
                      │  (Google OAuth, Tabs, Compose)  │
                      └────────────────┬────────────────┘
                                       │ HTTP
                                       ▼
                      ┌─────────────────────────────────┐
                      │      Express.js REST API        │
                      │  (/schedule, /emails, /auth)    │
                      └───────┬─────────────────┬───────┘
                              │                 │
         1. Insert Emails     ▼                 ▼   2. Add Delayed Job
     ┌────────────────────────────┐    ┌────────────────────────────┐
     │   PostgreSQL (Prisma)      │    │    BullMQ + Redis Queue    │
     │  status: 'scheduled'       │    │  deterministic jobId=UUID  │
     └────────────────────────────┘    └──────────────┬─────────────┘
                                                      │
                                                      │ Job Triggered at
                                                      │ scheduled time
                                                      ▼
                                       ┌────────────────────────────┐
                                       │    BullMQ Worker Process   │
                                       └──────────────┬─────────────┘
                                                      │
                       ┌──────────────────────────────┴──────────────────────────────┐
                       │                                                             │
         [Atomic Rate Limit Check]                                     [Idempotency Guard]
            Redis Lua: INCR + EXPIRE                                   Verify DB status !== 'sent'
                       │                                                             │
          ┌────────────┴────────────┐                                                ▼
          │                         │                                       Send via Ethereal
     Allowed                  Limit Hit                                     Fake SMTP Server
          │                         │                                                │
          ▼                         ▼                                                ▼
     Continue Send           moveToDelayed(nextHour)                        Update DB to 'sent'
                             + Live Slack Notification                               +
                                                                            Index in Elasticsearch
```

### 1. Scheduling Mechanism
- **No Cron / No Polling Loops:** Scheduling is strictly powered by BullMQ's native Redis-backed delayed job mechanism.
- When `POST /schedule` is called with an array of recipients and staggered delays, one database row is created per recipient with its calculated `scheduled_at` timestamp.
- Each BullMQ job is immediately enqueued with `delay = scheduledTimestamp - Date.now()`.
- The worker sleeps until Redis fires the timer, avoiding database polling overhead.

### 2. Idempotency & Restart Persistence
- **Deterministic Job IDs:** Every BullMQ job uses `jobId: email.id` (the DB row's primary key UUID). BullMQ strictly rejects duplicate job IDs within the queue.
- **Worker-side Status Guard:** Before transmitting an email, the worker queries PostgreSQL. If `email.status === 'sent'`, the job is safely skipped without resending.
- **Boot-Time Reconciliation:** On backend launch, `runReconciliation()` queries PostgreSQL for all `status: 'scheduled'` rows. It inspects the queue using BullMQ's `emailQueue.getJob(email.id)`. If Redis was flushed or a job went missing, it re-enqueues only genuinely missing jobs with their remaining delay. Existing jobs are untouched, preventing duplicate sends.

### 3. Redis-backed Atomic Rate Limiting
- **Atomic Lua Script:** Rate limiting is enforced using an atomic Redis script executing across any number of concurrent worker processes.
- **Key Structure:** `rate_limit:{senderId}:{hourWindow}` where `hourWindow = Math.floor(Date.now() / 3600000)`.
- **Overflow Handling:** When the sender's hourly limit (`MAX_EMAILS_PER_HOUR_PER_SENDER`) is exceeded, jobs are **never failed or dropped**. The worker calculates the exact milliseconds until the next hour window (`resetDelayMs`) and invokes `job.moveToDelayed(Date.now() + resetDelayMs, token)`, preserving email delivery order.
- **Live Slack Alert:** The moment the rate limit is hit, a live notification is dispatched to the sender's configured Slack workspace via Slack API (`chat.postMessage` or Incoming Webhook). If Slack is unconfigured, the system gracefully logs and continues without crashing.

### 4. Elasticsearch Indexing
- Every email is indexed into Elasticsearch (`emails` index) on creation and updated on status transitions (`scheduled` ➔ `processing` ➔ `sent` / `failed`).
- `GET /emails?status=scheduled|sent&search=...` performs full-text search across subject, recipient, and body via Elasticsearch with fuzzy matching, falling back cleanly to PostgreSQL if Elasticsearch is starting up.

---

## 📋 Feature Checklist

| Requirement | Implementation Details | Status |
|---|---|:---:|
| **BullMQ Delayed Jobs (No Cron)** | Native delayed jobs in `emailQueue.ts` | ✅ |
| **Deterministic `jobId` = DB UUID** | `addEmailJob(email.id, data, delay)` | ✅ |
| **Worker Process Idempotency** | Checks `email.status === 'sent'` before sending | ✅ |
| **Boot-time Restart Reconciliation** | Queries DB, inspects Redis via `getJob(jobId)`, re-enqueues missing | ✅ |
| **Configurable Worker Concurrency** | `WORKER_CONCURRENCY` env var (default: 5) | ✅ |
| **Minimum Delay Between Sends** | `MIN_DELAY_MS` env var (default: 1000ms) | ✅ |
| **Redis Atomic Hourly Rate Limiter** | Lua script with `INCR` + `EXPIRE` per sender hour window | ✅ |
| **`moveToDelayed` on Rate Limit Hit** | Postpones job to next hour window, preserving queue order | ✅ |
| **Live Slack OAuth & Rate Limit Alert** | `/auth/slack` + `chat.postMessage` / Webhook notification | ✅ |
| **Elasticsearch Search Indexing** | Full-text indexing on create & status change + `GET /emails` search | ✅ |
| **Bull Board Dashboard** | Mounted at `/admin/queues` via `@bull-board/express` | ✅ |
| **Nodemailer + Ethereal SMTP** | Generates Ethereal account, logs preview URL for inspection | ✅ |
| **Docker Compose** | PostgreSQL 16, Redis 7, Elasticsearch 8 with named volumes | ✅ |
| **Frontend Matching Figma** | Dark theme, header, user avatar, tabs, compose modal, CSV upload | ✅ |
| **Real Google OAuth** | Implemented via `next-auth` Google Provider | ✅ |

---

## 🛠️ Environment Variables

### Backend (`backend/.env`)

```env
# Database (Postgres)
DATABASE_URL="postgresql://reachinbox:reachinbox@localhost:5432/reachinbox"

# Redis (BullMQ & Rate Limiter)
REDIS_URL="redis://localhost:6379"

# Elasticsearch
ELASTICSEARCH_URL="http://localhost:9200"

# Application
PORT=4000
FRONTEND_URL="http://localhost:3000"
NODE_ENV="development"

# BullMQ Worker Configuration
WORKER_CONCURRENCY=5
MIN_DELAY_MS=1000

# Rate Limiting (Emails / hour / sender)
MAX_EMAILS_PER_HOUR_PER_SENDER=100

# Slack Integration (OAuth + Alerts)
SLACK_CLIENT_ID="your-slack-client-id"
SLACK_CLIENT_SECRET="your-slack-client-secret"
SLACK_REDIRECT_URI="http://localhost:4000/auth/slack/callback"

# Optional: Fixed Ethereal credentials (auto-generated if omitted)
# ETHEREAL_USER="your-ethereal-user"
# ETHEREAL_PASS="your-ethereal-pass"
```

### Frontend (`frontend/.env.local`)

```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-random-secret-at-least-32-chars"

# Google OAuth Credentials (Google Cloud Console)
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Backend API URL
NEXT_PUBLIC_API_URL="http://localhost:4000"

# Slack OAuth initiate link
NEXT_PUBLIC_SLACK_OAUTH_URL="http://localhost:4000/auth/slack"
```

---

## 🚀 How to Run

### Step 1: Start Infrastructure via Docker Compose
From the repository root:
```bash
docker compose up -d
```
This launches:
- **PostgreSQL 16** on `localhost:5432` (volume: `pgdata`)
- **Redis 7** on `localhost:6379` (volume: `redisdata`)
- **Elasticsearch 8.13** on `localhost:9200` (volume: `esdata`)

### Step 2: Initialize Database Schema
```bash
cd backend
npm install
npx prisma db push
```

### Step 3: Run the Backend API Server
```bash
# In terminal 1 (backend API server):
npm run dev
```
- API server runs at: `http://localhost:4000`
- Bull Board queue dashboard runs at: `http://localhost:4000/admin/queues`

### Step 4: Run the BullMQ Worker Process
```bash
# In terminal 2 (separate worker process):
npm run worker
```

### Step 5: Run the Frontend Dashboard
```bash
# In terminal 3 (frontend Next.js):
cd ../frontend
npm install
npm run dev
```
- Open `http://localhost:3000` in your browser.

---

## 🧪 Testing & Verification Walkthrough

### 1. Test Scheduling an Email Batch
Make a request to `POST http://localhost:4000/schedule`:
```bash
curl -X POST http://localhost:4000/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Product Launch Announcement",
    "body": "Welcome to ReachInbox! Our platform is now live.",
    "recipients": ["alice@example.com", "bob@example.com", "charlie@example.com"],
    "startTime": "2026-09-08T10:30:00.000Z",
    "delaySeconds": 5,
    "hourlyLimit": 100
  }'
```

### 2. Inspect Ethereal Preview URL
In the worker terminal, observe the Ethereal fake SMTP log:
```
✉️ Email sent to alice@example.com: MessageId=<xxx@ethereal.email>
🔗 Ethereal Preview URL: https://ethereal.email/message/xxx
```
Open the link to inspect the formatted email in Ethereal's web viewer.

### 3. Test Restart Persistence & Reconciliation
1. Schedule emails with future `startTime` (e.g. 5 minutes ahead).
2. Terminate the API server (`Ctrl+C`).
3. Relaunch the API server (`npm run dev`).
4. Look for the boot logs:
   ```
   🔄 Running boot-time queue reconciliation check...
   ✅ Reconciliation complete: 3 scheduled emails inspected, 0 missing jobs re-enqueued.
   ```
5. If Redis was restarted without persistence or jobs were lost, notice that missing jobs are safely re-enqueued with their remaining delay without creating duplicates.

### 4. Test Idempotency
- When an email status is marked as `sent`, even if a duplicate trigger arrives, the worker checks PostgreSQL status and skips sending.

### 5. Test Live Bull Board Queue Monitor
Visit:
`http://localhost:4000/admin/queues`
Inspect active, delayed, completed, and failed jobs in real-time.

---

## 📌 Assumptions & Trade-offs
1. **Dynamic Ethereal Accounts:** If `ETHEREAL_USER` and `ETHEREAL_PASS` are not specified in `.env`, Nodemailer automatically calls `nodemailer.createTestAccount()` on boot, making setup friction-free without needing manual account registration.
2. **Elasticsearch Fallback:** If Elasticsearch is temporarily unavailable or starting up, `GET /emails` falls back to indexed PostgreSQL queries (`WHERE status = ?`) so that user operations are never blocked.
3. **Slack Token Persistence:** Slack tokens and incoming webhooks are associated with the `Sender` table keyed by sender ID/email, allowing per-tenant notifications upon rate limit exhaustion.
#   o u t b o x 
 
 
