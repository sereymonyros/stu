
'use server';
/**
 * @fileOverview A flow to seed the Firestore database with test data.
 * It creates specific test users and job postings associated with them.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { initializeFirebaseAdmin } from '@/firebase/server-init';
import { FieldValue } from 'firebase-admin/firestore';
import type { UserRecord } from 'firebase-admin/auth';


const SeedDatabaseOutputSchema = z.object({
  message: z.string(),
  usersCreated: z.number(),
  jobsCreatedForUser1: z.number(),
  jobsCreatedForUser2: z.number(),
  totalJobsCreated: z.number(),
});
export type SeedDatabaseOutput = z.infer<typeof SeedDatabaseOutputSchema>;

// No input needed for this flow
const SeedDatabaseInputSchema = z.object({});

export async function seedDatabase(): Promise<SeedDatabaseOutput> {
  // Pass an empty object to satisfy the flow's input schema.
  return seedDatabaseFlow({});
}

// Helper function to create or get a user
async function createOrGetUser(auth: any, firestore: any, email: string, displayName: string, userType: 'recruiter' | 'standard' = 'recruiter'): Promise<{user: UserRecord, created: boolean}> {
    try {
        const user = await auth.getUserByEmail(email);
        return { user, created: false };
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
                address: `123 ${displayName.split(' ')[0]} Street`,
                phone: '555-555-5555',
                userType: userType,
                photoURL: `https://i.pravatar.cc/150?u=${email}`
            });
            return { user: userRecord, created: true };
        }
        throw error;
    }
}


const seedDatabaseFlow = ai.defineFlow(
  {
    name: 'seedDatabaseFlow',
    inputSchema: SeedDatabaseInputSchema,
    outputSchema: SeedDatabaseOutputSchema,
  },
  async () => {
    const { auth, firestore } = initializeFirebaseAdmin();
    let usersCreated = 0;
    let jobsCreatedForUser1 = 0;
    let jobsCreatedForUser2 = 0;

    const locations = ['Phnom Penh', 'Siem Reap', 'Battambang', 'Sihanoukville'];
    const jobTypes = ['Full-time', 'Part-time', 'Contract'];

    try {
      // --- User 1: 6b43Hazb5dWAygJrWly999YbnvM2 ---
      const user1Email = 'sereymonyros@gmail.com';
      const user1Result = await createOrGetUser(auth, firestore, user1Email, 'Sereymony Ros');
      const user1 = user1Result.user;
      if (user1Result.created) usersCreated++;

      const user1Jobs = [
        { title: 'Lead Blockchain Developer', company: 'CryptoCambodia' },
        { title: 'AI/ML Engineer', company: 'AI Solutions Khmer' },
        { title: 'Senior Cloud Architect', company: 'Mekong Cloud Services' },
        { title: 'Mobile Development Lead (React Native)', company: 'Angkor App Development' },
        { title: 'Cybersecurity Analyst', company: 'CyberGuardians' },
        { title: 'Head of Digital Marketing', company: 'Digital Pagoda' },
        { title: 'E-commerce Manager', company: 'KhmerCart' },
        { title: 'Chief Technology Officer (CTO)', company: 'Startup Hub PP' },
        { title: 'Principal UI/UX Designer', company: 'Banyan UX' },
        { title: 'Director of Engineering', company: 'FutureTech Cambodia' },
      ];

      for (const job of user1Jobs) {
        const jobData = {
          title: job.title,
          companyName: job.company,
          location: locations[jobsCreatedForUser1 % locations.length],
          jobType: jobTypes[jobsCreatedForUser1 % jobTypes.length],
          status: 'Available',
          description: `An exciting new role for a ${job.title} at ${job.company}.`,
          salaryMin: 90000 + (jobsCreatedForUser1 * 10000),
          salaryMax: 120000 + (jobsCreatedForUser1 * 10000),
          recruiterId: user1.uid,
          recruiterDisplayName: user1.displayName,
          createdAt: FieldValue.serverTimestamp(),
        };
        await firestore.collection('jobs').add(jobData);
        jobsCreatedForUser1++;
      }
      
      // --- User 2: zsxcTqelyFashlfKMrXKAYvAJ783 ---
      const user2Email = 'testrecruiter@example.com';
      const user2Result = await createOrGetUser(auth, firestore, user2Email, 'Test Recruiter');
      const user2 = user2Result.user;
       if (user2Result.created) usersCreated++;

      const user2Jobs = [
        { title: 'Junior Frontend Developer', company: 'WebWeavers' },
        { title: 'Graphic Designer', company: 'Creative Circle' },
        { title: 'Customer Support Specialist', company: 'Helpful Hands' },
        { title: 'IT Helpdesk Technician', company: 'TechFixers' },
        { title: 'Social Media Manager', company: 'BuzzBuilders' },
      ];

       for (const job of user2Jobs) {
        const jobData = {
          title: job.title,
          companyName: job.company,
          location: locations[jobsCreatedForUser2 % locations.length],
          jobType: jobTypes[jobsCreatedForUser2 % jobTypes.length],
          status: 'Available',
          description: `A great entry-level opportunity for a ${job.title} at ${job.company}.`,
          salaryMin: 40000 + (jobsCreatedForUser2 * 2000),
          salaryMax: 55000 + (jobsCreatedForUser2 * 2000),
          recruiterId: user2.uid,
          recruiterDisplayName: user2.displayName,
          createdAt: FieldValue.serverTimestamp(),
        };
        await firestore.collection('jobs').add(jobData);
        jobsCreatedForUser2++;
      }
      
      // --- Create one standard user for testing applications ---
      const standardUserResult = await createOrGetUser(auth, firestore, 'standarduser@example.com', 'Standard User', 'standard');
      if (standardUserResult.created) usersCreated++;


      const totalJobsCreated = jobsCreatedForUser1 + jobsCreatedForUser2;
      const message = `Database seeding complete. ${totalJobsCreated} jobs and ${usersCreated} users were newly created.`;
      
      return { 
          message, 
          usersCreated,
          jobsCreatedForUser1, 
          jobsCreatedForUser2, 
          totalJobsCreated 
      };

    } catch (error: any) {
      console.error('Error seeding database:', error);
      throw new Error(`Failed to seed database: ${error.message}`);
    }
  }
);
