
'use server';
/**
 * @fileOverview A flow for securely fetching public user profile data.
 * It uses the Firebase Admin SDK to bypass client-side security rules for public data.
 */

import { ai } from '@/ai/genkit';
import { initializeFirebaseAdmin } from '@/firebase/server-init';
import {
  GetPublicProfileInput,
  GetPublicProfileInputSchema,
  GetPublicProfileOutput,
  GetPublicProfileOutputSchema,
} from './get-public-profile-schema';
import { getFirestore } from 'firebase-admin/firestore';

export async function getPublicProfile(
  input: GetPublicProfileInput
): Promise<GetPublicProfileOutput | null> {
  return getPublicProfileFlow(input);
}

const getPublicProfileFlow = ai.defineFlow(
  {
    name: 'getPublicProfileFlow',
    inputSchema: GetPublicProfileInputSchema,
    outputSchema: GetPublicProfileOutputSchema.nullable(),
  },
  async (input) => {
    try {
      // Use the Admin SDK to access Firebase services. This is more reliable on the server.
      const { firestore, auth } = initializeFirebaseAdmin();

      // 1. Fetch the user's primary auth record first. This is the source of truth for email/photo.
      const userAuthRecord = await auth.getUser(input.userId);

      // 2. Fetch the corresponding Firestore document for additional custom data.
      const userDocRef = firestore.collection('users').doc(input.userId);
      const userDoc = await userDocRef.get();

      if (!userDoc.exists() && !userAuthRecord) {
        console.warn(`No auth record or Firestore profile found for user ${input.userId}.`);
        return null;
      }
      
      const firestoreData = userDoc.data();

      // 3. Combine data from both sources, prioritizing the Auth record for core info.
      //    Zod will strip any extra fields that aren't in the output schema.
      return {
        uid: userAuthRecord.uid,
        displayName: userAuthRecord.displayName || firestoreData?.displayName,
        photoURL: userAuthRecord.photoURL || firestoreData?.photoURL,
        email: userAuthRecord.email,
        address: firestoreData?.address,
        phone: firestoreData?.phone,
        userType: firestoreData?.userType,
      };

    } catch (e: any) {
      // Handle cases where user is not found in Auth or other errors
      if (e.code === 'auth/user-not-found') {
          console.warn(`Auth record not found for user ${input.userId}.`);
          // Try to get firestore data even if auth record is missing in some cases
          const { firestore } = initializeFirebaseAdmin();
          const userDocRef = firestore.collection('users').doc(input.userId);
          const userDoc = await userDocRef.get();
          if (userDoc.exists()) {
            const firestoreData = userDoc.data()!;
            return {
              uid: input.userId,
              displayName: firestoreData.displayName,
              photoURL: firestoreData.photoURL,
              email: firestoreData.email,
              address: firestoreData.address,
              phone: firestoreData.phone,
              userType: firestoreData.userType,
            }
          }
          return null; // A missing user is not a system failure.
      }
      console.error(`Flow Error: Failed to fetch profile data for user ${input.userId}.`, e);
      // For other errors (like network issues), re-throw to signal a problem.
      throw new Error(`Failed to fetch profile for user ${input.userId}: ${e.message}`);
    }
  }
);
