
'use server';
/**
 * @fileOverview An AI flow to analyze a job applicant's resume against a job description.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { 
  AnalyzeApplicantInputSchema,
  type AnalyzeApplicantInput,
  AnalyzeApplicantOutputSchema,
  type AnalyzeApplicantOutput 
} from './analyze-applicant-schema';


export async function analyzeApplicant(input: AnalyzeApplicantInput): Promise<AnalyzeApplicantOutput> {
  return analyzeApplicantFlow(input);
}

const analyzeApplicantPrompt = ai.definePrompt({
  name: 'analyzeApplicantPrompt',
  input: { schema: z.object({
      jobTitle: z.string(),
      jobDescription: z.string(),
      resumeText: z.string(),
  })},
  output: { schema: AnalyzeApplicantOutputSchema },
  prompt: `You are an expert HR recruiter with 20 years of experience, specializing in technical roles.
  Your task is to analyze a candidate's resume against a specific job description and provide a structured evaluation.

  **Job Description:**
  - Title: {{jobTitle}}
  - Description: {{jobDescription}}

  **Candidate's Resume Text:**
  ---
  {{resumeText}}
  ---

  **Your Analysis:**
  Based on the provided job description and resume, perform the following analysis. Be critical and objective.

  1.  **Match Score:** Provide a numerical score from 0 to 100 that represents the candidate's overall fit for the role. A score of 100 means a perfect match.
  2.  **Strengths:** Identify and list the candidate's most relevant skills, experiences, and qualifications that directly match the job requirements.
  3.  **Potential Gaps:** Identify key requirements from the job description that are NOT clearly mentioned or addressed in the resume. If there are no obvious gaps, state that.
  4.  **Summary:** Write a concise, one-paragraph summary of the candidate's profile and their suitability for this specific role.

  Provide your response ONLY in the requested JSON format.
  `,
});

const analyzeApplicantFlow = ai.defineFlow(
  {
    name: 'analyzeApplicantFlow',
    inputSchema: AnalyzeApplicantInputSchema,
    outputSchema: AnalyzeApplicantOutputSchema,
  },
  async (input) => {
    try {
        // 1. Extract and decode the resume data
        const base64Data = input.resumeDataUri.split(',')[1];
        if (!base64Data) {
            throw new Error('Invalid resume data URI: No Base64 data found.');
        }
        const pdfBuffer = Buffer.from(base64Data, 'base64');
        
        // 2. Parse the PDF to extract text using a dynamic import
        const pdf = (await import('pdf-parse/lib/pdf-parse.js')).default;
        const data = await pdf(pdfBuffer);
        const resumeText = data.text;

        if (!resumeText.trim()) {
            throw new Error('Could not extract text from the provided resume PDF.');
        }

        // 3. Call the AI prompt with the extracted text
        const { output } = await analyzeApplicantPrompt({
            jobTitle: input.jobTitle,
            jobDescription: input.jobDescription,
            resumeText: resumeText,
        });

        if (!output) {
            throw new Error('The AI model did not return a valid analysis.');
        }

        return output;
    } catch (e: any) {
        console.error('Flow Error: Failed to analyze applicant.', e);
        // Re-throw a more user-friendly error
        throw new Error(`Failed to analyze resume: ${e.message}`);
    }
  }
);
