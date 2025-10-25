
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

export async function putJob(job: any) {
    if (typeof window === 'undefined') return;
    try {
        const db = await getDb();
        await db.put(JOBS_STORE, job);
    } catch (error) {
        console.error(`Failed to put job ${job.id} in IndexedDB`, error);
    }
}

export async function deleteJob(jobId: string) {
    if (typeof window === 'undefined') return;
    try {
        const db = await getDb();
        await db.delete(JOBS_STORE, jobId);
    } catch (error) {
        console.error(`Failed to delete job ${jobId} from IndexedDB`, error);
    }
}


export async function getAllJobs() {
    if (typeof window === 'undefined') return [];
    try {
        const db = await getDb();
        // Use the 'createdAt' index to get jobs sorted by creation date
        const sortedJobs = await db.getAllFromIndex(JOBS_STORE, 'createdAt');
        // Reverse the array to get descending order (newest first)
        return sortedJobs.reverse();
    } catch (error) {
        console.error("Failed to get all jobs from IndexedDB", error);
        return [];
    }
}
