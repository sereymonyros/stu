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
 * Sends a welcome email with a verification link to a new user.
 *
 * This function is triggered by the `onCreate` event in Firebase Authentication,
 * which occurs whenever a new user account is created.
 */
export const sendWelcomeEmail = functions.auth.user().onCreate(async (user) => {
    const {email, displayName, uid} = user; 

    if (!email) {
        console.error('No email found for new user:', uid);
        return null;
    }
    
    // Generate email verification link
    const actionCodeSettings = {
        url: `${process.env.NEXT_PUBLIC_BASE_URL}/`, // URL to redirect to after verification
        handleCodeInApp: true,
    };

    let verificationLink;
    try {
        verificationLink = await auth.generateEmailVerificationLink(email, actionCodeSettings);
    } catch (error) {
        console.error('Error generating email verification link:', error);
        return null;
    }


    const mailOptions = {
        from: '"Cambodia Hub" <noreply@yourfirebaseproject.com>',
        to: email,
        subject: 'Welcome to Cambodia Hub! Please Verify Your Email',
        html: `
            <h1>Welcome, ${displayName || 'New Friend'}!</h1>
            <p>Thank you for joining Cambodia Hub. Please click the link below to verify your email address and secure your account.</p>
            <p><a href="${verificationLink}" style="background-color: #4A90E2; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">Verify Your Email</a></p>
            <p>If you did not create an account, you can safely ignore this email.</p>
            <br>
            <p>Happy exploring!</p>
            <p><b>The Cambodia Hub Team</b></p>
        `
    };

    // Send the email.
    return transporter.sendMail(mailOptions)
        .then(() => console.log('Verification email sent to:', email))
        .catch((error) => console.error('Error sending verification email:', error));
});

/**
 * Sends an email to a user confirming their job application.
 *
 * This function is triggered when a new application document is created under
 * any job posting. It fetches details about the applicant and the job
 * to send a personalized confirmation email.
 */
export const sendApplicationConfirmationEmail = functions.firestore
    .document('jobs/{jobId}/applications/{applicationId}')
    .onCreate(async (snapshot, context) => {
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

            const userData = userDoc.data()!;
            const jobData = jobDoc.data()!;

            const { email, displayName } = userData;
            const { title, companyName } = jobData;

            if (!email) {
                console.error(`No email address found for user: ${applicantId}`);
                return null;
            }

            const mailOptions = {
                from: '"Cambodia Hub" <noreply@yourfirebaseproject.com>',
                to: email,
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
            console.log(`Application confirmation email sent to: ${email}`);

        } catch (error) {
            console.error('Failed to send application confirmation email:', error);
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
