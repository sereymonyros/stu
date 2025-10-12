'use strict';
/**
 * @fileOverview This file contains the Cloud Function for Firebase that will be triggered
 * by Cloud Scheduler to run the daily job alert process.
 */
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { findJobMatches } = require('./find-job-matches-flow');
const { initializeFirebaseAdmin } = require('./server-init');

// Initialize the Firebase Admin SDK.
initializeFirebaseAdmin();

// This is a Pub/Sub-triggered Cloud Function that will be deployed to Firebase.
// It is configured to run on a schedule.
exports.dailyjobalerts = onSchedule('every 24 hours', async (event) => {
  console.log("Scheduled job alert function triggered:", event);
  
  try {
    // We call our existing logic to do all the work.
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
