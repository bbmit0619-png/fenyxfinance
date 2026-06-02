# Fenyx Finance Admin SaaS Dashboard

A secure React + Tailwind admin dashboard backed by Node.js/Express APIs for managing SaaS clients and invoices.

## Demo credentials

- Email: `admin@fenyxfinance.com`
- Password: `demo-password-123`

Override both values with `ADMIN_EMAIL` and `ADMIN_PASSWORD` in production.

## Features

- HTTP-only JWT cookie sessions with protected API routes.
- Dashboard summary cards for total clients, active clients, pending invoices, and paid revenue.
- Recent signups and searchable/filterable/sortable client management table.
- Client detail panel with contact data, subscription plan, billing history, and usage metrics.
- Invoice PDF generation with `pdf-lib`.
- Transactional invoice email via Nodemailer with the generated PDF attached as an `application/pdf` binary attachment. No hosted invoice link is sent.
- PostgreSQL schema and optional `DATABASE_URL` support, with seeded in-memory data for local demos.

## Local setup

```bash
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173` for the React app. The Express API runs on `http://localhost:4000`.

## Production notes

- Set a long random `JWT_SECRET`.
- Set `NODE_ENV=production` so secure cookies are enabled and the built SPA is served by Express.
- Configure `DATABASE_URL` for PostgreSQL/Supabase and apply `db/schema.sql`.
- Configure SMTP variables (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, etc.) so invoice emails are delivered by your transactional email provider.
