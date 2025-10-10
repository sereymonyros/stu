'use server';
/**
 * @fileOverview An AI flow to analyze a job applicant's resume against a job description.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const AnalyzeApplicantInputSchema = z.object({
  jobTitle: z.string().describe('The title of the job posting.'),
  jobDescription: z.string().describe('The full description of the job posting.'),
  resumeDataUri: z.string().describe("The applicant's resume as a data URI. Expected format: 'data:application/pdf;base64,<encoded_data>'."),
});
export type AnalyzeApplicantInput = z.infer<typeof AnalyzeApplicantInputSchema>;

export const AnalyzeApplicantOutputSchema = z.object({
  matchScore: z.number().min(0).max(100).describe('A score from 0-100 indicating how well the resume matches the job description.'),
  strengths: z.array(z.string()).describe('A list of key strengths and qualifications from the resume that align with the job.'),
  gaps: z.array(z.string()).describe('A list of requirements from the job description that appear to be missing from the resume.'),
  summary: z.string().describe('A one-paragraph summary of the candidate and their overall fit for the role.'),
});
export type AnalyzeApplicantOutput = z.infer<typeof AnalyzeApplicantOutputSchema>;

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
        const pdf = (await import('pdf-parse')).default;
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
