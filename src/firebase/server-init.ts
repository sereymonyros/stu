
import { initializeApp, getApps, getApp, App } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';

let app: App;

export function initializeFirebaseAdmin() {
  if (!getApps().length) {
    // When running in a Google environment (like App Hosting), the SDK can auto-discover credentials
    // by not providing a `credential` property to initializeApp.
    app = initializeApp({
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
