
'use server';
/**
 * @fileOverview A flow for securely fetching a company profile by its name.
 * It uses the Firebase Admin SDK to bypass client-side security rules for public data.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { initializeFirebaseAdmin } from '@/firebase/server-init';

const GetCompanyByNameInputSchema = z.object({
  companyName: z.string().describe('The name of the company to fetch.'),
});
export type GetCompanyByNameInput = z.infer<typeof GetCompanyByNameInputSchema>;

const GetCompanyByNameOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  logoUrl: z.string().url().optional(),
}).nullable();
export type GetCompanyByNameOutput = z.infer<typeof GetCompanyByNameOutputSchema>;


export async function getCompanyByName(
  input: GetCompanyByNameInput
): Promise<GetCompanyByNameOutput> {
  return getCompanyByNameFlow(input);
}

const getCompanyByNameFlow = ai.defineFlow(
  {
    name: 'getCompanyByNameFlow',
    inputSchema: GetCompanyByNameInputSchema,
    outputSchema: GetCompanyByNameOutputSchema,
  },
  async ({ companyName }) => {
    try {
      const { firestore } = initializeFirebaseAdmin();

      const companyQuery = firestore.collection('companies').where('name', '==', companyName).limit(1);
      const companySnapshot = await companyQuery.get();

      if (companySnapshot.empty) {
        console.warn(`No company found with name: ${companyName}`);
        return null;
      }
      
      const companyDoc = companySnapshot.docs[0];
      const companyData = companyDoc.data();

      return {
        id: companyDoc.id,
        name: companyData.name,
        description: companyData.description,
        logoUrl: companyData.logoUrl,
      };

    } catch (e: any) {
      console.error(`Flow Error: Failed to fetch company data for "${companyName}".`, e);
      throw new Error(`Failed to fetch company profile for "${companyName}": ${e.message}`);
    }
  }
);
