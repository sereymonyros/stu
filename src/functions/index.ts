
'use server';
/**
 * @fileOverview This file contains the Cloud Function for Firebase that will be triggered
 * by Cloud Scheduler to run the daily job alert process.
 */
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { findJobMatches } from './../ai/flows/find-job-matches-flow';
import { initializeFirebaseAdmin } from './../firebase/server-init';

// Initialize the Firebase Admin SDK.
// This is necessary for the function to have the correct permissions.
initializeFirebaseAdmin();

// This is a Pub/Sub-triggered Cloud Function that will be deployed to Firebase.
// It is configured to run on a schedule.
export const dailyJobAlerts = onSchedule('every 24 hours', async (event) => {
  console.log("Scheduled job alert function triggered:", event);
  
  try {
    // We call our existing AI flow to do all the work.
    const result = await findJobMatches({});
    console.log(
      `Job alert process finished successfully. Processed ${result.processedUsers} users, found ${result.matchedJobs} matches, and sent ${result.emailsSent} emails.`
    );
  } catch (error) {
    console.error("An error occurred during the scheduled job alert execution:", error);
    // Throwing the error ensures it's logged as a failure in Cloud Functions monitoring.
    throw error;
  }
});
