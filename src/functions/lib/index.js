"use strict";
'use server';
Object.defineProperty(exports, "__esModule", { value: true });
exports.dailyjobalerts = void 0;
/**
 * @fileOverview This file contains the Cloud Function for Firebase that will be triggered
 * by Cloud Scheduler to run the daily job alert process.
 */
const scheduler_1 = require("firebase-functions/v2/scheduler");
const find_job_matches_flow_1 = require("@/ai/flows/find-job-matches-flow");
const server_init_1 = require("@/firebase/server-init");
// Initialize the Firebase Admin SDK.
// This is necessary for the function to have the correct permissions.
(0, server_init_1.initializeFirebaseAdmin)();
// This is a Pub/Sub-triggered Cloud Function that will be deployed to Firebase.
// It is configured to run on a schedule.
exports.dailyjobalerts = (0, scheduler_1.onSchedule)('every 24 hours', async (event) => {
    console.log("Scheduled job alert function triggered:", event);
    try {
        // We call our existing AI flow to do all the work.
        const result = await (0, find_job_matches_flow_1.findJobMatches)({});
        console.log(`Job alert process finished successfully. Processed ${result.processedUsers} users, found ${result.matchedJobs} matches, and sent ${result.emailsSent} emails.`);
    }
    catch (error) {
        console.error("An error occurred during the scheduled job alert execution:", error);
        // Throwing the error ensures it's logged as a failure in Cloud Functions monitoring.
        throw error;
    }
});
//# sourceMappingURL=index.js.map