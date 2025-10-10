
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
  })},
  output: { schema: AnalyzeApplicantOutputSchema },
  prompt: `You are an expert HR recruiter with 20 years of experience, specializing in technical roles.
  Your task is to analyze a job description and provide a structured evaluation guide for a recruiter to use while manually reviewing a candidate's resume.

  **Job Description:**
  - Title: {{jobTitle}}
  - Description: {{jobDescription}}

  **Your Task:**
  Based on the provided job description, generate a helpful guide for a human recruiter.
  IMPORTANT: You CANNOT see the resume. Your entire analysis must be based on the job description.

  1.  **Match Score:** Set this to 0. You cannot determine a match score without seeing the resume.
  2.  **Strengths:** Create a list of key skills, technologies, and experiences the recruiter should look for in the resume that would make a candidate a strong fit. These should be derived directly from the job description. (e.g., "Look for experience with React and TypeScript," "Check for a history of managing projects with Agile methodologies").
  3.  **Potential Gaps:** Create a list of questions or potential red flags the recruiter should consider while reading the resume. (e.g., "Are there any unexplained gaps in employment?", "Does the candidate have experience in a fast-paced environment?").
  4.  **Summary:** Write a one-paragraph summary explaining what a strong candidate for this role looks like, based on the job description. This should guide the recruiter on what to focus on. Explicitly state that the recruiter must open and read the candidate's resume to verify these qualities.

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
        const { output } = await analyzeApplicantPrompt({
            jobTitle: input.jobTitle,
            jobDescription: input.jobDescription,
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
