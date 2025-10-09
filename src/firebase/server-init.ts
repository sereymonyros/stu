
import { initializeApp, getApps, getApp, App } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
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

  return { 
    app,
    storage: getStorage(app),
    auth: getAuth(app),
  };
}
