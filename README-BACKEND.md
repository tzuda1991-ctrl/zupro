# STAR777 backend phase 1

Existing Blue + Gold UI is intentionally unchanged. The current browser login is still a preview; connecting it to these endpoints is the next phase.

## Railway
Add a PostgreSQL service to the Railway project, expose its DATABASE_URL to the STAR777 web service, and set NODE_ENV=production. Redeploy the web service. Tables and initial market rows are created on startup. Configure backups.

## APIs
POST /api/auth/register (username, password >=12 chars, optional 10-digit mobile)
POST /api/auth/login (username, password)
POST /api/auth/logout
GET /api/me
GET /api/markets
GET /api/results
GET /api/wallet (demo points only)
GET /api/transactions
GET /api/notifications
POST /api/support (message)
GET /api/admin/summary (admin only)
POST /api/admin/results (admin only, marketId/date/result)
GET /api/health

First admin must be promoted manually by trusted database access: UPDATE users SET role='admin' WHERE username='approved_username'; Do not expose public admin signup.

No real-money payments, deposits, withdrawals or betting settlement are implemented. Before production launch, add automated integration tests, monitoring, backups, migration tooling, account recovery and an independent security review.
