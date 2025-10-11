
import { initializeApp, getApps, getApp, App, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

let app: App;

export function initializeFirebaseAdmin() {
  if (getApps().length) {
    app = getApp();
  } else {
    const serviceAccountString = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    // During local development, we use the Base64 encoded service account key.
    if (process.env.NODE_ENV !== 'production' && serviceAccountString) {
      try {
        const serviceAccount: ServiceAccount = JSON.parse(
          Buffer.from(serviceAccountString, 'base64').toString('utf8')
        );
        app = initializeApp({
          credential: cert(serviceAccount),
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });
      } catch (e: any) {
        // Throw a helpful error if the key is malformed.
        throw new Error(
          `Failed to parse GOOGLE_APPLICATION_CREDENTIALS. Make sure it is a valid Base64-encoded JSON string. Original error: ${e.message}`
        );
      }
    } else {
      // In production (e.g., App Hosting), the SDK auto-discovers credentials.
      // The credential is not required in this case.
      app = initializeApp({
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
    }
  }

  // Return all necessary admin services.
  return { 
    app,
    firestore: getFirestore(app),
    auth: getAuth(app),
    storage: getStorage(app),
  };
}
