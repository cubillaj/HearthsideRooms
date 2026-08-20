# Hearthside Rooms

Hearthside Rooms is a full-stack realtime group chat app built with React, Express, Socket.IO, Drizzle ORM, and PostgreSQL. Users can register, log in, create public or password-protected rooms, join rooms, send live messages, see typing indicators, track online users, and receive read receipts.

## Features

- Email/password authentication with hashed passwords
- Short-lived JWT access tokens plus rotating HTTP-only refresh cookies
- Protected REST API routes with bearer-token authorization
- Public and password-protected chat rooms
- Room membership checks before joining, reading, or sending messages
- Realtime messaging with Socket.IO
- Online user presence
- Typing start/stop indicators
- Message history and read receipts
- Responsive React chat UI with Vite
- PostgreSQL schema and migrations managed by Drizzle

## Tech Stack

### Client

- React 19
- Vite
- Tailwind CSS 4
- Axios
- Socket.IO Client

### Server

- Node.js
- TypeScript
- Express 5
- Socket.IO
- Drizzle ORM
- PostgreSQL / Neon serverless driver
- Zod validation
- JWT authentication
- bcrypt password hashing

## Project Structure

```text
socketio/
  client/
    src/
      features/auth/      # Login and registration UI
      features/chat/      # Room list, chat panel, realtime events
      lib/api.js          # Axios client and access-token handling
      lib/socket.js       # Socket.IO client factory
      App.jsx             # Session bootstrap and main app shell
  server/
    src/
      controller/         # Express route handlers
      db/                 # Drizzle database connection and schema
      middleware/         # Auth and role middleware
      routes/             # REST API route definitions
      services/           # Auth, user, room, and message business logic
      socket/             # Socket.IO server events
      validation/         # Zod request schemas
      utils/              # Error helpers
    drizzle/              # Generated database migrations
    server.ts             # Express and Socket.IO entry point
```

## Prerequisites

- Node.js 20 or newer
- npm
- A PostgreSQL database connection string

## Environment Variables

Create `server/.env`:

```env
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=replace-with-a-long-random-secret
EXPIRES_IN=15m
PORT=3000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
REDIS_URL=redis://localhost:6379
# Exact trusted reverse-proxy hop count; leave unset for direct deployments.
TRUST_PROXY_HOPS=1
```

Create `client/.env` if your server is not running on the default local URL:

```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

## Installation

Install client dependencies:

```bash
cd client
npm install
```

Install server dependencies:

```bash
cd ../server
npm install
```

## Database Setup

From `server/`, generate and run Drizzle migrations:

```bash
npm run db:generate
npm run db:migrate
```

To inspect the database with Drizzle Studio:

```bash
npm run db:studio
```

## Running Locally

Start the API and Socket.IO server:

```bash
cd server
npm run dev
```

The server runs on `http://localhost:3000` by default.

Start the React client in another terminal:

```bash
cd client
npm run dev
```

The client runs on `http://localhost:5173` by default. The server CORS config also allows `5174` for local development.

## Available Scripts

### Client

```bash
npm run dev       # Start Vite dev server
npm run build     # Build production assets
npm run preview   # Preview the production build
npm run lint      # Run ESLint
```

### Server

```bash
npm run dev         # Start server with nodemon and tsx
npm run start       # Start server with tsx
npm run db:generate # Generate Drizzle migrations
npm run db:migrate  # Apply Drizzle migrations
npm run db:studio   # Open Drizzle Studio
```

## API Overview

All protected routes require:

```http
Authorization: Bearer <access-token>
```

### Auth

| Method | Route | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Create an account and receive an access token |
| POST | `/api/auth/login` | Log in and receive an access token |
| POST | `/api/auth/refresh` | Rotate refresh cookie and receive a new access token |
| POST | `/api/auth/logout` | Revoke the refresh token and clear the cookie |

### Users

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/users/profile` | Get the current user's profile |
| PATCH | `/api/users/update-profile` | Update profile fields |
| PATCH | `/api/users/change-password` | Change the current user's password |

### Rooms

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/rooms` | List all rooms |
| GET | `/api/rooms/my` | List rooms joined by the current user |
| POST | `/api/rooms` | Create a room |
| POST | `/api/rooms/:roomId/join` | Join a room, optionally with a password |

### Messages

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/messages/:roomId/messages` | Load room message history |
| POST | `/api/messages/:roomId` | Create a message through HTTP and broadcast it |

## Socket.IO Events

Socket connections authenticate with the JWT access token:

```js
io('http://localhost:3000', {
  auth: { token },
  transports: ['websocket', 'polling'],
})
```

### Client Emits

| Event | Payload | Description |
| --- | --- | --- |
| `join_room` | `roomId` | Join a Socket.IO room after membership is verified |
| `new_message` | `{ roomId, message }` | Send a new message to a room |
| `typing_start` | `roomId` | Broadcast that the user started typing |
| `typing_stop` | `roomId` | Broadcast that the user stopped typing |
| `mark_message_read` | `{ roomId, messageId }` | Mark one message as read |
| `mark_room_read` | `roomId` | Mark all room messages as read |

### Server Emits

| Event | Payload | Description |
| --- | --- | --- |
| `online_users` | `number[]` | List of online user IDs |
| `joined_room` | `{ roomId, message }` | Room join confirmation |
| `join_room_error` | `{ message }` | Room join failure |
| `receive_message` | `message` | New message broadcast |
| `message_read_receipt` | `receipt` | Read receipt broadcast |
| `user_typing` | `{ roomId, userId, username }` | User typing notification |
| `user_stopped_typing` | `{ roomId, userId }` | User stopped typing notification |
| `typing_error` | `{ message }` | Typing indicator failure |
| `message_error` | `{ message }` | Message or read receipt failure |

## Data Model

The Drizzle schema includes:

- `users`: account and profile details
- `refresh_token`: active refresh tokens
- `rooms`: chat rooms with optional hashed room passwords
- `room_member`: many-to-many room membership records
- `messages`: room messages
- `messageReads`: per-user read receipts

## Development Notes

- Access tokens are stored in memory on the client and attached to API requests with an Axios interceptor.
- Refresh tokens are stored as HTTP-only cookies scoped to `/api/auth`.
- The server allows local client origins on ports `5173` and `5174`.
- Room passwords and user passwords are hashed with bcrypt before storage.
- Redis rate limiting fails closed: limited requests return HTTP 503 when Redis is unavailable, and startup fails if Redis cannot connect. Login allows 10 failed attempts per normalized-email hash and 100 per client IP per 15 minutes, with progressive delay from failure five; successful login clears the email bucket. API limits use only user ID after authentication and only IP before authentication.
- Redis namespaces are separate for login, registration, webhook, read, write, upload, export, and sensitive actions. Webhook and export namespaces are reserved until those endpoint classes are added.
- Express ignores forwarded client-IP headers by default. In a proxied production deployment, `TRUST_PROXY_HOPS` must be set to the exact hop count (commonly `1`) so clients cannot select their own rate-limit IP through `X-Forwarded-For`.
- Message history automatically marks room messages as read for the current user.

## Current Limitations

- There is no automated test suite yet.
- The server `test` script is still a placeholder.
- Production deployment config is not included in this repository.
