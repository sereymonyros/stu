
'use server';
/**
 * @fileOverview A flow to find matching jobs for users' saved searches and send email alerts.
 * This flow is designed to be triggered by a scheduled cron job.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { initializeFirebaseAdmin } from '@/firebase/server-init';
import { sendEmail } from './send-email-flow';
import { jobAlertTemplate } from '@/components/emails/job-alert-template';

// No input schema needed as this flow is triggered by a cron job with no parameters.
const FindJobMatchesOutputSchema = z.object({
  processedUsers: z.number(),
  matchedJobs: z.number(),
  emailsSent: z.number(),
});
export type FindJobMatchesOutput = z.infer<typeof FindJobMatchesOutputSchema>;


export async function findJobMatches(): Promise<FindJobMatchesOutput> {
  return findJobMatchesFlow();
}

const findJobMatchesFlow = ai.defineFlow(
  {
    name: 'findJobMatchesFlow',
    inputSchema: z.void(),
    outputSchema: FindJobMatchesOutputSchema,
  },
  async () => {
    console.log("Starting job match analysis...");
    const { firestore } = initializeFirebaseAdmin();
    let emailsSent = 0;
    let totalMatches = 0;
    
    // --- 1. Fetch recently posted jobs ---
    // Look for jobs created in the last 24 hours. The cron job should run daily.
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentJobsSnapshot = await firestore.collection('jobs')
      .where('createdAt', '>=', oneDayAgo)
      .where('status', '==', 'Available')
      .get();
    
    const recentJobs = recentJobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (recentJobs.length === 0) {
        console.log("No new jobs posted in the last 24 hours. Exiting.");
        return { processedUsers: 0, matchedJobs: 0, emailsSent: 0 };
    }
    console.log(`Found ${recentJobs.length} new jobs to process.`);

    // --- 2. Fetch all users ---
    // In a larger app, you'd paginate this, but for now, we fetch all.
    const usersSnapshot = await firestore.collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // --- 3. Iterate through each user to check their saved searches ---
    for (const user of users) {
      const savedSearchesSnapshot = await firestore.collection('users').doc(user.id).collection('savedSearches').get();
      
      if (savedSearchesSnapshot.empty) {
        continue; // Skip user if they have no saved searches
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
            // Avoid adding duplicate jobs if a user has multiple matching searches
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
            to: user.email,
            subject: `New Job Alert: ${userMatchedJobs.length} new opportunity matches!`,
            htmlBody: jobAlertTemplate({
              userName: user.displayName || 'Job Seeker',
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
    
    console.log(`Finished job match analysis. Processed ${users.length} users, found ${totalMatches} total matches, and sent ${emailsSent} emails.`);
    return {
      processedUsers: users.length,
      matchedJobs: totalMatches,
      emailsSent,
    };
  }
);
