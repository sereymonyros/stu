
'use server';
/**
 * @fileOverview A flow to find matching jobs for users' saved searches and send email alerts.
 * This flow can be triggered for all users (by a cron job) or for a single user (manually).
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { initializeFirebaseAdmin } from '@/firebase/server-init';
import { sendEmail } from './send-email-flow';
import { jobAlertTemplate } from '@/components/emails/job-alert-template';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase-admin/firestore';

const FindJobMatchesInputSchema = z.object({
    userId: z.string().optional().describe("If provided, the search will only run for this specific user."),
    searchId: z.string().optional().describe("If provided with a userId, only this specific saved search will be checked."),
});
export type FindJobMatchesInput = z.infer<typeof FindJobMatchesInputSchema>;

const FindJobMatchesOutputSchema = z.object({
  processedUsers: z.number(),
  matchedJobs: z.number(),
  emailsSent: z.number(),
});
export type FindJobMatchesOutput = z.infer<typeof FindJobMatchesOutputSchema>;


export async function findJobMatches(input: FindJobMatchesInput): Promise<FindJobMatchesOutput> {
  return findJobMatchesFlow(input);
}

const findJobMatchesFlow = ai.defineFlow(
  {
    name: 'findJobMatchesFlow',
    inputSchema: FindJobMatchesInputSchema,
    outputSchema: FindJobMatchesOutputSchema,
  },
  async ({ userId, searchId }) => {
    console.log(`Starting job match analysis. Single user mode: ${userId ? 'ON' : 'OFF'}`);
    const { firestore } = initializeFirebaseAdmin();
    let emailsSent = 0;
    let totalMatches = 0;
    
    // --- 1. Fetch recently posted jobs ---
    // Look for jobs created in the last 24 hours. The cron job should run daily.
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentJobsSnapshot = await firestore.collection('jobs')
      .where('createdAt', '>=', oneDayAgo)
      .get();
    
    const recentJobs = recentJobsSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(job => job.status === 'Available');

    if (recentJobs.length === 0) {
        console.log("No new 'Available' jobs posted in the last 24 hours. Exiting.");
        return { processedUsers: 0, matchedJobs: 0, emailsSent: 0 };
    }
    console.log(`Found ${recentJobs.length} new jobs to process.`);

    // --- 2. Fetch users to process ---
    let usersToProcess: QueryDocumentSnapshot<DocumentData>[] = [];
    if (userId) {
        // Single user mode
        const userDoc = await firestore.collection('users').doc(userId).get();
        if (userDoc.exists) {
            usersToProcess.push(userDoc);
        }
    } else {
        // All users mode
        const allUsersSnapshot = await firestore.collection('users').get();
        usersToProcess = allUsersSnapshot.docs;
    }
    
    if (usersToProcess.length === 0) {
        console.log("No users to process. Exiting.");
        return { processedUsers: 0, matchedJobs: 0, emailsSent: 0 };
    }

    // --- 3. Iterate through each user to check their saved searches ---
    for (const userDoc of usersToProcess) {
      const user = { id: userDoc.id, ...userDoc.data() };

      let savedSearchesSnapshot;
      if (searchId && userId) {
          // If a specific searchId is provided for a user, only fetch that one.
          const singleSearchDoc = await firestore.collection('users').doc(user.id).collection('savedSearches').doc(searchId).get();
          savedSearchesSnapshot = singleSearchDoc.exists ? { docs: [singleSearchDoc], empty: false } : { docs: [], empty: true };
      } else {
          // Otherwise, fetch all saved searches for the user.
          savedSearchesSnapshot = await firestore.collection('users').doc(user.id).collection('savedSearches').get();
      }
      
      if (savedSearchesSnapshot.empty) {
        continue;
      }

      const savedSearches = savedSearchesSnapshot.docs.map(doc => doc.data());
      let userMatchedJobs: any[] = [];

      // --- 4. For each new job, see if it matches any of the user's saved searches ---
      for (const job of recentJobs) {
        for (const search of savedSearches) {
          let isMatch = true;

          // Match search query (if exists)
          if (search.searchQuery) {
            const query = search.searchQuery.toLowerCase();
            const title = (job.title || '').toLowerCase();
            const description = (job.description || '').toLowerCase();
            if (!title.includes(query) && !description.includes(query)) {
              isMatch = false;
            }
          }

          // Match filters (if they exist)
          const filters = search.filters || {};
          if (isMatch && filters.companyNames?.length > 0 && !filters.companyNames.includes(job.companyName)) {
            isMatch = false;
          }
          if (isMatch && filters.locations?.length > 0 && !filters.locations.includes(job.location)) {
            isMatch = false;
          }
          if (isMatch && filters.jobTypes?.length > 0 && !filters.jobTypes.includes(job.jobType)) {
            isMatch = false;
          }
           if (isMatch && filters.salaryMin) {
               const jobMax = job.salaryMax ?? Infinity;
               if (jobMax < filters.salaryMin) isMatch = false;
           }
           if (isMatch && filters.salaryMax) {
                const jobMin = job.salaryMin ?? 0;
                if (jobMin > filters.salaryMax) isMatch = false;
           }

          if (isMatch) {
            if (!userMatchedJobs.some(mj => mj.id === job.id)) {
              userMatchedJobs.push(job);
            }
          }
        }
      }

      // --- 5. If there are any matches for the user, send one summary email ---
      if (userMatchedJobs.length > 0 && user.email) {
        totalMatches += userMatchedJobs.length;
        try {
          await sendEmail({
            to: user.email as string,
            subject: `New Job Alert: ${userMatchedJobs.length} new opportunity matches!`,
            htmlBody: jobAlertTemplate({
              userName: (user.displayName as string) || 'Job Seeker',
              matchedJobs: userMatchedJobs,
            }),
          });
          emailsSent++;
          console.log(`Sent job alert email to ${user.email} with ${userMatchedJobs.length} jobs.`);
        } catch (emailError) {
          console.error(`Failed to send job alert email to ${user.email}:`, emailError);
        }
      }
    }
    
    console.log(`Finished job match analysis. Processed ${usersToProcess.length} users, found ${totalMatches} total matches, and sent ${emailsSent} emails.`);
    return {
      processedUsers: usersToProcess.length,
      matchedJobs: totalMatches,
      emailsSent,
    };
  }
);
