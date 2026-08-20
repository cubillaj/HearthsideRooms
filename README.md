# Hearthside Rooms

A full-stack, real-time group chat platform built to demonstrate secure authentication, event-driven communication, relational data modeling, caching, and production-aware API design.

Hearthside Rooms supports public and password-protected rooms, live messages, presence, typing indicators, read receipts, profile management, and role-based administration. The backend combines REST endpoints with authenticated Socket.IO events and uses PostgreSQL as the source of truth and Redis for caching and distributed rate limiting.

![Hearthside Rooms interface](client/src/assets/hearhside.png)

## Why this project stands out

- **Security-conscious authentication:** bcrypt password hashing, short-lived JWT access tokens, rotating single-use refresh tokens stored as hashes, HTTP-only cookies, and generic login errors.
- **Distributed abuse protection:** Redis-backed limits isolate login, registration, read, write, upload, and sensitive-action traffic. Failed logins are limited by hashed normalized email and IP, include progressive delays, and return standards-friendly `Retry-After` responses.
- **Authenticated realtime workflows:** Socket.IO connections require a valid JWT, and room membership is checked before users join rooms or interact with protected message data.
- **Scalable data access:** paginated and filterable queries, database indexes, Redis response caching, and cache invalidation after mutations.
- **Role-based operations:** a super-admin interface supports user and room management without exposing administrative capabilities to regular users.
- **Layered backend architecture:** routes, middleware, controllers, services, validation, persistence, and realtime transport remain independently understandable and maintainable.

## Core features

### User experience

- Account registration and persistent sign-in
- Public and password-protected chat rooms
- Realtime messages and room creation
- Online-user presence and typing indicators
- Per-message and per-room read receipts
- Paginated message history
- Profile editing and Cloudinary image uploads
- Responsive React interface

### Administration

- Super-admin role and protected admin views
- Searchable, sortable, paginated user and room lists
- Create, update, and delete user accounts
- Inspect and delete rooms
- Re-runnable CLI script for creating or updating a super-admin account

### Backend and security

- Zod request validation and centralized error responses
- Membership and role authorization
- Helmet security headers and credential-aware CORS
- Hashed passwords and refresh tokens
- Redis caching with targeted invalidation
- User-based API limiting after authentication and IP-based fallback before authentication
- Safe reverse-proxy defaults: forwarded IP headers are ignored unless the deployment explicitly configures trusted hops
- Fail-closed behavior for rate-limited endpoints when Redis is unavailable

## Architecture

```text
React + Axios + Socket.IO Client
              │
              ├── REST API ──> Express middleware ──> Controllers ──> Services
              │                    │                                    │
              │                    ├── JWT / RBAC                       ├── PostgreSQL
              │                    ├── Zod validation                   ├── Redis cache
              │                    └── Redis rate limits                └── Cloudinary
              │
              └── WebSocket ──> Authenticated Socket.IO handlers ──> Services
```

The REST and Socket.IO paths share the same service layer, keeping authorization and persistence rules consistent across transports. PostgreSQL remains authoritative; Redis accelerates repeated reads and coordinates limits across server instances.

## Technology stack

| Area | Technology |
| --- | --- |
| Frontend | React 19, Vite 8, Axios, Socket.IO Client, Tailwind CSS 4 |
| Backend | Node.js, TypeScript, Express 5, Socket.IO |
| Data | PostgreSQL, Drizzle ORM, Neon serverless driver |
| Cache and limits | Redis, rate-limiter-flexible |
| Security | JWT, bcrypt, Helmet, HTTP-only cookies, role middleware |
| Validation and media | Zod, Multer, Cloudinary |
| Verification | Node test runner, TypeScript, ESLint |

## Repository layout

```text
socketio/
├── client/
│   └── src/
│       ├── features/       # Authentication, chat, profile, and admin UI
│       └── lib/            # Axios session client and Socket.IO factory
├── server/
│   ├── drizzle/            # Versioned SQL migrations
│   ├── scripts/            # Super-admin provisioning
│   ├── src/
│   │   ├── controller/     # HTTP request and response handling
│   │   ├── db/             # Drizzle connection and relational schema
│   │   ├── middleware/     # Authentication, RBAC, uploads, limits, errors
│   │   ├── routes/         # Express route composition
│   │   ├── services/       # Business logic, queries, and cache management
│   │   ├── socket/         # Authenticated realtime event handlers
│   │   └── validation/     # Zod input schemas
│   └── test/               # Focused backend tests
└── README.md
```

## Run locally

