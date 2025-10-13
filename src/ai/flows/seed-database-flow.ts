
'use server';
/**
 * @fileOverview A flow to seed the Firestore database with test data.
 * It creates 10 recruiters, 10 standard users, and 10 job postings.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { initializeFirebaseAdmin } from '@/firebase/server-init';
import { serverTimestamp } from 'firebase/firestore';

const SeedDatabaseOutputSchema = z.object({
  message: z.string(),
  recruitersCreated: z.number(),
  standardUsersCreated: z.number(),
  jobsCreated: z.number(),
});
export type SeedDatabaseOutput = z.infer<typeof SeedDatabaseOutputSchema>;

// No input needed for this flow
const SeedDatabaseInputSchema = z.object({});

export async function seedDatabase(): Promise<SeedDatabaseOutput> {
  return seedDatabaseFlow();
}

const seedDatabaseFlow = ai.defineFlow(
  {
    name: 'seedDatabaseFlow',
    inputSchema: SeedDatabaseInputSchema,
    outputSchema: SeedDatabaseOutputSchema,
  },
  async () => {
    const { auth, firestore } = initializeFirebaseAdmin();
    let recruitersCreated = 0;
    let standardUsersCreated = 0;
    let jobsCreated = 0;

    const recruiters = [];

    try {
      // 1. Create 10 Recruiter Users
      for (let i = 1; i <= 10; i++) {
        const email = `recruiter${i}@example.com`;
        const displayName = `Recruiter ${i}`;
        try {
            // Check if user exists before creating
            await auth.getUserByEmail(email);
            const user = await auth.getUserByEmail(email);
            recruiters.push(user);
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                const userRecord = await auth.createUser({
                    email,
                    password: 'password',
                    displayName,
                });
                await firestore.collection('users').doc(userRecord.uid).set({
                    uid: userRecord.uid,
                    displayName,
                    email,
                    address: `${i} Recruiter Lane`,
                    phone: '555-010' + i,
                    userType: 'recruiter',
                    photoURL: `https://i.pravatar.cc/150?u=${email}`
                });
                recruiters.push(userRecord);
                recruitersCreated++;
            } else {
                throw error; // Re-throw other errors
            }
        }
      }

      // 2. Create 10 Standard Users
      for (let i = 1; i <= 10; i++) {
        const email = `standarduser${i}@example.com`;
        const displayName = `Standard User ${i}`;
         try {
            await auth.getUserByEmail(email);
        } catch (error: any) {
             if (error.code === 'auth/user-not-found') {
                const userRecord = await auth.createUser({
                    email,
                    password: 'password',
                    displayName,
                });
                await firestore.collection('users').doc(userRecord.uid).set({
                    uid: userRecord.uid,
                    displayName,
                    email,
                    address: `${i} Standard Street`,
                    phone: '555-020' + i,
                    userType: 'standard',
                    photoURL: `https://i.pravatar.cc/150?u=${email}`
                });
                standardUsersCreated++;
             } else {
                 throw error;
             }
        }
      }

      // 3. Create 10 Job Postings
      const jobTitles = ['Software Engineer', 'UX Designer', 'Product Manager', 'Data Scientist', 'Marketing Lead', 'DevOps Engineer', 'QA Tester', 'Frontend Developer', 'Backend Developer', 'Project Manager'];
      const companies = ['TechCorp', 'Innovate LLC', 'Data Solutions', 'Creative Minds', 'MarketBoost', 'CloudNine', 'BugFree Inc.', 'UI Masters', 'API World', 'TaskMasters'];
      const locations = ['Phnom Penh', 'Siem Reap', 'Battambang', 'Sihanoukville'];
      const jobTypes = ['Full-time', 'Part-time', 'Contract'];
      
      for (let i = 0; i < 10; i++) {
        const recruiter = recruiters[i];
        const jobData = {
          title: jobTitles[i],
          companyName: companies[i],
          location: locations[i % locations.length],
          jobType: jobTypes[i % jobTypes.length],
          status: 'Available',
          description: `This is a great opportunity for a ${jobTitles[i]} at ${companies[i]}.`,
          salaryMin: 50000 + (i * 5000),
          salaryMax: 70000 + (i * 5000),
          recruiterId: recruiter.uid,
          recruiterDisplayName: recruiter.displayName,
          createdAt: serverTimestamp(),
        };
        // Use a unique ID based on the title to prevent duplicates on re-runs
        const jobRef = firestore.collection('jobs').doc(jobTitles[i].replace(/\s+/g, '-').toLowerCase());
        const jobDoc = await jobRef.get();
        if (!jobDoc.exists) {
            await jobRef.set(jobData);
            jobsCreated++;
        }
      }

      const message = `Database seeding complete. Already existing data was skipped.`;
      return { message, recruitersCreated, standardUsersCreated, jobsCreated };

    } catch (error: any) {
      console.error('Error seeding database:', error);
      throw new Error(`Failed to seed database: ${error.message}`);
    }
  }
);
