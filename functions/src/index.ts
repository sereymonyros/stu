
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as sgMail from '@sendgrid/mail';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();

/**
 * Sends a confirmation email to the applicant and a notification to the recruiter
 * when a new job application is created.
 */
export const sendApplicationConfirmationEmail = onDocumentCreated(
  {
    document: 'jobs/{jobId}/applications/{applicationId}',
    secrets: ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL'],
  },
  async (event) => {
    // Get the secrets from the environment variables
    const sendGridApiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL;

    if (!sendGridApiKey || !fromEmail) {
      console.error(
        'Missing SendGrid API Key or From Email. Make sure secrets are set correctly.'
      );
      return;
    }
    
    // Set the API key for SendGrid
    sgMail.setApiKey(sendGridApiKey);

    const snapshot = event.data;
    if (!snapshot) {
      return;
    }
    const applicationData = snapshot.data();

    // Get the Job ID and Applicant ID from the document path
    const jobId = event.params.jobId;
    const applicantId = applicationData.applicantId;

    try {
      const db = getFirestore();

      // --- Get Applicant and Recruiter Information ---
      
      // 1. Fetch the applicant's user profile to get their email
      const applicantDoc = await db.collection('users').doc(applicantId).get();
      const applicant = applicantDoc.data();
      if (!applicant || !applicant.email) {
        return;
      }

      // 2. Fetch the job details to get the job title and recruiter ID
      const jobDoc = await db.collection('jobs').doc(jobId).get();
      const job = jobDoc.data();
      if (!job || !job.recruiterId) {
        return;
      }

      // 3. Fetch the recruiter's user profile to get their email
      const recruiterDoc = await db.collection('users').doc(job.recruiterId).get();
      const recruiter = recruiterDoc.data();
      if (!recruiter || !recruiter.email) {
        return;
      }
      
      // --- Send Emails ---

      // Email to the applicant
      const applicantMsg = {
        to: applicant.email,
        from: fromEmail,
        subject: `Your application for "${job.title}" has been received!`,
        text: `Hi ${applicant.displayName},\n\nThank you for applying for the position of "${job.title}" at ${job.companyName}. We have received your application and will be in touch soon.\n\nBest regards,\nThe Cambodia Hub Team`,
        html: `<p>Hi ${applicant.displayName},</p><p>Thank you for applying for the position of "<strong>${job.title}</strong>" at ${job.companyName}. We have received your application and will be in touch soon.</p><p>Best regards,<br>The Cambodia Hub Team</p>`,
      };

      // Email to the recruiter
      const recruiterMsg = {
        to: recruiter.email,
        from: fromEmail,
        subject: `New application for "${job.title}"`,
        text: `Hi ${recruiter.displayName},\n\nA new candidate, ${applicant.displayName}, has applied for the position of "${job.title}".\n\nYou can view their application in your dashboard.\n\nBest regards,\nThe Cambodia Hub Team`,
        html: `<p>Hi ${recruiter.displayName},</p><p>A new candidate, <strong>${applicant.displayName}</strong>, has applied for the position of "<strong>${job.title}</strong>".</p><p>You can view their application in your dashboard.</p><p>Best regards,<br>The Cambodia Hub Team</p>`,
      };

      // Send both emails
      await Promise.all([
          sgMail.send(applicantMsg),
          sgMail.send(recruiterMsg)
      ]);
    } catch (error) {
        console.error("Error sending application confirmation email:", error);
    }
  }
);
