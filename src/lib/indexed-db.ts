'use client';

import { openDB, DBSchema, IDBPDatabase } from 'idb';

const DB_NAME = 'CambodiaHubCache';
const DB_VERSION = 2;
const STORES = ['listings', 'jobs', 'feedbacks', 'chats'];

interface CacheDB extends DBSchema {
  listings: {
    key: string;
    value: any;
  };
  jobs: {
    key: string;
    value: any;
  };
  feedbacks: {
    key: string;
    value: any;
  };
  chats: {
    key: string;
    value: any;
  }
}

let dbPromise: Promise<IDBPDatabase<CacheDB>> | null = null;

function initDB() {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = openDB<CacheDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      for (const storeName of STORES) {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName as keyof CacheDB, { keyPath: 'id' });
        }
      }
    },
  });
  return dbPromise;
}

export async function getStoreData(storeName: string) {
  if (!STORES.includes(storeName)) {
    throw new Error(`Invalid store name: ${storeName}`);
  }
  const db = await initDB();
  return db.getAll(storeName as keyof CacheDB);
}

export async function getDocData(storeName: string, id: string) {
    if (!STORES.includes(storeName)) {
        throw new Error(`Invalid store name: ${storeName}`);
    }
    const db = await initDB();
    return db.get(storeName as keyof CacheDB, id);
}

export async function addDocData(storeName: string, data: any) {
    if (!STORES.includes(storeName)) {
      throw new Error(`Invalid store name: ${storeName}`);
    }
    const db = await initDB();
    const tx = db.transaction(storeName as keyof CacheDB, 'readwrite');
    await tx.store.put(data);
    await tx.done;
}


export async function updateStoreData(storeName: string, data: any[]) {
  if (!STORES.includes(storeName)) {
    throw new Error(`Invalid store name: ${storeName}`);
  }
  const db = await initDB();
  const tx = db.transaction(storeName as keyof CacheDB, 'readwrite');
  // Clear the old data first to remove deleted items
  await tx.store.clear(); 
  // Then, add all the new items
  await Promise.all(data.map(item => tx.store.put(item)));
  await tx.done;
}

export async function clearStoreData(storeName: string) {
  if (!STORES.includes(storeName)) {
    throw new Error(`Invalid store name: ${storeName}`);
  }
  const db = await initDB();
  const tx = db.transaction(storeName as keyof CacheDB, 'readwrite');
  await tx.store.clear();
  await tx.done;
}
