/**
 * @fileOverview Cloud Functions for Firebase to handle backend tasks.
 *
 * This file contains Cloud Functions for sending application confirmation emails
 * and propagating user profile updates (recruiter info) to job postings.
 */
import * as admin from 'firebase-admin';
import * as sgMail from '@sendgrid/mail'; // CHANGED: Switched from nodemailer to SendGrid
import { defineString } from 'firebase-functions/params';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';

// --- Environment Variable Definitions ---
// Define secrets using the modern 'params' module for SendGrid.
const SENDGRID_API_KEY = defineString('SENDGRID_API_KEY');
const SENDGRID_FROM_EMAIL = defineString('SENDGRID_FROM_EMAIL'); // New secret for the verified sending address

// Initialize the Firebase Admin SDK.
// NOTE: Admin initialization is safe in the global scope.
admin.initializeApp();
const db = admin.firestore();

// Define a basic interface for User data for better type safety
interface UserData {
    displayName?: string;
    photoURL?: string;
    userType?: string;
    email?: string;
}

/**
 * Sends an email to a user confirming their job application and notifies the recruiter using SendGrid.
 * This function uses the V2 Cloud Functions SDK (onDocumentCreated).
 */
export const sendApplicationConfirmationEmail = onDocumentCreated(
    {
        document: 'jobs/{jobId}/applications/{applicationId}',
        // FIX: The secrets array MUST contain PLAIN STRING NAMES of the secrets.
        // It should NOT use the Param objects defined by defineString.
        secrets: ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL'], 
    },
    async (event) => {
        // --- Set SendGrid API Key ---
        // This must be done within the function body to ensure the secret is loaded at runtime.
        if (!SENDGRID_API_KEY.value()) {
            console.error('SendGrid API Key is not set in environment config. Skipping email.');
            return;
        }
        sgMail.setApiKey(SENDGRID_API_KEY.value());
        
        const snapshot = event.data;
        if (!snapshot) {
            console.error("Application data is undefined. Exiting function.");
            return null;
        }
        const applicationData = snapshot.data();
        const { jobId, applicantId } = applicationData;

        try {
            // Fetch all required documents concurrently
            const applicantDocPromise = db.collection('users').doc(applicantId).get();
            const jobDocPromise = db.collection('jobs').doc(jobId).get();
            
            const [applicantDoc, jobDoc] = await Promise.all([applicantDocPromise, jobDocPromise]);

            // --- Validate documents ---
            if (!applicantDoc.exists) {
                console.error(`Applicant user document not found for applicantId: ${applicantId}`);
                return null;
            }
            if (!jobDoc.exists) {
                console.error(`Job document not found for jobId: ${jobId}`);
                return null;
            }

            const applicantData = applicantDoc.data()! as UserData; // Cast for safety
            const jobData = jobDoc.data()!;
            const { recruiterId, title: jobTitle, companyName } = jobData;

            // --- Fetch Recruiter Data ---
            const recruiterDoc = await db.collection('users').doc(recruiterId).get();
            const recruiterData = recruiterDoc.exists ? recruiterDoc.data() as UserData : null; // Cast for safety

            // Get shared email settings
            const fromEmail = SENDGRID_FROM_EMAIL.value();

            // --- 1. Send Confirmation Email to Applicant ---
            const { email: applicantEmail, displayName: applicantName } = applicantData;
            
            if (applicantEmail && fromEmail) {
                const applicantMsg = {
                    to: applicantEmail,
                    from: {
                        email: fromEmail,
                        name: 'Cambodia Hub'
                    },
                    subject: `Your Application for ${jobTitle} has been Received`,
                    html: `
                        <h1>Application Confirmation</h1>
                        <p>Dear ${applicantName || 'Applicant'},</p>
                        <p>This email confirms that we have successfully received your application for the <b>${jobTitle}</b> position at <b>${companyName}</b>.</p>
                        <p>You can view the status of all your applications on your dashboard.</p>
                        <p>We wish you the best of luck in the hiring process!</p>
                        <br>
                        <p>Sincerely,</p>
                        <p><b>The Cambodia Hub Team</b></p>
                    `
                };
                await sgMail.send(applicantMsg);
                console.log(`Application confirmation email sent to applicant: ${applicantEmail}`);
            } else {
                console.warn(`Applicant email (${applicantEmail}) or FROM email (${fromEmail}) not found. Skipping applicant email.`);
            }

            // --- 2. Send Notification Email to Recruiter ---
            const recruiterEmail = recruiterData?.email;
            if (recruiterEmail && fromEmail) {
                const recruiterMsg = {
                    to: recruiterEmail,
                    from: {
                        email: fromEmail,
                        name: 'Cambodia Hub'
                    },
                    subject: `New Application for ${jobTitle}`,
                    html: `
                        <h1>New Job Application</h1>
                        <p>Hello ${recruiterData?.displayName || 'Recruiter'},</p>
                        <p>You have received a new application for the <b>${jobTitle}</b> position.</p>
                        <p><b>Applicant:</b> ${applicantName || 'N/A'}</p>
                        <p><b>Applicant Email:</b> ${applicantEmail || 'N/A'}</p>
                        <p>Please visit your dashboard to review the application.</p>
                        <br>
                        <p>Regards,</p>
                        <p><b>The Cambodia Hub Team</b></p>
                    `
                };
                await sgMail.send(recruiterMsg);
                console.log(`New application notification sent to recruiter: ${recruiterEmail}`);
            } else if (recruiterId) {
                console.warn(`Recruiter email (${recruiterEmail}) or FROM email (${fromEmail}) not found for recruiter ${recruiterId}. Skipping notification.`);
            }

        } catch (error: any) {
            console.error('Failed to process application and send emails via SendGrid:', error);
            if (error.response) {
                console.error('SendGrid API Error Body:', error.response.body);
            }
        }

        return null;
    });


