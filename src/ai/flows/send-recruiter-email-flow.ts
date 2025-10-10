'use server';
/**
 * @fileOverview A dedicated flow for sending a notification email to a recruiter.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { initializeFirebaseAdmin } from '@/firebase/server-init';
import { sendEmail } from './send-email-flow';

const SendRecruiterEmailInputSchema = z.object({
  recruiterId: z.string().describe('The UID of the recruiter.'),
  jobTitle: z.string().describe('The title of the job applied for.'),
  applicantName: z.string().describe("The name of the applicant."),
  applicantEmail: z.string().email().describe("The applicant's email for the reply-to field."),
});
export type SendRecruiterEmailInput = z.infer<typeof SendRecruiterEmailInputSchema>;

export async function sendRecruiterEmail(input: SendRecruiterEmailInput): Promise<void> {
  return sendRecruiterEmailFlow(input);
}

const sendRecruiterEmailFlow = ai.defineFlow(
  {
    name: 'sendRecruiterEmailFlow',
    inputSchema: SendRecruiterEmailInputSchema,
    outputSchema: z.void(),
  },
  async (input) => {
    try {
      // Step 1: Get the admin auth service
      const { auth } = initializeFirebaseAdmin();
      
      // Step 2: Look up the recruiter's user record by their UID
      const recruiterAuthRecord = await auth.getUser(input.recruiterId);
      const recruiterEmail = recruiterAuthRecord.email;
      const recruiterName = recruiterAuthRecord.displayName || 'Recruiter';

      if (!recruiterEmail) {
        console.error(`Recruiter with ID ${input.recruiterId} does not have an email address.`);
        // We do not throw here to avoid failing the entire application process
        // for the user. We just log the error on the server.
        return;
      }

      // Step 3: Construct and send the email using the existing sendEmail flow
      await sendEmail({
        to: recruiterEmail,
        subject: `New Application for ${input.jobTitle}`,
        htmlBody: `
          <h1>New Applicant</h1>
          <p>Hi ${recruiterName},</p>
          <p><strong>${input.applicantName}</strong> has applied for the position of <strong>${input.jobTitle}</strong>.</p>
          <p>You can review their application and resume in your dashboard.</p>
          <p><em>The Cambodia Hub Team</em></p>
        `,
        replyTo: input.applicantEmail,
      });

    } catch (e: any) {
      console.error(`Flow Error: Failed to send recruiter notification for user ${input.recruiterId}.`, e);
      // Re-throw to allow the calling component to handle the UI feedback (e.g., toast).
      throw new Error(`Failed to send recruiter notification: ${e.message}`);
    }
  }
);
