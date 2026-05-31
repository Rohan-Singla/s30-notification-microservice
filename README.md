# Notification Microservice

A backend that queues email notifications using **BullMQ** and **Redis**. Controllers enqueue jobs; a separate worker process sends emails via Resend.

## How it works

```
API (controllers) → BullMQ queues (Redis) → Workers (engine) → Resend
```

1. A route triggers a notification (signup, wallet onramp, marketing email).
2. The controller pushes a job to the matching BullMQ queue.
3. The worker picks up the job, renders an HTML template, and sends the email.

## Queues

Three separate queues, one per notification type:

| Queue | Template | Trigger | Priority |
|---|---|---|---|
| `emails` | `signup-success` | User signup | 1 |
| `wallet-emails` | `wallet-onramp-success` | Wallet onramp | 0 (highest) |
| `marketing-emails` | `marketing-email` | Admin broadcast | 2 (lowest) |

Lower priority number = processed first. Wallet emails beat welcome emails, which beat marketing.

Each job retries up to 3 times with exponential backoff (2s delay).

## Routes

- `POST /auth/signup` — welcome email
- `POST /auth/login`
- `POST /wallet/onramp` — requires JWT
- `POST /email/marketing` — requires admin JWT
- `GET /health`

## Setup

Requires Redis running on `localhost:6379`.

```bash
cd backend
bun install
bunx prisma generate
cp .env.example .env   # add RESEND_API_KEY, JWT_SECRET, DATABASE_URL
```

Run in two terminals:

```bash
bun run dev      # API server
bun run engine   # BullMQ workers
```

## Project structure

```txt
backend/
├── src/controllers/          # API routes enqueue jobs here
├── src/microservices/        # BullMQ queue setup
├── engine/                   # Workers that process queues
notification-service/template/  # HTML email templates
```
