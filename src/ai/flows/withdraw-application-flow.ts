
'use server';
/**
 * @fileOverview A secure, server-side flow to withdraw a job application.
 * This flow now sends an email notification to the recruiter.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { initializeFirebaseAdmin } from '@/firebase/server-init';
import { sendEmail } from './send-email-flow';
import { withdrawalNotificationTemplate } from '@/components/emails/withdrawal-notification-template';

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
    const { firestore, auth } = initializeFirebaseAdmin();

    try {
      // --- 1. Define document references ---
      debugger;
      const jobRef = firestore.collection('jobs').doc(jobId);
      const mainApplicationRef = jobRef.collection('applications').doc(userId);
      const userApplicationRef = firestore.collection('users').doc(userId).collection('applications').doc(jobId);

      // --- 2. Fetch all data needed for notification and deletion ---
      const jobDoc = await jobRef.get();
      const applicantUserRecord = await auth.getUser(userId);

      if (!jobDoc.exists) {
        throw new Error("Job not found.");
      }

      const jobData = jobDoc.data()!;
      const recruiterId = jobData.recruiterId;
      const applicantName = applicantUserRecord.displayName || 'An applicant';
      
      const recruiterUser = await auth.getUser(recruiterId);
      if (!recruiterUser.email) {
          // If we can't notify the recruiter, fail the whole operation.
          throw new Error(`Recruiter for job ${jobId} does not have a contact email.`);
      }

      // --- 3. Send email notification to the recruiter FIRST ---
      const emailBody = withdrawalNotificationTemplate({
        recruiterName: recruiterUser.displayName || 'Recruiter',
        applicantName: applicantName,
        jobTitle: jobData.title,
      });

      await sendEmail({
        to: recruiterUser.email,
        subject: `Application Withdrawn for ${jobData.title}`,
        htmlBody: emailBody,
      });

      // --- 4. If email is successful, proceed with deletion ---
      const batch = firestore.batch();
      batch.delete(mainApplicationRef);
      batch.delete(userApplicationRef);
      await batch.commit();

      return { success: true, message: "Application successfully withdrawn." };

    } catch (e: any) {
      console.error(`Flow Error: Failed to withdraw application for user ${userId} from job ${jobId}. Reason: ${e.message}`);
      // Re-throw a more user-friendly error to be displayed on the client.
      throw new Error(`Server-side failure to withdraw application: ${e.message}`);
    }
  }
);
