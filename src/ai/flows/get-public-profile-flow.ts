
'use server';
/**
 * @fileOverview A flow for securely fetching public user profile data.
 * It first tries to fetch from the Firestore 'users' collection. If not found,
 * it falls back to fetching basic information from Firebase Authentication.
 */

import { ai } from '@/ai/genkit';
import { initializeFirebaseAdmin } from '@/firebase/server-init';
import {
  GetPublicProfileInput,
  GetPublicProfileInputSchema,
  GetPublicProfileOutput,
  GetPublicProfileOutputSchema,
} from './get-public-profile-schema';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';


export async function getPublicProfile(
  input: GetPublicProfileInput
): Promise<GetPublicProfileOutput> {
  return getPublicProfileFlow(input);
}

const getPublicProfileFlow = ai.defineFlow(
  {
    name: 'getPublicProfileFlow',
    inputSchema: GetPublicProfileInputSchema,
    outputSchema: GetPublicProfileOutputSchema,
  },
  async (input) => {
    try {
      const { app } = initializeFirebaseAdmin();
      const firestore = getFirestore(app);

      // 1. Try to get the comprehensive profile from Firestore first.
      const userDocRef = firestore.collection('users').doc(input.userId);
      const userDoc = await userDocRef.get();
      

      if (userDoc.exists) {
        const userData = userDoc.data();
        // Return rich data from Firestore. Zod will strip extra fields.
        return {
          uid: userDoc.id,
          displayName: userData?.displayName,
          photoURL: userData?.photoURL,
          email: userData?.email,
          address: userData?.address,
          phone: userData?.phone,
          userType: userData?.userType,
        };
      }

      // 2. If not in Firestore, fall back to Firebase Auth for basic info.
      // This handles cases where the Firestore doc creation might have failed or is pending.
      console.warn(`Firestore profile not found for user ${input.userId}. Falling back to Auth.`);
      const auth = getAuth(app);
      const userRecord = await auth.getUser(input.userId);

      // Return basic data from Auth.
      return {
        uid: userRecord.uid,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
        email: userRecord.email,
        address: '', // Not available in Auth
        phone: userRecord.phoneNumber, // May be available
        userType: 'standard', // Default assumption
      };

    } catch (e: any) {
      console.error(`Flow Error: Failed to fetch any profile data for user ${input.userId}.`, e);
      throw new Error(`Failed to fetch profile for user ${input.userId}: ${e.message}`);
    }
  }
);