### Prerequisites

- Node.js 20+
- npm
- PostgreSQL database
- Redis instance
- Cloudinary account only if profile-image upload is needed

### 1. Install dependencies

```bash
cd client
npm install

cd ../server
npm install
```

### 2. Configure the server

Create `server/.env`:

```env
DATABASE_URL=postgresql://user:password@host:5432/database
REDIS_URL=redis://localhost:6379
JWT_SECRET=replace-with-a-long-random-secret
EXPIRES_IN=15m
PORT=3000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Optional: required for profile-image uploads
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Production only: set to the exact number of trusted proxy hops.
# Leave unset when clients connect directly to Express.
TRUST_PROXY_HOPS=
```

Create `client/.env` when the API does not use its local defaults:

```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

### 3. Apply database migrations

```bash
cd server
npm run db:migrate
```

### 4. Start both applications

In one terminal:

```bash
cd server
npm run dev
```

In another terminal:

```bash
cd client
npm run dev
```

Open `http://localhost:5173`. The API listens on `http://localhost:3000` by default.

## Create a super-admin

Provide credentials through arguments:

```bash
cd server
npm run create:super-admin -- --email admin@example.com --password "StrongPassword1!" --name Super --lastName Admin
```

The script validates input and safely updates the matching account if it already exists. Credentials can alternatively be supplied with `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, and the other `SUPER_ADMIN_*` environment variables.

## API summary

Protected REST endpoints require:

```http
Authorization: Bearer <access-token>
```

| Area | Representative endpoints |
| --- | --- |
| Authentication | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout` |
| Profile | `GET /api/users/profile`, `PUT /api/users/update-info`, `PUT /api/users/update-profile`, `PUT /api/users/change-password` |
| Administration | `GET /api/users`, `POST /api/users/create-account`, `PUT /api/users/:id`, `DELETE /api/users/:id` |
| Rooms | `GET /api/rooms`, `GET /api/rooms/my`, `POST /api/rooms`, `POST /api/rooms/:roomId/join` |
| Messages | `GET /api/messages/:roomId/messages`, `POST /api/messages/:roomId` |

## Realtime events

Socket connections send the current access token during the handshake:

```js
io('http://localhost:3000', {
  auth: { token },
  transports: ['websocket', 'polling'],
})
```

| Direction | Events |
| --- | --- |
| Client to server | `join_room`, `new_room`, `new_message`, `typing_start`, `typing_stop`, `mark_message_read`, `mark_room_read` |
| Server to client | `online_users`, `joined_room`, `room_created`, `receive_message`, `message_read_receipt`, `user_typing`, `user_stopped_typing` |

## Rate-limiting design

Login protection counts failed authentication attempts only:

- 10 failures per normalized-email SHA-256 hash per 15 minutes
- 100 failures per client IP per 15 minutes
- Progressive delay begins with the fifth failure and caps at two seconds
- Successful authentication clears the email counter
- HTTP 429 responses include the actual wait in both the generic response message and `Retry-After`

Authenticated API buckets use the user ID without combining it with the IP, so changing networks does not reset a user's allowance and multiple users behind one address remain independent. Unauthenticated requests fall back to IP-only keys. Redis failures are intentionally fail-closed for limited endpoints and return HTTP 503.

## Quality checks

Run backend verification:

```bash
cd server
npm run typecheck
npm test
```

The focused rate-limit tests cover shared IP addresses, different authenticated users, changing IPs, successful-login resets, email hashing, progressive delays, `Retry-After`, and Redis failures.

Run frontend checks:

```bash
cd client
npm run lint
npm run build
```

## Engineering decisions

- Access tokens remain in browser memory instead of persistent web storage; refresh tokens use scoped HTTP-only cookies.
- Refresh tokens are random, stored as SHA-256 hashes, rotated after use, and individually revocable.
- Unknown-account login attempts perform a dummy bcrypt comparison to reduce timing differences from valid-account failures.
- Cache entries are invalidated after relevant writes to avoid serving stale room, user, or message data.
- The API trusts no reverse proxy by default. Operators must configure the precise topology rather than accepting arbitrary forwarded addresses.

## Current scope

- Presence is maintained in process memory, so multi-instance deployment would require a Socket.IO Redis adapter and shared presence state.
- Automated coverage currently concentrates on the security-sensitive rate-limiting layer; broader integration and end-to-end coverage remain future work.
- Deployment manifests and CI/CD configuration are intentionally outside the repository's current scope.

## License

This project is licensed under the ISC License.
