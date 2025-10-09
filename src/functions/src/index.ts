
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

// --- Environment Variable Definitions ---
// Define secrets using the modern 'params' module.
const GMAIL_EMAIL = defineString('GMAIL_EMAIL');
const GMAIL_APP_PASSWORD = defineString('GMAIL_APP_PASSWORD');

// Initialize the Firebase Admin SDK.
// NOTE: Admin initialization is safe in the global scope.
admin.initializeApp();
const db = admin.firestore();


// --- Transporter Configuration (Moved into function body) ---
// To prevent issues with environment variables not being ready during cold starts,
// the nodemailer transporter is now initialized inside the functions that use it.

/**
 * Sends an email to a user confirming their job application and notifies the recruiter.
 * This function uses the V2 Cloud Functions SDK (onDocumentCreated).
 */
export const sendApplicationConfirmationEmail = onDocumentCreated(
    {
        document: 'jobs/{jobId}/applications/{applicationId}',
        secrets: [GMAIL_EMAIL, GMAIL_APP_PASSWORD], // Link secrets for V2
    },
    async (event) => {
        // --- FIX FOR CONTAINER HEALTH CHECK & DEPLOYMENT ---
        // We now initialize the transporter inside the function body.
        // Accessing .value() here ensures the environment is ready.
        if (!GMAIL_EMAIL.value() || !GMAIL_APP_PASSWORD.value()) {
            console.error('Gmail credentials are not set in environment config. Skipping email.');
            return;
        }
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: GMAIL_EMAIL.value(),
                pass: GMAIL_APP_PASSWORD.value(),
            },
        });
        // --- END FIX ---
        
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

            const applicantData = applicantDoc.data()!;
            const jobData = jobDoc.data()!;
            const { recruiterId, title: jobTitle, companyName } = jobData;

            // --- Fetch Recruiter Data ---
            const recruiterDoc = await db.collection('users').doc(recruiterId).get();
            const recruiterData = recruiterDoc.exists ? recruiterDoc.data() : null;

            // --- 1. Send Confirmation Email to Applicant ---
            const { email: applicantEmail, displayName: applicantName } = applicantData;
            if (applicantEmail) {
                const applicantMailOptions = {
                    from: `"Cambodia Hub" <${GMAIL_EMAIL.value()}>`,
                    to: applicantEmail,
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
                await transporter.sendMail(applicantMailOptions);
                console.log(`Application confirmation email sent to applicant: ${applicantEmail}`);
            } else {
                console.warn(`No email address found for applicant: ${applicantId}. Skipping email.`);
            }

            // --- 2. Send Notification Email to Recruiter ---
            const recruiterEmail = recruiterData?.email;
            if (recruiterEmail) {
                const recruiterMailOptions = {
                    from: `"Cambodia Hub" <${GMAIL_EMAIL.value()}>`,
                    to: recruiterEmail,
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
                await transporter.sendMail(recruiterMailOptions);
                console.log(`New application notification sent to recruiter: ${recruiterEmail}`);
            } else {
                 if (recruiterId) {
                    console.warn(`Recruiter user document or email not found for recruiterId: ${recruiterId}. Skipping notification.`);
                }
            }

        } catch (error) {
            console.error('Failed to process application and send emails:', error);
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
    // A check for data existence (should always pass for onDocumentUpdated, but good practice)
    if (!change) {
        console.log("No data change object found in the event. Exiting.");
        return null;
    }
    
    // Access snapshots from the change object
    const newData = change.after.data();
    const oldData = change.before.data();
    // V2: Path parameters are on event.params
    const { userId } = event.params;

    // Check if the name or photo has actually changed
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
