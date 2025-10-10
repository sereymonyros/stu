'use server';
/**
 * @fileOverview An AI flow to extract text from a document using Gemini's multimodal capabilities.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const AnalyzeDocumentInputSchema = z.object({
  fileDataUri: z.string().describe("A data URI of the document file (e.g., PDF, DOCX). Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type AnalyzeDocumentInput = z.infer<typeof AnalyzeDocumentInputSchema>;

const AnalyzeDocumentOutputSchema = z.object({
  text: z.string().describe('The extracted plain text content from the document.'),
});
export type AnalyzeDocumentOutput = z.infer<typeof AnalyzeDocumentOutputSchema>;

export async function analyzeDocument(input: AnalyzeDocumentInput): Promise<AnalyzeDocumentOutput> {
    return analyzeDocumentFlow(input);
}

const analyzeDocumentFlow = ai.defineFlow(
    {
        name: 'analyzeDocumentFlow',
        inputSchema: AnalyzeDocumentInputSchema,
        outputSchema: AnalyzeDocumentOutputSchema,
        // Using a more powerful model capable of document analysis
        model: 'googleai/gemini-2.5-pro-preview',
    },
    async (input) => {
        const { text } = await ai.generate({
            prompt: [
                { media: { url: input.fileDataUri } },
                { text: 'Extract all text from the document.' }
            ],
        });
        return { text };
    }
);
