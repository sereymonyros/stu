
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
  model: 'googleai/gemini-1.5-flash',
  input: { schema: AnalyzeApplicantInputSchema },
  output: { schema: AnalyzeApplicantOutputSchema },
  prompt: `You are an expert HR recruiter with 20 years of experience, specializing in technical roles.
  Your task is to analyze the provided resume file against the job description and generate a concise report for a human recruiter.

  **Job Description:**
  - Title: {{jobTitle}}
  - Description: {{jobDescription}}

  **Candidate's Resume File:**
  {{media url=resumeDataUri}}

  **Your Task:**
  Provide your analysis in the required JSON format by performing the following steps:

  1.  **Extract Text**: First, extract all relevant text from the provided resume file.
  2.  **Match Score:** Carefully compare the extracted resume text against the job description. Assign a score from 0 to 100 representing the candidate's suitability.
      - A score of 90-100 is a perfect or near-perfect match.
      - A score of 75-89 is a strong candidate who meets most key requirements.
      - A score of 50-74 is a potential fit, but has some gaps.
      - A score below 50 is likely not a good fit.
      Base the score on skills, years of experience, and qualifications mentioned in both the resume and the job description.

  3.  **Strengths:** Create a bulleted list of the candidate's strongest qualifications that directly match the job requirements. Be specific and use evidence from the resume (e.g., "5+ years of experience with React," "Managed a team of 3 engineers as listed in their role at Acme Corp").

  4.  **Gaps:** Create a bulleted list of key requirements from the job description that appear to be missing or are not clearly stated in the resume (e.g., "No mention of cloud infrastructure experience (AWS, Azure, GCP)," "The required PMP certification is not listed").

  5.  **Summary:** Write a one-paragraph summary of the candidate's profile and their overall fit for the role. This should be a high-level overview to help the recruiter quickly understand the candidate's potential.

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
        const { output } = await analyzeApplicantPrompt(input);

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
