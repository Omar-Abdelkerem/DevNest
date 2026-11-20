# DevNest API

Production-ready REST API powering the **DevNest** developer portfolio platform — built with Node.js (Express 5), Prisma 7 (PostgreSQL), Redis, Cloudinary, and strict Zod validation.

## Architecture Overview

```text
Client (devnest-web / React)
        │  HTTPS + httpOnly sessionId cookie
        ▼
Express 5 API (Helmet CSP, Gzip Compression, Exact-Origin CORS, CSRF Guard, Rate Limiting)
        ├── Controllers + Strict Zod Schemas (mass-assignment & URL-protocol protection)
        ├── Redis (sessions, per-user session revocation, response caching, rate-limit store)
        │     └── Graceful in-memory fallback when Redis is unavailable
        ├── PostgreSQL via Prisma 7 (indexed queries, batched writes, cascading deletes)
        └── Cloudinary (magic-byte verified avatar & project cover photo uploads)
```

## Key Features
- **Authentication & Session Lifecycle**: `httpOnly` cookie sessions (`crypto.randomUUID()`), session rotation on login, server-side logout revocation, and automatic revocation of all other active sessions on password change.
- **Developer Profiles**: Customizable username, bio, about, **location**, **age**, **role/title**, **company**, **open-to-work badge**, social links, skills with proficiency levels, avatar upload, and public/private visibility.
- **Projects**: Cover photo upload (`POST /api/v1/projects/upload-image`), optional named project links (Live Demo, GitHub, Docs), Markdown READMEs, batched multi-language tagging, starring, and threaded comments.
- **Peer Feedback**: Public profile feedback with privacy enforcement and author/recipient moderation.
- **Security Hardening**: Helmet strict API CSP (`default-src 'none'`), explicit Origin/Referer CSRF validation, NUL-byte payload rejection, magic-byte file signature verification, strict Zod schemas, and sanitized error responses.
- **Performance**: Composite PostgreSQL indexes on hot `WHERE`/`ORDER BY` paths, batched language sync (eliminates N+1), HTTP gzip compression, Redis + HTTP `Cache-Control` / `Vary: Cookie` caching, and pagination caps.

## Local Development

### Prerequisites
- Node.js `>= 22`
- PostgreSQL 16 (or Docker)
- Redis 7 (optional — falls back to in-memory store in local dev)

### Setup
```bash
cp .env.example .env
# Fill in DATABASE_URL, REDIS_URL (optional), and Cloudinary credentials
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

### Docker (Turnkey)
Runs PostgreSQL, Redis, migrations, idempotent seeding, and the API server automatically:
```bash
docker compose up --build
```

### Render Deployment
`render.yaml` and `Dockerfile` are included out of the box. On startup the container automatically runs:
```bash
npx prisma migrate deploy && node prisma/seed.js && node src/server.js
```

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Optional | Redis connection string (falls back to in-memory if omitted) |
| `PORT` | No | Server port (default: `3000`) |
| `NODE_ENV` | No | `development`, `test`, or `production` |
| `SESSION_LIFETIME` | No | Session TTL in seconds (default: `3600`) |
| `CORS_ORIGINS` | No | Comma-separated exact allowed origins (never `*` in production) |
| `CLOUDINARY_CLOUD_NAME` | For uploads | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | For uploads | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | For uploads | Cloudinary API secret |

## Automated Testing

```bash
# Run Unit, Integration, and E2E suites
npm test
```

Test suites live under `tests/`:
- `tests/unit/security.unit.test.js` — bcrypt hashing, magic-byte image verification, NUL-byte checks, strict Zod schemas, session invalidation, production env guards.
- `tests/integration/api.integration.test.js` — full Express middleware & route stack (auth rejection on all 19 protected routes, CSRF, cache invalidation, privacy enforcement, error sanitization).
- `tests/e2e/journeys.e2e.test.js` — end-to-end user journeys over a live HTTP server.
