
import { initializeApp, getApps, getApp, App } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';
import { credential } from 'firebase-admin';

let app: App;

export function initializeFirebaseAdmin() {
  if (!getApps().length) {
    // When running in a Google environment (like App Hosting), the SDK can auto-discover credentials.
    // However, for local development or other environments, we may need to be explicit.
    // The "Could not refresh access token" error suggests auto-discovery is failing.
    // By explicitly using credential.applicationDefault(), we instruct the SDK to find
    // the GOOGLE_APPLICATION_CREDENTIALS environment variable, which is a more robust
    // way to handle server-side authentication.
    app = initializeApp({
        credential: credential.applicationDefault(),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    });
  } else {
    app = getApp();
  }

  return { 
    app,
    storage: getStorage(app),
    auth: getAuth(app),
  };
}
