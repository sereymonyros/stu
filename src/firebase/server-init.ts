
import { initializeApp, getApps, getApp, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let app: App;

export function initializeFirebaseAdmin() {
  if (!getApps().length) {
    // When running in a Google environment (like App Hosting), the SDK can auto-discover credentials
    // by calling initializeApp() with no arguments.
    app = initializeApp();
  } else {
    app = getApp();
  }

  // Only initialize and return the services that are actually needed and permitted.
  // In this case, many server-side flows only need Firestore.
  return { 
    app,
    firestore: getFirestore(app),
  };
}
