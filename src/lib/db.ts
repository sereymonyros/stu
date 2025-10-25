
import { openDB, DBSchema } from 'idb';

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

async function getDb() {
  return openDB<KhmerHubDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(JOBS_STORE)) {
        const store = db.createObjectStore(JOBS_STORE, { keyPath: 'id' });
        // Create an index on 'createdAt' to allow for efficient sorting
        store.createIndex('createdAt', 'createdAt');
      }
    },
  });
}

export async function putJobs(jobs: any[]) {
    if (typeof window === 'undefined') return;
    try {
        const db = await getDb();
        const tx = db.transaction(JOBS_STORE, 'readwrite');
        const store = tx.objectStore(JOBS_STORE);
        // Use Promise.all to add all jobs in a single transaction
        await Promise.all(jobs.map(job => store.put(job)));
        await tx.done;
    } catch (error) {
        console.error("Failed to put jobs in IndexedDB", error);
    }
}


export async function getAllJobs() {
    if (typeof window === 'undefined') return [];
    try {
        const db = await getDb();
        const jobs = await db.getAll(JOBS_STORE);
        // Sort by createdAt descending (newest first)
        return jobs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    } catch (error) {
        console.error("Failed to get all jobs from IndexedDB", error);
        return [];
    }
}
