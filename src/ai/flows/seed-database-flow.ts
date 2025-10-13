
'use server';
/**
 * @fileOverview A flow to seed the Firestore database with test data.
 * It creates 10 recruiters, 10 standard users, and 10 job postings.
 * It also includes logic to add 10 specific jobs for the user 'sereymonyros@gmail.com'.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { initializeFirebaseAdmin } from '@/firebase/server-init';
import { FieldValue } from 'firebase-admin/firestore';
import type { UserRecord } from 'firebase-admin/auth';


const SeedDatabaseOutputSchema = z.object({
  message: z.string(),
  recruitersCreated: z.number(),
  standardUsersCreated: z.number(),
  jobsCreated: z.number(),
  specialJobsCreated: z.number(),
});
export type SeedDatabaseOutput = z.infer<typeof SeedDatabaseOutputSchema>;

// No input needed for this flow
const SeedDatabaseInputSchema = z.object({});

export async function seedDatabase(): Promise<SeedDatabaseOutput> {
  // Pass an empty object to satisfy the flow's input schema.
  return seedDatabaseFlow({});
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
    let specialJobsCreated = 0;

    const recruiters: UserRecord[] = [];

    try {
      // 1. Create 10 Recruiter Users
      for (let i = 1; i <= 10; i++) {
        const email = `recruiter${i}@example.com`;
        const displayName = `Recruiter ${i}`;
        try {
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

      // 3. Create 10 Job Postings for the new recruiters
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
          createdAt: FieldValue.serverTimestamp(),
        };
        const jobRef = firestore.collection('jobs').doc(jobTitles[i].replace(/\s+/g, '-').toLowerCase());
        const jobDoc = await jobRef.get();
        if (!jobDoc.exists) {
            await jobRef.set(jobData);
            jobsCreated++;
        }
      }

      // 4. Create or get special user and create 10 specific jobs for them
      const specialUserEmail = 'sereymonyros@gmail.com';
      let specialUser: UserRecord;
      try {
        specialUser = await auth.getUserByEmail(specialUserEmail);
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          console.log(`Special user ${specialUserEmail} not found, creating them now...`);
          specialUser = await auth.createUser({
            email: specialUserEmail,
            password: 'password',
            displayName: 'Sereymony Ros',
          });
          await firestore.collection('users').doc(specialUser.uid).set({
            uid: specialUser.uid,
            displayName: 'Sereymony Ros',
            email: specialUserEmail,
            address: '1 Special Ave, Phnom Penh',
            phone: '555-555-5555',
            userType: 'recruiter',
            photoURL: `https://i.pravatar.cc/150?u=${specialUserEmail}`
          });
        } else {
          throw error;
        }
      }

      const specialJobTitles = [
          'Lead Blockchain Developer', 'AI/ML Engineer', 'Senior Cloud Architect', 'Mobile Development Lead (React Native)',
          'Cybersecurity Analyst', 'Head of Digital Marketing', 'E-commerce Manager', 'Chief Technology Officer (CTO)',
          'Principal UI/UX Designer', 'Director of Engineering'
      ];
      const specialCompanies = [
          'CryptoCambodia', 'AI Solutions Khmer', 'Mekong Cloud Services', 'Angkor App Development', 'CyberGuardians',
          'Digital Pagoda', 'KhmerCart', 'Startup Hub PP', 'Banyan UX', 'FutureTech Cambodia'
      ];

      for (let i = 0; i < 10; i++) {
          const jobTitleWithSuffix = `${specialJobTitles[i]} #${Math.floor(Math.random() * 1000)}`;
          const jobData = {
              title: jobTitleWithSuffix,
              companyName: specialCompanies[i],
              location: locations[i % locations.length],
              jobType: jobTypes[i % jobTypes.length],
              status: 'Available',
              description: `An exciting new role for a ${specialJobTitles[i]} at ${specialCompanies[i]}.`,
              salaryMin: 90000 + (i * 10000),
              salaryMax: 120000 + (i * 10000),
              recruiterId: specialUser.uid,
              recruiterDisplayName: specialUser.displayName,
              createdAt: FieldValue.serverTimestamp(),
          };
          // Using addDoc for guaranteed unique IDs for special jobs.
          await firestore.collection('jobs').add(jobData);
          specialJobsCreated++;
      }


      const message = `Database seeding complete. Already existing data was skipped.`;
      return { message, recruitersCreated, standardUsersCreated, jobsCreated, specialJobsCreated };

    } catch (error: any) {
      console.error('Error seeding database:', error);
      throw new Error(`Failed to seed database: ${error.message}`);
    }
  }
);
