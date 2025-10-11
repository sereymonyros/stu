
'use server';
/**
 * @fileOverview A flow for securely fetching multiple public user profiles in a batch.
 * It uses the Firebase Admin SDK to bypass client-side security rules for public data.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { initializeFirebaseAdmin } from '@/firebase/server-init';
import { GetPublicProfileOutput, GetPublicProfileOutputSchema } from './get-public-profile-schema';
import { DecodedIdToken } from 'firebase-admin/auth';

const GetPublicProfilesInputSchema = z.object({
  userIds: z.array(z.string()).describe('An array of user UIDs to fetch.'),
});
type GetPublicProfilesInput = z.infer<typeof GetPublicProfilesInputSchema>;

// The output will be a map where the key is the user ID.
const GetPublicProfilesOutputSchema = z.record(GetPublicProfileOutputSchema.nullable());
type GetPublicProfilesOutput = z.infer<typeof GetPublicProfilesOutputSchema>;


export async function getPublicProfiles(
  input: GetPublicProfilesInput
): Promise<GetPublicProfilesOutput> {
  return getPublicProfilesFlow(input);
}

const getPublicProfilesFlow = ai.defineFlow(
  {
    name: 'getPublicProfilesFlow',
    inputSchema: GetPublicProfilesInputSchema,
    outputSchema: GetPublicProfilesOutputSchema,
  },
  async (input) => {
    // Prevent trying to fetch an empty list
    if (!input.userIds || input.userIds.length === 0) {
      return {};
    }

    try {
      const { firestore, auth } = initializeFirebaseAdmin();
      const output: GetPublicProfilesOutput = {};

      // 1. Fetch all user auth records in a batch (up to 100 at a time)
      const userAuthRecords = await auth.getUsers(input.userIds.map(uid => ({ uid })));
      const authRecordMap = new Map(userAuthRecords.users.map(u => [u.uid, u]));
      
      // 2. Fetch all Firestore documents in parallel.
      const userDocRefs = input.userIds.map(uid => firestore.collection('users').doc(uid));
      const userDocs = await firestore.getAll(...userDocRefs);
      const firestoreDocMap = new Map(userDocs.map(doc => [doc.id, doc.data()]));

      // 3. Combine the data for each user
      for (const userId of input.userIds) {
          const authRecord = authRecordMap.get(userId);
          const firestoreData = firestoreDocMap.get(userId);

          if (!authRecord && !firestoreData) {
              output[userId] = null;
              continue;
          }

          // Combine data, prioritizing Auth record for core info.
          // Zod will strip any extra fields not in the output schema.
          output[userId] = {
            uid: userId,
            displayName: authRecord?.displayName || firestoreData?.displayName,
            photoURL: authRecord?.photoURL || firestoreData?.photoURL,
            email: authRecord?.email || firestoreData?.email,
            address: firestoreData?.address,
            phone: firestoreData?.phone,
            userType: firestoreData?.userType,
          };
      }

      return output;

    } catch (e: any) {
      console.error(`Flow Error: Failed to fetch batch profile data.`, e);
      // For batch operations, it's better to return an empty object or partial data
      // than to throw and fail the entire request. Here we rethrow for visibility.
      throw new Error(`Failed to fetch profiles: ${e.message}`);
    }
  }
);
