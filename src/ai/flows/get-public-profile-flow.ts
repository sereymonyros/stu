
'use server';
/**
 * @fileOverview A flow for securely fetching public user profile data from Firestore.
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
      // This only initializes what we need: Firestore.
      const { firestore } = initializeFirebaseAdmin();

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
      } else {
        // If the profile doesn't exist in Firestore, return null.
        // The calling component will handle this gracefully.
        console.warn(`Firestore profile not found for user ${input.userId}.`);
        return null;
      }
    } catch (e: any) {
      console.error(`Flow Error: Failed to fetch profile data for user ${input.userId}.`, e);
      // In case of a system error (not just a missing doc), re-throw to signal a problem.
      throw new Error(`Failed to fetch profile for user ${input.userId}: ${e.message}`);
    }
  }
);
