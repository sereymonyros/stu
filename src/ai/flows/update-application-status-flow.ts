
'use server';
/**
 * @fileOverview A server-side flow to update an applicant's status using Firebase Admin.
 * This bypasses client-side security rules for recruiters.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { initializeFirebaseAdmin } from '@/firebase/server-init';

const UpdateApplicationStatusInputSchema = z.object({
  jobId: z.string().describe("The ID of the job."),
  applicationId: z.string().describe("The ID of the application document (usually the applicant's UID)."),
  applicantId: z.string().describe("The UID of the applicant user."),
  newStatus: z.enum(["submitted", "reviewed", "offered", "accepted", "rejected"]),
});
export type UpdateApplicationStatusInput = z.infer<typeof UpdateApplicationStatusInputSchema>;

export async function updateApplicationStatus(input: UpdateApplicationStatusInput): Promise<void> {
  return updateApplicationStatusFlow(input);
}

const updateApplicationStatusFlow = ai.defineFlow(
  {
    name: 'updateApplicationStatusFlow',
    inputSchema: UpdateApplicationStatusInputSchema,
    outputSchema: z.void(),
  },
  async ({ jobId, applicationId, applicantId, newStatus }) => {
    try {
      const { firestore } = initializeFirebaseAdmin();
      
      // Path to the main application document under the job
      const mainApplicationRef = firestore.collection('jobs').doc(jobId).collection('applications').doc(applicationId);
      
      // Path to the user's copy of the application reference
      const userApplicationRef = firestore.collection('users').doc(applicantId).collection('applications').doc(jobId);

      const statusUpdate = { status: newStatus };

      // Use a batch write to ensure both documents are updated atomically
      const batch = firestore.batch();
      
      batch.update(mainApplicationRef, statusUpdate);
      batch.update(userApplicationRef, statusUpdate);

      // If the new status is "accepted", also update the job's status to "Closed"
      if (newStatus === 'accepted') {
        const jobRef = firestore.collection('jobs').doc(jobId);
        batch.update(jobRef, { status: 'Closed' });
      }

      await batch.commit();

    } catch (e: any) {
      console.error(`Flow Error: Failed to update application status for job ${jobId}, app ${applicationId}.`, e);
      // Re-throw a more user-friendly error to be displayed on the client.
      throw new Error(`Server-side failure to update status: ${e.message}`);
    }
  }
);
