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
 * Sends a welcome email to a new user.
 *
 * This function is triggered by the `onCreate` event in Firebase Authentication,
 * which occurs whenever a new user account is created.
 */
export const sendWelcomeEmail = functions.auth.user().onCreate((user) => {
    const {email, displayName} = user; 

    if (!email) {
        console.error('No email found for new user:', user.uid);
        return null;
    }

    const mailOptions = {
        from: '"Cambodia Hub" <noreply@yourfirebaseproject.com>',
        to: email,
        subject: 'Welcome to Cambodia Hub!',
        html: `
            <h1>Welcome, ${displayName || 'New Friend'}!</h1>
            <p>Thank you for joining Cambodia Hub, your personal AI guide to the Kingdom of Wonder.</p>
            <p>You can now explore listings, find jobs, and connect with others.</p>
            <br>
            <p>Happy exploring!</p>
            <p><b>The Cambodia Hub Team</b></p>
        `
    };

    // Send the email.
    return transporter.sendMail(mailOptions)
        .then(() => console.log('Welcome email sent to:', email))
        .catch((error) => console.error('Error sending welcome email:', error));
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
