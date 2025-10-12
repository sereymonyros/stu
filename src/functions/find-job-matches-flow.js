'use strict';
/**
 * @fileOverview A flow to find matching jobs for users' saved searches and send email alerts.
 */
const { initializeFirebaseAdmin } = require('./server-init');
const { sendEmail } = require('./send-email-flow');
const { jobAlertTemplate } = require('./job-alert-template');

async function findJobMatches({ userId, searchId }) {
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
    
    // Filter for 'Available' status in code to avoid needing a composite index
    const recentJobs = recentJobsSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(job => job.status === 'Available');

    if (recentJobs.length === 0) {
        console.log("No new 'Available' jobs posted in the last 24 hours. Exiting.");
        return { processedUsers: 0, matchedJobs: 0, emailsSent: 0 };
    }
    console.log(`Found ${recentJobs.length} new jobs to process.`);

    // --- 2. Fetch users to process ---
    let usersToProcess = [];
    if (userId) {
        const userDoc = await firestore.collection('users').doc(userId).get();
        if (userDoc.exists) {
            usersToProcess.push(userDoc);
        }
    } else {
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
          const singleSearchDoc = await firestore.collection('users').doc(user.id).collection('savedSearches').doc(searchId).get();
          savedSearchesSnapshot = singleSearchDoc.exists ? { docs: [singleSearchDoc], empty: false } : { docs: [], empty: true };
      } else {
          savedSearchesSnapshot = await firestore.collection('users').doc(user.id).collection('savedSearches').get();
      }
      
      if (savedSearchesSnapshot.empty) {
        continue;
      }

      const savedSearches = savedSearchesSnapshot.docs.map(doc => doc.data());
      let userMatchedJobs = [];

      // --- 4. For each new job, see if it matches any of the user's saved searches ---
      for (const job of recentJobs) {
        for (const search of savedSearches) {
          let isMatch = true;

          if (search.searchQuery) {
            const query = search.searchQuery.toLowerCase();
            const title = (job.title || '').toLowerCase();
            const description = (job.description || '').toLowerCase();
            if (!title.includes(query) && !description.includes(query)) {
              isMatch = false;
            }
          }

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
    
    console.log(`Finished job match analysis. Processed ${usersToProcess.length} users, found ${totalMatches} total matches, and sent ${emailsSent} emails.`);
    return {
      processedUsers: usersToProcess.length,
      matchedJobs: totalMatches,
      emailsSent,
    };
}

module.exports = { findJobMatches };
