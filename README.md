# Week timer

Personal weekly time tracker for classes, chess, YouTube, Instagram, and eating. Data lives in Firebase Firestore so it can sync across devices after you add project keys.

Tracked activities:

- Chess
- PHIL 1125, ECON 2251, MATH 2460, S&DS 2410, CHNS 1300
- YouTube
- Instagram
- Eating

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Without Firebase keys, time is stored in this browser only.

## Firebase

1. Create a Firebase project and a Cloud Firestore database.
2. Paste the web app config values into `.env.local` and into Vercel environment variables.
3. Set `NEXT_PUBLIC_OWNER_ID` to the same value on every device, for example `charlie`.
4. Publish rules from `firestore.rules` (Firebase console or `firebase deploy --only firestore:rules`).

## Deploy

Push to GitHub, then import the repo in Vercel. Add the same `NEXT_PUBLIC_*` variables before the production build.
