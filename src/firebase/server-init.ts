
import { initializeApp, getApps, getApp, App, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

let app: App;

export function initializeFirebaseAdmin() {
  if (!getApps().length) {
    // In a local development environment, use the service account key.
    // The GOOGLE_APPLICATION_CREDENTIALS environment variable should point to the key file.
    if (process.env.NODE_ENV !== 'production' && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        const serviceAccount = JSON.parse(
          Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'base64').toString('ascii')
        );
        app = initializeApp({
          credential: cert(serviceAccount),
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
        });
      } catch (e) {
        console.error('Error parsing service account key from environment variable.', e);
        // Fallback to default initialization if parsing fails
        app = initializeApp();
      }
    } else {
      // In a production environment (like App Hosting), the SDK can auto-discover credentials.
      app = initializeApp();
    }
  } else {
    app = getApp();
  }

  // Return all necessary admin services.
  return { 
    app,
    firestore: getFirestore(app),
    auth: getAuth(app),
    storage: getStorage(app),
  };
}
