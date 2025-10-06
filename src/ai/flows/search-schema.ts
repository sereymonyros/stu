/**
 * @fileOverview Defines the input and output schemas for the search flow.
 */
import { z } from 'zod';

export const SearchCambodiaInputSchema = z.object({
  query: z.string().describe("The user's search query."),
});
export type SearchCambodiaInput = z.infer<typeof SearchCambodiaInputSchema>;

export const SearchCambodiaOutputSchema = z.object({
  answer: z.string().describe('The AI-generated answer to the query, formatted as HTML.'),
});
export type SearchCambodiaOutput = z.infer<typeof SearchCambodiaOutputSchema>;
