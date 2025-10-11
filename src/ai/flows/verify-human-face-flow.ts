
'use server';
/**
 * @fileOverview An AI flow to verify if an uploaded image contains a human face.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const VerifyHumanFaceInputSchema = z.object({
  fileDataUri: z
    .string()
    .describe(
      "A photo of a potential profile picture, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type VerifyHumanFaceInput = z.infer<typeof VerifyHumanFaceInputSchema>;

const VerifyHumanFaceOutputSchema = z.object({
  isHumanFace: z.boolean().describe('Whether or not the image contains a human face.'),
  reason: z.string().describe('A brief explanation for the decision, especially if it is not a human face.'),
});
export type VerifyHumanFaceOutput = z.infer<typeof VerifyHumanFaceOutputSchema>;

export async function verifyHumanFace(input: VerifyHumanFaceInput): Promise<VerifyHumanFaceOutput> {
  return verifyHumanFaceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'verifyHumanFacePrompt',
  model: 'gemini-1.5-flash',
  input: { schema: VerifyHumanFaceInputSchema },
  output: { schema: VerifyHumanFaceOutputSchema },
  prompt: `You are an AI security expert responsible for verifying user profile pictures.
  Your only task is to determine if the provided image is a real, clear photograph of a single human face.

  Analyze the following image: {{media url=fileDataUri}}

  **Your criteria:**
  - The image MUST contain a human face.
  - The face should be reasonably clear and not heavily obscured.
  - It must be a photograph, NOT a cartoon, avatar, drawing, or abstract art.
  - It must not be an animal, object, or landscape.

  **Your Task:**
  Based on your analysis, provide a JSON response with two fields:
  1. \`isHumanFace\`: A boolean value. \`true\` if it meets the criteria, \`false\` otherwise.
  2. \`reason\`: A very brief, user-friendly explanation for your decision. For example: "This appears to be a valid profile picture.", "No human face was detected in the image.", or "This appears to be a cartoon, not a photograph."
  `,
});

const verifyHumanFaceFlow = ai.defineFlow(
  {
    name: 'verifyHumanFaceFlow',
    inputSchema: VerifyHumanFaceInputSchema,
    outputSchema: VerifyHumanFaceOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);

    if (!output) {
      throw new Error('The AI model did not return a valid verification response.');
    }

    return output;
  }
);
