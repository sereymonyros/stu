
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

      // Find all of a user's application references where the status is still active
      const userApplicationsQuery = firestore
        .collection('users').doc(userId).collection('applications')
        .where('status', 'in', ['submitted', 'reviewed']);
      
      const userApplicationsSnapshot = await userApplicationsQuery.get();

      if (userApplicationsSnapshot.empty) {
        return { success: true, updatedCount: 0 };
      }

      const batch = firestore.batch();
      let updatedCount = 0;

      // For each application reference, update the corresponding document in the 'jobs' collection
      for (const userAppDoc of userApplicationsSnapshot.docs) {
        // The document ID of the user's application reference is the jobId.
        const jobId = userAppDoc.id;
        
        if (jobId) {
          // The application document under the job is stored with the applicant's UID as the ID.
          const mainApplicationRef = firestore.collection('jobs').doc(jobId).collection('applications').doc(userId);
          batch.update(mainApplicationRef, { resumeUrl: newResumeUrl });
          updatedCount++;
        }
      }

      if (updatedCount > 0) {
        await batch.commit();
      }
      
      return { success: true, updatedCount };

    } catch (e: any) {
      console.error(`Flow Error: Failed to update resumes for user ${userId}.`, e);
      throw new Error(`Failed to update applications with new resume: ${e.message}`);
    }
  }
);
