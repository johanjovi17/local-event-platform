# local-event-platform

## Backend API

The Event CRUD API is in `backend/`. Copy `backend/.env.example` to
`backend/.env` and set `DATABASE_URL` to a PostgreSQL connection string, then
run:

```sh
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

The API is available at `http://localhost:3000/api/events`. It supports
`POST /api/events`, `GET /api/events`, and `GET`, `PUT`, and `DELETE`
`/api/events/:id`.

Event listing and details are public. Creating, updating, and deleting events
requires an Organizer bearer token. Organizers may only update or delete events
they created; event ownership is assigned from the authenticated account.

`GET /api/events` supports `page`, `pageSize` (up to 50), `category`,
`location`, `dateFrom`, `dateTo`, `status`, `sortBy` (`eventDate`, `title`, or
`location`), and `sortOrder` (`asc` or `desc`). Text search is not supported.

Organizers can add up to six JPEG, PNG, or WebP images to each event using
`POST /api/events/:eventId/images` with multipart form field `images`. Images
are limited to 8 MB each and are served from `/api/uploads`. They are stored in
`backend/uploads` by default; set `UPLOAD_DIR` to choose another local directory.
Keep this directory on persistent storage when deploying so uploaded images
survive restarts and redeployments. Apply the event image migration with
`npm run prisma:migrate`.

## Authentication API

The backend also supports `POST /api/auth/register`, `POST /api/auth/login`,
and authenticated `GET /api/auth/me`. Registration accepts `name`, `email`,
`password`, and `role` (`User` or `Organizer`). Login returns a bearer token.
Send it to `/api/auth/me` with an `Authorization: Bearer <token>` header.

Set `JWT_SECRET` to a private, randomly generated secret and optionally set
`JWT_EXPIRES_IN` (defaults to `1h`) in `backend/.env`. For example, generate a
secret with `openssl rand -base64 32`. Do not commit or share the real `.env`.
Apply pending User, event-ownership, and registration migrations with
`npm run prisma:migrate`.

To populate the database with sample Goa-local organizers and upcoming events,
run `npm run db:seed` from `backend/` after applying migrations. The seed is
repeatable, creates display-only organizer accounts, and does not remove other
records.

Regular users can register for Upcoming events with
`POST /api/events/:eventId/registrations`, cancel using `DELETE` on the same
route, and list their registrations at `GET /api/users/me/registrations`.
Organizers cannot register as participants. Organizers can view attendees for
their own events at `GET /api/events/:eventId/attendees`.

Authenticated users can view and update their own profile at
`/api/users/me/profile`. Organizers can update their organizer profile at
`/api/organizers/me/profile`, and organizer profiles are public at
`/api/organizers/:id/profile`.

## Frontend

With the backend running, start the React app in a second terminal:

```sh
cd frontend
npm install
npm run dev
```

The Vite development server proxies `/api` requests to the backend on port 3000.