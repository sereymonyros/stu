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
    const { email, displayName } = user;

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
