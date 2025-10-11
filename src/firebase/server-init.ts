
import { initializeApp, getApps, getApp, App, cert, ServiceAccount, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

let app: App;

export function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    app = getApp();
  } else {
    const serviceAccountString = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

    if (process.env.NODE_ENV !== 'production' && serviceAccountString) {
      // Local development: Use the Base64 encoded service account key.
      try {
        const serviceAccount: ServiceAccount = JSON.parse(
          Buffer.from(serviceAccountString, 'base64').toString('utf8')
        );
        app = initializeApp({
          credential: cert(serviceAccount),
          storageBucket: storageBucket,
        });
      } catch (e: any) {
        throw new Error(
          `Failed to parse GOOGLE_APPLICATION_CREDENTIALS for local dev. Make sure it is a valid Base64-encoded JSON string. Original error: ${e.message}`
        );
      }
    } else {
      // Production (e.g., App Hosting): Use Application Default Credentials.
      app = initializeApp({
        credential: applicationDefault(),
        storageBucket: storageBucket,
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
