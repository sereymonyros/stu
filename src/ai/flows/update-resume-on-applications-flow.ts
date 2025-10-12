
'use server';
/**
 * @fileOverview A secure, server-side flow to update the resume URL on all of a user's active job applications.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { initializeFirebaseAdmin } from '@/firebase/server-init';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase-admin/firestore';

const UpdateResumeOnApplicationsInputSchema = z.object({
  userId: z.string().describe("The UID of the user whose applications should be updated."),
  newResumeUrl: z.string().url().describe("The new, public URL of the user's resume."),
});
export type UpdateResumeOnApplicationsInput = z.infer<typeof UpdateResumeOnApplicationsInputSchema>;

const UpdateResumeOnApplicationsOutputSchema = z.object({
  success: z.boolean(),
  updatedCount: z.number(),
});
export type UpdateResumeOnApplicationsOutput = z.infer<typeof UpdateResumeOnApplicationsOutputSchema>;

export async function updateResumeOnApplications(
  input: UpdateResumeOnApplicationsInput
): Promise<UpdateResumeOnApplicationsOutput> {
  return updateResumeOnApplicationsFlow(input);
}

const updateResumeOnApplicationsFlow = ai.defineFlow(
  {
    name: 'updateResumeOnApplicationsFlow',
    inputSchema: UpdateResumeOnApplicationsInputSchema,
    outputSchema: UpdateResumeOnApplicationsOutputSchema,
  },
  async ({ userId, newResumeUrl }) => {
    try {
      const { firestore } = initializeFirebaseAdmin();

      // 1. Find all of a user's application references where the status is still active.
      const userApplicationsQuery = firestore
        .collection('users').doc(userId).collection('applications')
        .where('status', 'in', ['submitted', 'reviewed']);
      
      const userApplicationsSnapshot = await userApplicationsQuery.get();

      if (userApplicationsSnapshot.empty) {
        // No active applications to update, so we're done.
        return { success: true, updatedCount: 0 };
      }

      // 2. Prepare a batch write to update all relevant documents atomically.
      const batch = firestore.batch();
      let updatedCount = 0;

      // 3. For each application reference, update the corresponding document in the 'jobs' collection.
      for (const userAppDoc of userApplicationsSnapshot.docs) {
        // THE FIX: The document ID of the user's application reference *is* the jobId.
        const jobId = userAppDoc.id;
        
        if (jobId) {
          // Construct the correct path to the main application document.
          // The document ID for an application under a job is the applicant's UID.
          const mainApplicationRef = firestore.collection('jobs').doc(jobId).collection('applications').doc(userId);
          
          // Add the update operation to the batch.
          batch.update(mainApplicationRef, { resumeUrl: newResumeUrl });
          updatedCount++;
        }
      }

      // 4. Commit the batch if there are updates to perform.
      if (updatedCount > 0) {
        await batch.commit();
      }
      
      return { success: true, updatedCount };

    } catch (e: any) {
      console.error(`Flow Error: Failed to update resumes for user ${userId}.`, e);
      // Re-throw a more descriptive error for the client.
      throw new Error(`Failed to update applications with new resume: ${e.message}`);
    }
  }
);
