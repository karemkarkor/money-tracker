# Pocketwise — personal money tracker

A small full-stack income and expense tracker. The API uses Express with an MVC-style routes/controllers/services layout, Prisma, and PostgreSQL. The browser UI is plain HTML, JavaScript, and Tailwind CSS (loaded from its CDN), with Chart.js for the charts.

## Requirements

- Node.js 20 or newer
- PostgreSQL 14 or newer

## Run locally

1. Create a PostgreSQL database, for example `pocketwise`.
2. Copy `.env.example` to `.env` and set `DATABASE_URL` and a private `JWT_SECRET` (use a random value of at least 32 characters).
3. Install dependencies and create the Prisma client:

   ```sh
   npm install
   npm run db:generate
   ```

4. Create the tables:

   ```sh
   npm run db:migrate -- --name init
   ```

5. Start the server:

   ```sh
   npm run dev
   ```

Open <http://localhost:3000>. `npm start` runs the server without nodemon. The frontend is served from `public/` by Express.

## Features

- Register and sign in with bcrypt password hashing and signed JWT bearer tokens.
- Create, list, update, and delete transactions. Every transaction query is scoped to the authenticated user.
- Filter transaction lists and summaries by category, start date, and end date.
- Dashboard summary cards, spending breakdown by category, six-month income/spending chart, and recent transactions.
- API input validation, auth endpoint rate limiting, Helmet security headers, and graceful Prisma shutdown.

## API

All endpoints use JSON. Protected endpoints require `Authorization: Bearer <token>`.

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | No | Create account (`name`, `email`, `password`) |
| POST | `/api/auth/login` | No | Sign in (`email`, `password`) |
| GET | `/api/health` | No | Health check |
| GET | `/api/transactions` | Yes | List transactions; optional `from`, `to`, `category`, `type`, `page`, `limit` |
| GET | `/api/transactions/summary` | Yes | Income, expense, balance and category totals; supports `from`, `to`, `category`, `type` |
| POST | `/api/transactions` | Yes | Create (`type`, `amount`, `category`, `date`, optional `description`) |
| PUT | `/api/transactions/:id` | Yes | Replace transaction fields |
| DELETE | `/api/transactions/:id` | Yes | Delete a transaction |

Dates use `YYYY-MM-DD`; `type` is `income` or `expense`. The list endpoint defaults to 50 items and caps a page at 100. A user cannot read, update, or delete another user's transaction, even when they know its ID.

## Notes

- The UI formats amounts as USD in `public/app.js`; change the `currency` option in the `money` formatter if the app should use another currency.
- Tailwind and Chart.js are loaded from public CDNs, so the browser needs network access for those assets. For a deployment without CDN access, add a local Tailwind build and bundle Chart.js.
- Configure `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, and `NODE_ENV` in the deployment environment. Use HTTPS in production.
