
'use server';
/**
 * @fileOverview A secure, server-side flow to withdraw a job application.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { initializeFirebaseAdmin } from '@/firebase/server-init';

const WithdrawApplicationInputSchema = z.object({
  jobId: z.string().describe("The ID of the job from which to withdraw."),
  userId: z.string().describe("The UID of the user withdrawing the application."),
});
export type WithdrawApplicationInput = z.infer<typeof WithdrawApplicationInputSchema>;

const WithdrawApplicationOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type WithdrawApplicationOutput = z.infer<typeof WithdrawApplicationOutputSchema>;


export async function withdrawApplication(
  input: WithdrawApplicationInput
): Promise<WithdrawApplicationOutput> {
  return withdrawApplicationFlow(input);
}

const withdrawApplicationFlow = ai.defineFlow(
  {
    name: 'withdrawApplicationFlow',
    inputSchema: WithdrawApplicationInputSchema,
    outputSchema: WithdrawApplicationOutputSchema,
  },
  async ({ jobId, userId }) => {
    try {
      const { firestore } = initializeFirebaseAdmin();

      // Path to the main application document under the job
      const mainApplicationRef = firestore.collection('jobs').doc(jobId).collection('applications').doc(userId);
      
      // Path to the user's copy of the application reference
      const userApplicationRef = firestore.collection('users').doc(userId).collection('applications').doc(jobId);

      // Use a batch write to ensure both documents are deleted atomically
      const batch = firestore.batch();
      
      batch.delete(mainApplicationRef);
      batch.delete(userApplicationRef);

      await batch.commit();

      return { success: true, message: "Application successfully withdrawn." };

    } catch (e: any) {
      console.error(`Flow Error: Failed to withdraw application for user ${userId} from job ${jobId}.`, e);
      // Re-throw a more user-friendly error to be displayed on the client.
      throw new Error(`Server-side failure to withdraw application: ${e.message}`);
    }
  }
);
