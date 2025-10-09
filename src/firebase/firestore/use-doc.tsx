
'use client';
    
import { useState, useEffect, useCallback } from 'react';
import {
  DocumentReference,
  onSnapshot,
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { getDocData, addDocData } from '@/lib/indexed-db';

/** Utility type to add an 'id' field to a given type T. */
type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useDoc hook.
 * @template T Type of the document data.
 */
export interface UseDocResult<T> {
  data: WithId<T> | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
  refetch: () => void; // Function to manually refetch data.
}

const CACHEABLE_STORES = ['listings', 'jobs', 'feedbacks', 'users'];

// Firestore Timestamps are not clonable for IndexedDB, so we convert them to JS Dates
function convertTimestampsToDates(obj: any): any {
    if (obj instanceof Timestamp) {
        return obj.toDate();
    }
    if (Array.isArray(obj)) {
        return obj.map(convertTimestampsToDates);
    }
    if (obj && typeof obj === 'object') {
        const newObj: { [key: string]: any } = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                newObj[key] = convertTimestampsToDates(obj[key]);
            }
        }
        return newObj;
    }
    return obj;
}

/**
 * React hook to subscribe to a single Firestore document in real-time.
 * Handles nullable references.
 * 
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or BAD THINGS WILL HAPPEN
 * use useMemo to memoize it per React guidence.  Also make sure that it's dependencies are stable
 * references
 *
 *
 * @template T Optional type for document data. Defaults to any.
 * @param {DocumentReference<DocumentData> | null | undefined} docRef -
 * The Firestore DocumentReference. Waits if null/undefined.
 * @returns {UseDocResult<T>} Object with data, isLoading, error.
 */
export function useDoc<T = any>(
  memoizedDocRef: DocumentReference<DocumentData> | null | undefined,
): UseDocResult<T> {
  type StateDataType = WithId<T> | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);
  const [_, setRefetchTrigger] = useState(0); // State to trigger refetch

  const refetch = useCallback(() => {
    setRefetchTrigger(c => c + 1);
  }, []);

  useEffect(() => {
    if (!memoizedDocRef) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const storeName = memoizedDocRef.path.split('/')[0];
    const docId = memoizedDocRef.id;
    const isCacheable = CACHEABLE_STORES.includes(storeName);

    let didCancel = false;

    // --- Phase 1: Load from IndexedDB if available ---
    if (isCacheable) {
      getDocData(storeName, docId).then(cachedData => {
        if (!didCancel && cachedData) {
          setData(convertTimestampsToDates({ ...cachedData, id: docId }) as StateDataType);
          setIsLoading(false); // We have data, loading is "done" for the UI
        }
      }).catch(console.error);
    } else {
      setIsLoading(true);
    }

    // --- Phase 2: Subscribe to Firestore ---
    const unsubscribe = onSnapshot(
      memoizedDocRef,
      (snapshot: DocumentSnapshot<DocumentData>) => {
        if (didCancel) return;

        if (snapshot.exists()) {
          const docData = { ...(snapshot.data() as T), id: snapshot.id };
          const dataWithDates = convertTimestampsToDates(docData);
          setData(dataWithDates as StateDataType);

          // --- Phase 3: Update IndexedDB cache ---
          if (isCacheable) {
            addDocData(storeName, dataWithDates).catch(console.error);
          }
        } else {
          // Document does not exist
          setData(null);
        }
        setError(null); // Clear any previous error on successful snapshot
        setIsLoading(false);
      },
      (error: FirestoreError) => {
        if (didCancel) return;
        
        const contextualError = new FirestorePermissionError({
          operation: 'get',
          path: memoizedDocRef.path,
        })

        setError(contextualError)
        setData(null)
        setIsLoading(false)

        // trigger global error propagation
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => {
      didCancel = true;
      unsubscribe();
    };
  }, [memoizedDocRef, refetch]); // Re-run if the docRef object changes or refetch is called

  return { data, isLoading, error, refetch };
}
