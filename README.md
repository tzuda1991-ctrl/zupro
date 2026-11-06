# STAR777 — Web + Android Demo

STAR777 is a mobile-first web app prototype, deployed to Railway and wrapped in an Android WebView APK built by GitHub Actions.

## Run locally
```sh
npm install
npm start
```
Open http://localhost:3000

## Railway
Connect this GitHub repository to Railway. Railway will install Node dependencies and run `npm start`. Health check: `/api/health`.

## Android
After Railway deployment, replace `https://example.com` in `android/app/src/main/java/com/star777/app/MainActivity.kt` with your Railway HTTPS URL. Then run **Build STAR777 APK** in GitHub Actions and download the debug APK artifact. Debug APK is for testing only.

## Current scope
- Responsive signup/login **demo UI** (no authentication service or persisted accounts)
- Home market list loaded from Express API with **sample schedules**
- Navigation, market category tiles, empty result charts, demo wallet
- No real-money gaming, deposits, withdrawals, payment processing or bank-data collection
- Branding illustration is placeholder emoji; approved STAR777 logo artwork still needs to be added as an asset
- No database yet

Do not treat demo login as secure authentication. Add a secure backend, data persistence and legal review before production use.
