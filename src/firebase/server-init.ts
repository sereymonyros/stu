
import { initializeApp, getApps, getApp, App } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { credential } from 'firebase-admin';

let app: App;

export function initializeFirebaseAdmin() {
  if (!getApps().length) {
    // When running in a Google environment, the SDK can auto-discover credentials.
    // Otherwise, you might need to use a service account.
    try {
        app = initializeApp({
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
        });
    } catch(e) {
        console.warn("Could not initialize Firebase Admin SDK with default credentials. This is expected in local development if GOOGLE_APPLICATION_CREDENTIALS is not set.", e);
        // Fallback for local dev if needed, though auto-discovery is preferred.
        // Ensure you have a service account file and GOOGLE_APPLICATION_CREDENTIALS set.
        app = initializeApp();
    }
  } else {
    app = getApp();
  }

  return { 
    app,
    storage: getStorage(app),
  };
}
