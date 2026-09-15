# Week timer

Personal weekly time tracker for studying, clubs, chess, YouTube, Instagram, and eating. Data syncs through Cloud Firestore in production mode after you add project keys and sign in with Google.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Without Firebase keys, time is stored in this browser only.

## Create a Firestore database in production mode

1. Open [Firebase Console](https://console.firebase.google.com/) and create a project (or pick one you already have).
2. Click the web icon `</>` to add a web app. Copy the config values.
3. Go to **Build → Firestore Database → Create database**.
4. Choose **production mode**, pick a region, and create it. Do not use test mode.
5. Go to **Firestore → Rules**, paste the contents of `firestore.rules`, and publish. Those rules only let a signed-in user read and write their own data.
6. Go to **Authentication → Sign-in method → Google → Enable**. Add your Vercel domain under **Authentication → Settings → Authorized domains**.
7. Paste the web config values into `.env.local` and into Vercel → Project → Settings → Environment Variables.
8. Redeploy on Vercel, then sign in with Google in the app.

## Deploy

The GitHub repo is connected to Vercel. After adding env vars, run a new production deploy.
