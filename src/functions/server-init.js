'use strict';

const { initializeApp, getApps, getApp, cert, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getStorage } = require('firebase-admin/storage');

let app;

const isProduction = !!(process.env.K_SERVICE || process.env.GOOGLE_CLOUD_PROJECT || process.env.APP_HOSTING);

function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    app = getApp();
  } else {
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

    if (isProduction) {
        app = initializeApp({
            credential: applicationDefault(),
            storageBucket: storageBucket,
        });
    } else {
        const serviceAccountString = process.env.NEXT_PUBLIC_GOOGLE_APPLICATION_CREDENTIALS;
        if (!serviceAccountString) {
            throw new Error('LOCAL DEV ERROR: The NEXT_PUBLIC_GOOGLE_APPLICATION_CREDENTIALS environment variable is not set.');
        }
        try {
            const serviceAccount = JSON.parse(
              Buffer.from(serviceAccountString, 'base64').toString('utf8')
            );
            app = initializeApp({
              credential: cert(serviceAccount),
              storageBucket: storageBucket,
            });
        } catch (e) {
            throw new Error(`Failed to parse NEXT_PUBLIC_GOOGLE_APPLICATION_CREDENTIALS. Original error: ${e.message}`);
        }
    }
  }

  return {
    app,
    firestore: getFirestore(app),
    auth: getAuth(app),
    storage: getStorage(app),
  };
}

module.exports = { initializeFirebaseAdmin };
