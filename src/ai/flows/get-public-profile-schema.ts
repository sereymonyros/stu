/**
 * @fileOverview Defines the input and output schemas for the getPublicProfile flow.
 */
import { z } from 'zod';

export const GetPublicProfileInputSchema = z.object({
  userId: z.string().describe('The UID of the user to fetch.'),
});
export type GetPublicProfileInput = z.infer<typeof GetPublicProfileInputSchema>;

// This schema now reflects the structure of the UserProfile entity in Firestore
export const GetPublicProfileOutputSchema = z.object({
  uid: z.string(),
  displayName: z.string().optional(),
  photoURL: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  userType: z.string().optional(),
});
export type GetPublicProfileOutput = z.infer<typeof GetPublicProfileOutputSchema>;
