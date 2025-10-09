'use server';
/**
 * @fileOverview A flow for securely fetching public user profile data.
 */

import { ai } from '@/ai/genkit';
import { initializeFirebaseAdmin } from '@/firebase/server-init';
import { z } from 'zod';

export const GetPublicProfileInputSchema = z.object({
  userId: z.string().describe('The UID of the user to fetch.'),
});
export type GetPublicProfileInput = z.infer<typeof GetPublicProfileInputSchema>;

export const GetPublicProfileOutputSchema = z.object({
  uid: z.string(),
  displayName: z.string().optional(),
  photoURL: z.string().optional(),
  email: z.string().optional(),
});
export type GetPublicProfileOutput = z.infer<typeof GetPublicProfileOutputSchema>;

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
