
'use server';
/**
 * @fileOverview A secure, server-side flow to withdraw a job application.
 * This flow now also sends an email notification to the recruiter.
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
      const jobRef = firestore.collection('jobs').doc(jobId);
      const mainApplicationRef = jobRef.collection('applications').doc(userId);
      const userApplicationRef = firestore.collection('users').doc(userId).collection('applications').doc(jobId);

      // --- 2. Fetch all data needed for notification BEFORE any deletions ---
      const jobDoc = await jobRef.get();
      const applicantUserRecord = await auth.getUser(userId);

      if (!jobDoc.exists) {
        throw new Error("Job or applicant profile not found.");
      }

      const jobData = jobDoc.data()!;
      const recruiterId = jobData.recruiterId;
      const applicantName = applicantUserRecord.displayName || 'An applicant';

      // --- 3. Use a batch write to delete both documents atomically ---
      const batch = firestore.batch();
      batch.delete(mainApplicationRef);
      batch.delete(userApplicationRef);
      await batch.commit();

      // --- 4. Send email notification to the recruiter (non-blocking) ---
      // This is now safe because we fetched the data before the delete
      try {
        const recruiterUser = await auth.getUser(recruiterId);
        if (recruiterUser.email) {
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
        }
      } catch (emailError: any) {
        // Log the email error but do not fail the flow. The withdrawal was successful.
        console.error(`Successfully withdrew application, but failed to send notification email to recruiter ${recruiterId}. Reason: ${emailError.message}`);
      }

      return { success: true, message: "Application successfully withdrawn." };

    } catch (e: any) {
      console.error(`Flow Error: Failed to withdraw application for user ${userId} from job ${jobId}.`, e);
      // Re-throw a more user-friendly error to be displayed on the client.
      throw new Error(`Server-side failure to withdraw application: ${e.message}`);
    }
  }
);
