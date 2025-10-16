
'use server';
/**
 * @fileOverview A flow to delete all jobs and their related applications from Firestore.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { initializeFirebaseAdmin } from '@/firebase/server-init';
import type { Query } from 'firebase-admin/firestore';

const UnseedDatabaseOutputSchema = z.object({
  message: z.string(),
  jobsDeleted: z.number(),
  applicationsDeleted: z.number(),
});
export type UnseedDatabaseOutput = z.infer<typeof UnseedDatabaseOutputSchema>;

// No input needed for this flow
const UnseedDatabaseInputSchema = z.object({});

export async function unseedDatabase(): Promise<UnseedDatabaseOutput> {
  // Pass an empty object to satisfy the flow's input schema.
  return unseedDatabaseFlow({});
}

// Helper function to delete a collection in batches
async function deleteCollection(
  db: FirebaseFirestore.Firestore,
  collectionRef: FirebaseFirestore.CollectionReference | Query,
  batchSize: number
): Promise<number> {
  const snapshot = await collectionRef.limit(batchSize).get();

  if (snapshot.size === 0) {
    return 0;
  }

  let deletedCount = 0;
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
    deletedCount++;
  });

  await batch.commit();

  // Recurse on the same collection to delete the next batch.
  return deletedCount + await deleteCollection(db, collectionRef, batchSize);
}


const unseedDatabaseFlow = ai.defineFlow(
  {
    name: 'unseedDatabaseFlow',
    inputSchema: UnseedDatabaseInputSchema,
    outputSchema: UnseedDatabaseOutputSchema,
  },
  async () => {
    const { firestore } = initializeFirebaseAdmin();
    let jobsDeleted = 0;
    let applicationsDeleted = 0;
    const batchSize = 100;

    try {
      const jobsCollectionRef = firestore.collection('jobs');
      const jobsSnapshot = await jobsCollectionRef.get();

      if (jobsSnapshot.empty) {
        return {
          message: 'No jobs found to delete.',
          jobsDeleted: 0,
          applicationsDeleted: 0,
        };
      }

      // Iterate through each job to delete its subcollections first
      for (const jobDoc of jobsSnapshot.docs) {
        const applicationsRef = jobDoc.ref.collection('applications');
        const numAppsDeleted = await deleteCollection(firestore, applicationsRef, batchSize);
        applicationsDeleted += numAppsDeleted;
        
        // After deleting subcollections, delete the job document itself
        await jobDoc.ref.delete();
        jobsDeleted++;
      }
      
      const message = `Database unseeding complete.`;
      return { message, jobsDeleted, applicationsDeleted };

    } catch (error: any) {
      console.error('Error unseeding database:', error);
      throw new Error(`Failed to unseed database: ${error.message}`);
    }
  }
);
