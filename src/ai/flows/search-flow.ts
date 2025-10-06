'use server';
/**
 * @fileOverview A search flow for Cambodia Hub.
 *
 * - searchCambodia - A function that performs a search.
 */

import { ai } from '@/ai/genkit';
import { marked } from 'marked';
import { SearchCambodiaInput, SearchCambodiaInputSchema, SearchCambodiaOutput, SearchCambodiaOutputSchema } from './search-schema';

export async function searchCambodia(input: SearchCambodiaInput): Promise<SearchCambodiaOutput> {
  return searchCambodiaFlow(input);
}

const prompt = ai.definePrompt({
  name: 'searchCambodiaPrompt',
  input: { schema: SearchCambodiaInputSchema },
  prompt: `You are an expert tour guide for Cambodia. Your name is "Cambodia Hub".
  
  A user has a question: "{{query}}".
  
  Provide a helpful, detailed, and friendly answer. Format your response in Markdown.
  If the query is about places, suggest a few and why they are interesting.
  If the query is about food, describe the taste and where to find it.
  If the query is about culture, explain the context and significance.
  
  Keep the tone light and engaging.`,
});

const searchCambodiaFlow = ai.defineFlow(
  {
    name: 'searchCambodiaFlow',
    inputSchema: SearchCambodiaInputSchema,
    outputSchema: SearchCambodiaOutputSchema,
  },
  async (input) => {
    const llmResponse = await prompt(input);
    const markdownAnswer = llmResponse.text;
    
    // Convert Markdown to HTML
    const htmlAnswer = await marked.parse(markdownAnswer);

    return { answer: htmlAnswer };
  }
);
