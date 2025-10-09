'use server';
/**
 * @fileOverview A flow for securely fetching public user profile data.
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
      const { app } = initializeFirebaseAdmin();
      const adminAuth = (await import('firebase-admin/auth')).getAuth(app);
      const userRecord = await adminAuth.getUser(input.userId);

      return {
        uid: userRecord.uid,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
        email: userRecord.email,
      };
    } catch (e: any) {
      console.error('Flow Error: Failed to fetch user profile.', e);
      throw new Error(`Failed to fetch profile for user ${input.userId}: ${e.message}`);
    }
  }
);
