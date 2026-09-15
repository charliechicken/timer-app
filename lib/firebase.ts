import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null;
  return getApps()[0] ?? initializeApp(firebaseConfig);
}

export function getDb(): Firestore | null {
  const app = getFirebaseApp();
  return app ? getFirestore(app) : null;
}

export function getAuthClient(): Auth | null {
  const app = getFirebaseApp();
  return app ? getAuth(app) : null;
}

export function watchAuth(onChange: (user: User | null) => void): () => void {
  const auth = getAuthClient();
  if (!auth) {
    onChange(null);
    return () => undefined;
  }
  return onAuthStateChanged(auth, onChange);
}

export async function signInWithGoogle(options?: {
  gmailSend?: boolean;
}): Promise<string | null> {
  const auth = getAuthClient();
  if (!auth) throw new Error("Firebase is not configured");
  const provider = new GoogleAuthProvider();
  provider.addScope("email");
  if (options?.gmailSend) {
    provider.addScope("https://www.googleapis.com/auth/gmail.send");
    provider.setCustomParameters({ prompt: "consent" });
  } else {
    provider.setCustomParameters({ prompt: "select_account" });
  }
  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  return credential?.accessToken ?? null;
}

export async function signOutUser(): Promise<void> {
  const auth = getAuthClient();
  if (auth) await signOut(auth);
}