/**
 * Propagates user profile updates to other parts of the database.
 * This function triggers when a user document in `/users/{userId}` is updated.
 * It is now using the V2 Cloud Functions SDK (onDocumentUpdated).
 */
export const updateUserData = onDocumentUpdated('users/{userId}', async (event) => {
    // V2: The change object is now available as event.data.
    const change = event.data;

    // A check for data existence (should always pass for onDocumentUpdated, but necessary for typing)
    if (!change || !change.before.data() || !change.after.data()) {
        console.log("Missing data in change event. Exiting.");
        return null;
    }

    // Access snapshots from the change object and cast to the interface
    // to provide strong type guarantees for the rest of the function.
    const newData = change.after.data() as UserData;
    const oldData = change.before.data() as UserData;
    
    // V2: Path parameters are on event.params
    const { userId } = event.params; 

    // Check if the name or photo has actually changed
    // Use optional chaining or explicit checks as needed
    if (newData.displayName === oldData.displayName && newData.photoURL === oldData.photoURL) {
        console.log(`No change in displayName or photoURL for user ${userId}. Exiting.`);
        return null;
    }

    console.log(`User ${userId} updated. Propagating changes...`);

    // Prepare the data to update
    const dataToUpdate: { recruiterName?: string; recruiterPhotoURL?: string } = {};
    if (newData.displayName !== oldData.displayName) {
        dataToUpdate.recruiterName = newData.displayName;
    }
    if (newData.photoURL !== oldData.photoURL) {
        dataToUpdate.recruiterPhotoURL = newData.photoURL;
    }

    // If user is a recruiter, update their job postings
    if (newData.userType === 'recruiter') {
        const jobsQuery = db.collection('jobs').where('recruiterId', '==', userId);
        const jobsSnapshot = await jobsQuery.get();

        if (jobsSnapshot.empty) {
            console.log(`User ${userId} has no job postings to update.`);
            return null;
        }

        // Use a batch write for efficiency and atomicity
        const batch = db.batch();
        jobsSnapshot.forEach(doc => {
            console.log(`Queueing update for job ${doc.id} with new recruiter info.`);
            batch.update(doc.ref, dataToUpdate);
        });

        try {
            await batch.commit();
            console.log(`Successfully propagated updates for user ${userId} to ${jobsSnapshot.size} job(s).`);
        } catch (error) {
            console.error('Error committing batch update for user ${userId}:', error);
        }
    }

    return null;
});
