/**
 * @fileOverview Cloud Functions for Firebase to handle backend tasks.
 *
 * This file contains the Cloud Function that sends a welcome email to new users.
 * To deploy this function, you will need the Firebase CLI.
 *
 * Pre-deployment steps:
 * 1. Set up your email service credentials as environment variables in your Firebase project:
 *    - GMAIL_EMAIL: The email address you're sending from (e.g., your.email@gmail.com).
 *    - GMAIL_APP_PASSWORD: The app-specific password for your email account.
 *
 *    You can set these by running the following commands in your terminal:
 *    firebase functions:config:set gmail.email="your.email@gmail.com"
 *    firebase functions:config:set gmail.app_password="your-16-digit-app-password"
 *
 * 2. Deploy the function using the Firebase CLI:
 *    firebase deploy --only functions
 */
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';

// Initialize the Firebase Admin SDK.
admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();

// Configure the email transporter using nodemailer.
// The credentials for the email service are fetched from Firebase environment configuration.
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: functions.config().gmail.email,
        pass: functions.config().gmail.app_password
    }
});

/**
 * Sends an email to a user confirming their job application and notifies the recruiter.
 *
 * This function is triggered when a new application document is created. It sends
 * a confirmation to the applicant and a notification to the recruiter.
 */
export const sendApplicationConfirmationEmail = functions.firestore
    .document('jobs/{jobId}/applications/{applicationId}')
    .onCreate(async (snapshot, context) => {
        const applicationData = snapshot.data();
        if (!applicationData) {
            console.error("Application data is undefined. Exiting function.");
            return null;
        }
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
            if (!recruiterDoc.exists) {
                console.error(`Recruiter user document not found for recruiterId: ${recruiterId}`);
                // We can still proceed to email the applicant even if the recruiter can't be notified.
            }
            const recruiterData = recruiterDoc.data();

            // --- 1. Send Confirmation Email to Applicant ---
            const { email: applicantEmail, displayName: applicantName } = applicantData;
            if (applicantEmail) {
                const applicantMailOptions = {
                    from: `"Cambodia Hub" <${functions.config().gmail.email}>`,
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
                    from: `"Cambodia Hub" <${functions.config().gmail.email}>`,
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
                console.warn(`No email address found for recruiter: ${recruiterId}. Skipping notification.`);
            }

        } catch (error) {
            console.error('Failed to process application and send emails:', error);
        }

        return null;
    });


/**
 * Propagates user profile updates to other parts of the database.
 * 
 * This function triggers when a user document in `/users/{userId}` is updated.
 * It checks if the `displayName` or `photoURL` has changed and, if so,
 * updates the corresponding `recruiterName` and `recruiterPhotoURL` in all
 * job postings made by that user.
 */
export const updateUserData = functions.firestore
    .document('users/{userId}')
    .onUpdate(async (change, context) => {
        const newData = change.after.data();
        const oldData = change.before.data();
        const { userId } = context.params;

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

            // Use a batch write for efficiency
            const batch = db.batch();
            jobsSnapshot.forEach(doc => {
                console.log(`Updating job ${doc.id} with new recruiter info.`);
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
