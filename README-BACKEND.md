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

## Email OTP password recovery
Set these environment variables on the Railway web service (never commit secrets):
- SMTP_HOST: your mail provider's SMTP hostname
- SMTP_PORT: 587 for STARTTLS or 465 for TLS
- SMTP_USER: SMTP login
- SMTP_PASS: SMTP password / API credential
- SMTP_FROM: verified sender email
- OTP_SECRET: a cryptographically random secret of at least 32 characters

Registration now requires an email. Existing users registered before this update have NULL email and cannot use email recovery until an account email enrollment/verification flow is built. Do not manually set unverified email addresses.

POST /api/auth/forgot-password with {email} sends a six-digit code if the email exists, without revealing account existence. Codes expire in 10 minutes; per-account resend cooldown 60 seconds, per-IP rate limits and 5 attempts per code. POST /api/auth/reset-password with {email,otp,password} resets password and revokes all active sessions. The email sender must be configured before recovery works. SMTP delivery has not been live-tested here.

## Brevo HTTPS API delivery (current)
The OTP sender now uses Brevo's HTTPS transactional endpoint instead of SMTP (Railway SMTP connection timed out).
Required Railway environment variables: BREVO_API_KEY (Brevo API v3 key, NOT SMTP key), SMTP_FROM (Brevo-verified sender such as admin@zutech.online), OTP_SECRET (32+ character secret), DATABASE_URL.
Old SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS are not used by the OTP sender anymore. Do not paste API keys into GitHub or chat. After setting BREVO_API_KEY, redeploy and test an email associated with a registered user. A successful API request means accepted for processing, not guaranteed inbox delivery; inspect Brevo transactional logs for delivery.

## Verified signup and welcome emails
POST /api/auth/register now saves a pending registration and emails a 6-digit code; it does not create the user or log them in. POST /api/auth/verify-registration with {email,otp} verifies the code, creates the user, starts a session, and queues a best-effort welcome email. Pending OTPs expire in 10 minutes and allow 5 attempts, with resend cooldown and IP rate limits. Existing accounts continue to log in without signup verification migration. Brevo email templates use HTML plus plain text. Requires the existing BREVO_API_KEY, SMTP_FROM and OTP_SECRET environment variables. Live email and registration flow must be verified after Railway deploy.
