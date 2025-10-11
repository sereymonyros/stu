
'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
  Timestamp,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { getStoreData, updateStoreData } from '@/lib/indexed-db';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading, especially on the initial fetch.
  error: FirestoreError | Error | null; // Error object, or null.
}

/* Internal implementation of Query:
  https://github.com/firebase/firebase-js-sdk/blob/c5f08a9bc5da0d2b0207802c972d53724ccef055/packages/firestore/src/lite-api/reference.ts#L143
*/
export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    },
    explicitOrderBy: any[],
    filters: any[],
  }
}

function getCollectionPath(target: CollectionReference | Query): string {
    if (target.type === 'collection') {
        return (target as CollectionReference).path;
    }
    // This is a workaround to get the canonical path string from a query.
    return (target as unknown as InternalQuery)._query.path.canonicalString();
}

const CACHEABLE_STORES = ['listings', 'jobs', 'feedbacks', 'chats', 'users'];

// Firestore Timestamps are not clonable for IndexedDB, so we convert them to JS Dates
function convertTimestampsToDates(obj: any): any {
    if (obj instanceof Timestamp) {
        return obj.toDate();
    }
    if (Array.isArray(obj)) {
        return obj.map(convertTimestampsToDates);
    }
    if (obj && typeof obj === 'object' && obj !== null) {
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
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries.
 * 
 *
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or BAD THINGS WILL HAPPEN
 * use useMemo to memoize it per React guidence.  Also make sure that it's dependencies are stable
 * references
 *  
 * @template T Optional type for document data. Defaults to any.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} targetRefOrQuery -
 * The Firestore CollectionReference or Query. Waits if null/undefined.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
    targetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>))  | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    if (!targetRefOrQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const path = getCollectionPath(targetRefOrQuery);
    const storeName = path.split('/')[0];
    const isFilteredQuery = (targetRefOrQuery as unknown as InternalQuery)._query.filters.length > 0;
    const isCacheable = CACHEABLE_STORES.includes(storeName) && !isFilteredQuery;

    let didCancel = false;
    let hasLoadedFromCache = false;
    
    setIsLoading(true);
    setError(null);
    setData(null); // Reset data on new query

    // --- Phase 1: Attempt to load from IndexedDB if cacheable ---
    if (isCacheable) {
        getStoreData(storeName).then(cachedData => {
            if (!didCancel && cachedData && cachedData.length > 0) {
                 hasLoadedFromCache = true;
                 const dataWithDates = cachedData.map(item => convertTimestampsToDates(item));
                 setData(dataWithDates as StateDataType);
                 // We don't set loading to false here, to wait for Firestore confirmation.
            }
        }).catch(console.error);
    }
    
    // --- Phase 2: Subscribe to Firestore for live data ---
    const unsubscribe = onSnapshot(
      targetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        if (didCancel) return;

        // ** THE FIX IS HERE **
        // If we have already loaded from cache and the new snapshot is empty,
        // it's likely a temporary state during connection. Ignore it to prevent flashing.
        if (hasLoadedFromCache && snapshot.empty) {
            return; 
        }

        const results: ResultItemType[] = snapshot.docs.map(doc => ({
            ...(doc.data() as T),
            id: doc.id
        }));
        
        const resultsWithDates = results.map(item => convertTimestampsToDates(item));

        setData(resultsWithDates as StateDataType);
        setError(null);
        setIsLoading(false);

        // --- Phase 3: Update IndexedDB cache in the background ---
        if (isCacheable) {
            // No need to clear first, `put` will overwrite existing keys.
            // And we want to preserve old data if the new snapshot is empty.
            if (resultsWithDates.length > 0) {
                updateStoreData(storeName, resultsWithDates).catch(console.error);
            }
        }
      },
      (error: FirestoreError) => {
        if (didCancel) return;

        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path: path,
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
  }, [targetRefOrQuery]); // Re-run if the target query/reference object changes.

  return { data, isLoading, error };
}
