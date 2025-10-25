
import { initializeApp, getApps, getApp, App, cert, ServiceAccount, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

let app: App;

// Helper to determine if running in a Google Cloud production environment, specifically App Hosting
const isProduction = !!(process.env.K_SERVICE || process.env.GOOGLE_CLOUD_PROJECT);

export function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    app = getApp();
  } else {
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

    // Use Application Default Credentials in production environments (like App Hosting)
    if (isProduction) {
        app = initializeApp({
            credential: applicationDefault(),
            storageBucket: storageBucket,
        });
    } else {
        // For local development, we require a Base64-encoded service account key.
        const serviceAccountString = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        if (!serviceAccountString) {
            // Updated to be more descriptive and actionable for the developer.
            throw new Error(
                'LOCAL DEV ERROR: The GOOGLE_APPLICATION_CREDENTIALS environment variable is not set. This is required for server-side flows that use the Firebase Admin SDK. Please go to your Firebase project settings, generate a new private key (service account), Base64-encode it, and add it to your .env file. See the README or setup documentation for more details.'
            );
        }
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
