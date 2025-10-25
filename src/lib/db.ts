
'use client';

import { openDB, type DBSchema } from 'idb';

const DB_NAME = 'khmer-hub';
const DB_VERSION = 1;
const JOBS_STORE = 'jobs';

interface KhmerHubDB extends DBSchema {
  [JOBS_STORE]: {
    key: string;
    value: any;
    indexes: { 'createdAt': string };
  };
}

const dbPromise = typeof window !== 'undefined'
  ? openDB<KhmerHubDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(JOBS_STORE)) {
        const store = db.createObjectStore(JOBS_STORE, { keyPath: 'id' });
        // Create an index on 'createdAt' to allow for efficient sorting
        store.createIndex('createdAt', 'createdAt');
      }
    },
  })
  : null;


export async function putJobs(jobs: any[]) {
    if (!dbPromise) return;
    try {
        const db = await dbPromise;
        const tx = db.transaction(JOBS_STORE, 'readwrite');
        const jobsToStore = jobs.map(job => ({
            ...job,
            // Convert Firestore Timestamps to JS Date objects for IndexedDB
            createdAt: job.createdAt?.toDate ? job.createdAt.toDate() : new Date(job.createdAt || Date.now())
        }));
        await Promise.all(jobsToStore.map(job => tx.store.put(job)));
        await tx.done;
    } catch (error) {
        console.error("Failed to put jobs in IndexedDB", error);
    }
}

export async function putJob(job: any) {
    if (!dbPromise) return;
    try {
        const db = await dbPromise;
        const jobToStore = {
            ...job,
            // Convert Firestore Timestamps to JS Date objects for IndexedDB
            createdAt: job.createdAt?.toDate ? job.createdAt.toDate() : new Date(job.createdAt || Date.now())
        };
        await db.put(JOBS_STORE, jobToStore);
    } catch (error) {
        console.error(`Failed to put job ${job.id} in IndexedDB`, error);
    }
}

export async function deleteJob(jobId: string) {
    if (!dbPromise) return;
    try {
        const db = await dbPromise;
        await db.delete(JOBS_STORE, jobId);
    } catch (error) {
        console.error(`Failed to delete job ${jobId} from IndexedDB`, error);
    }
}


export async function getAllJobs() {
    if (!dbPromise) return [];
    try {
        const db = await dbPromise;
        // Use the 'createdAt' index to get jobs sorted by creation date
        const sortedJobs = await db.getAllFromIndex(JOBS_STORE, 'createdAt');
        // Reverse the array to get descending order (newest first)
        return sortedJobs.reverse();
    } catch (error) {
        console.error("Failed to get all jobs from IndexedDB", error);
        return [];
    }
}
