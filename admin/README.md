# STAR777 Admin Railway Service

Create a second Railway service from tzuda1991-ctrl/zupro with Root Directory `/admin` and start command `npm start`. Attach the existing PostgreSQL database using `DATABASE_URL` and set `ADMIN_ORIGIN` to the exact new HTTPS admin domain. Admin and user apps share the same PostgreSQL database. Admin authentication must use a separate cookie, server-side role validation, CSRF/origin checks, rate limits, MFA and audit logging before production use. Do not expose DB credentials to the browser. Real-money betting, deposits and payouts are not enabled.
