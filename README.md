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

## Frontend

With the backend running, start the React app in a second terminal:

```sh
cd frontend
npm install
npm run dev
```

The Vite development server proxies `/api` requests to the backend on port 3000.