
'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage';
import { firebaseConfig } from './config';

/**
 * Initializes and returns the Firebase SDKs.
 * This function is idempotent, meaning it can be called multiple times without re-initializing.
 */
export function initializeFirebase() {
  // If no Firebase app has been initialized yet, initialize one with the config.
  if (!getApps().length) {
    const firebaseApp = initializeApp(firebaseConfig);
    return getSdks(firebaseApp);
  }

  // If an app is already initialized, get the existing app and return its SDKs.
  return getSdks(getApp());
}

/**
 * A helper function to get all the necessary SDK instances from a FirebaseApp instance.
 * @param firebaseApp The initialized Firebase App.
 * @returns An object containing the Auth, Firestore, and Storage SDKs.
 */
export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    storage: getStorage(firebaseApp),
  };
}

// Export hooks and utilities for easy access throughout the app
export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './auth/use-user';
export * from './errors';
export * from './error-emitter';
