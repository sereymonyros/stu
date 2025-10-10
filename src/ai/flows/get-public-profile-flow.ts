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
      // Use the Admin SDK to access Firestore, not Auth
      const { app } = initializeFirebaseAdmin();
      const firestore = (await import('firebase-admin/firestore')).getFirestore(app);
      
      const userDocRef = firestore.collection('users').doc(input.userId);
      const userDoc = await userDocRef.get();

      if (!userDoc.exists) {
        throw new Error(`User profile not found for user ${input.userId}`);
      }
      
      const userData = userDoc.data();

      // Return data that matches the output schema.
      // Zod will automatically strip any extra fields.
      return {
        uid: userDoc.id,
        displayName: userData?.displayName,
        photoURL: userData?.photoURL,
        email: userData?.email,
        address: userData?.address,
        phone: userData?.phone,
        userType: userData?.userType,
      };

    } catch (e: any) {
      console.error('Flow Error: Failed to fetch user profile from Firestore.', e);
      throw new Error(`Failed to fetch profile for user ${input.userId}: ${e.message}`);
    }
  }
);
