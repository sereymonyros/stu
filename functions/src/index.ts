import { auth } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';

// Initialize the Firebase Admin SDK.
admin.initializeApp();

// Configure the email transporter (this part remains largely the same)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.NEXT_PUBLIC_GMAIL_EMAIL,
        pass: process.env.NEXT_PUBLIC_GMAIL_APP_PASSWORD
    }
});

/**
 * Sends a welcome email to a new user using Firebase Functions v2 API.
 * The trigger is now defined using `auth.user.onCreate`.
 */
// CORRECTED: The trigger is now defined via the imported 'auth' object
export const sendWelcomeEmail = auth.user.onCreate(async (event:any) => {
    // In v2, the user record is within event.data
    const user = event.data; 

    // Safety check for user and email
    if (!user || !user.email) {
        console.error('No user data or email found for new user event.');
        return; // Use return to stop execution
    }

    const { email, displayName } = user;
    const senderEmail = process.env.NEXT_PUBLIC_GMAIL_EMAIL;

    const mailOptions = {
        from: `"Cambodia Hub" <${senderEmail}>`,
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

    try {
        await transporter.sendMail(mailOptions);
        console.log('Welcome email sent to:', email);
    } catch (error) {
        console.error('Error sending welcome email:', error);
        // Throwing the error is optional, but it's good practice.
        throw new Error('Email sending failed.');
    }
});