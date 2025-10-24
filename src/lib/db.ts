
'use client';

import { openDB, type DBSchema } from 'idb';

const DB_NAME = 'cambodia-hub-db';
const DB_VERSION = 1;
const JOB_STORE = 'jobs';

interface MyDB extends DBSchema {
  [JOB_STORE]: {
    key: string;
    value: any; // Using `any` for flexibility with job document structure
    indexes: { 'createdAt': Date };
  };
}

const dbPromise = typeof window !== 'undefined' 
  ? openDB<MyDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(JOB_STORE)) {
          const store = db.createObjectStore(JOB_STORE, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt');
        }
      },
    })
  : null;

/**
 * Adds or updates multiple jobs in the IndexedDB.
 * @param jobs An array of job objects to be stored.
 */
export async function putJobs(jobs: any[]): Promise<void> {
  if (!dbPromise) return;
  try {
    const db = await dbPromise;
    const tx = db.transaction(JOB_STORE, 'readwrite');
    // Ensure createdAt is a valid Date object for indexing
    const jobsToStore = jobs.map(job => ({
        ...job,
        createdAt: job.createdAt?.toDate ? job.createdAt.toDate() : new Date(job.createdAt || Date.now())
    }));
    await Promise.all(jobsToStore.map(job => tx.store.put(job)));
    await tx.done;
  } catch (error) {
    console.error("Failed to put jobs in IndexedDB", error);
  }
}

/**
 * Retrieves all jobs from IndexedDB, sorted by creation date descending.
 * @returns A promise that resolves to an array of job objects.
 */
export async function getAllJobs(): Promise<any[]> {
  if (!dbPromise) return [];
  try {
    const db = await dbPromise;
    // Use the 'createdAt' index to get jobs sorted in ascending order
    const sortedJobs = await db.getAllFromIndex(JOB_STORE, 'createdAt');
    // Reverse the array to get descending order (newest first)
    return sortedJobs.reverse();
  } catch (error) {
    console.error("Failed to get all jobs from IndexedDB", error);
    return [];
  }
}
