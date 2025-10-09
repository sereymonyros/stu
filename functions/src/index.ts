/**
 * @fileOverview Cloud Functions for Firebase to handle backend tasks.
 *
 * This file contains Cloud Functions for sending application confirmation emails
 * and propagating user profile updates (recruiter info) to job postings.
 */
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import { defineString } from 'firebase-functions/params';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';

// Initialize the Firebase Admin SDK.
// This is the ONLY global synchronous call remaining, which is required.
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
 * Sends an email to a user confirming their job application.
 * This function now contains all its dependencies (defineString and nodemailer setup)
 * to prevent global scope crashes.
 */
export const sendApplicationConfirmationEmailV0 = onDocumentCreated( 
    {
        document: 'jobs/{jobId}/applications/{applicationId}',
        // CRUCIAL ADDITION: Explicitly link the secrets for V2 deployment
        secrets: ['GMAIL_EMAIL', 'GMAIL_APP_PASSWORD'],
    },
    async (event) => {
        
        // --- ISOLATED DEPENDENCIES ---
        // These are defined here to guarantee they are isolated from other function's global scope
        const GMAIL_EMAIL = defineString('GMAIL_EMAIL');
        const GMAIL_APP_PASSWORD = defineString('GMAIL_APP_PASSWORD');

        const email = GMAIL_EMAIL.value();
        const appPassword = GMAIL_APP_PASSWORD.value();

        if (!email || !appPassword) {
            console.error('Nodemailer configuration failed: GMAIL_EMAIL or GMAIL_APP_PASSWORD secret is missing or empty.');
            return null;
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: email,
                pass: appPassword
            }
        });
        // --- END ISOLATED DEPENDENCIES ---

        const snapshot = event.data;

        if (!snapshot) {
            console.error("No data found in event.");
            return;
        }

        const applicationData = snapshot.data();
        const { jobId, applicantId } = applicationData;

        // Fetch user and job details concurrently
        const userPromise = db.collection('users').doc(applicantId).get();
        const jobPromise = db.collection('jobs').doc(jobId).get();

        try {
            const [userDoc, jobDoc] = await Promise.all([userPromise, jobPromise]);

            if (!userDoc.exists) {
                console.error(`User document not found for applicantId: ${applicantId}`);
                return null;
            }
            if (!jobDoc.exists) {
                console.error(`Job document not found for jobId: ${jobId}`);
                return null;
            }

            // Use the UserData interface here for type clarity
            const userData = userDoc.data()! as UserData;
            const jobData = jobDoc.data()!;

            const { email: recipientEmail, displayName } = userData;
            const { title, companyName } = jobData;

            if (!recipientEmail) {
                console.error(`No email address found for user: ${applicantId}`);
                return null;
            }

            const mailOptions = {
                from: '"Cambodia Hub" <noreply@yourfirebaseproject.com>',
                to: recipientEmail,
                subject: `Your Application for ${title} has been Received`,
                html: `
                    <h1>Application Confirmation</h1>
                    <p>Dear ${displayName || 'Applicant'},</p>
                    <p>This email confirms that we have successfully received your application for the <b>${title}</b> position at <b>${companyName}</b>.</p>
                    <p>You can view the status of all your applications on your dashboard.</p>
                    <p>We wish you the best of luck in the hiring process!</p>
                    <br>
                    <p>Sincerely,</p>
                    <p><b>The Cambodia Hub Team</b></p>
                `
            };
            
            await transporter.sendMail(mailOptions);
            console.log(`Application confirmation email sent to: ${recipientEmail}`);

        } catch (error) {
            console.error('Failed to send application confirmation email:', error);
        }

        return null;
    });

/**
 * Propagates user profile updates to other parts of the database.
 * This function triggers when a user document in `/users/{userId}` is updated.
 * It is now using the V2 Cloud Functions SDK (onDocumentUpdated).
 */
export const updateUserDataV0 = onDocumentUpdated('users/{userId}', async (event) => {
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
            console.error(`Error committing batch update for user ${userId}:`, error);
        }
    }

    return null;
});
