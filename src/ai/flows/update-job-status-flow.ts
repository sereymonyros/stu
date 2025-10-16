
'use server';
/**
 * @fileOverview A server-side flow to update a job's status using Firebase Admin.
 * This bypasses client-side security rules for recruiters.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { initializeFirebaseAdmin } from '@/firebase/server-init';

const UpdateJobStatusInputSchema = z.object({
  jobId: z.string().describe("The ID of the job."),
  newStatus: z.enum(["Available", "Closed"]),
});
export type UpdateJobStatusInput = z.infer<typeof UpdateJobStatusInputSchema>;

export async function updateJobStatus(input: UpdateJobStatusInput): Promise<void> {
  return updateJobStatusFlow(input);
}

const updateJobStatusFlow = ai.defineFlow(
  {
    name: 'updateJobStatusFlow',
    inputSchema: UpdateJobStatusInputSchema,
    outputSchema: z.void(),
  },
  async ({ jobId, newStatus }) => {
    try {
      const { firestore } = initializeFirebaseAdmin();
      
      const jobRef = firestore.collection('jobs').doc(jobId);
      
      const statusUpdate = { status: newStatus };

      await jobRef.update(statusUpdate);

    } catch (e: any) {
      console.error(`Flow Error: Failed to update job status for job ${jobId}.`, e);
      // Re-throw a more user-friendly error to be displayed on the client.
      throw new Error(`Server-side failure to update job status: ${e.message}`);
    }
  }
);
