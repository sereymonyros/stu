"use server";

import { redirect } from 'next/navigation';
import { initializeFirebase } from '@/firebase/index.server';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

export async function search(formData: FormData) {
  const queryText = formData.get("query") as string;
  const userId = formData.get("userId") as string | null;

  if (!queryText) {
    console.log("Search query is empty.");
    return;
  }

  if (userId) {
    try {
      const { firestore } = initializeFirebase();
      const queriesCollection = collection(firestore, `users/${userId}/searchQueries`);
      const q = query(queriesCollection, where('queryText', '==', queryText));
      
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        await addDoc(queriesCollection, {
          queryText: queryText,
          timestamp: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Error saving search query:", error);
      // We can decide how to handle this error. For now, we'll log it.
      // The search redirection will still happen.
    }
  }

  redirect(`/search?q=${encodeURIComponent(queryText)}`);
}
