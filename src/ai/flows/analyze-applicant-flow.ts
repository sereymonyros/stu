
'use server';
/**
 * @fileOverview An AI flow to analyze a job applicant's resume against a job description.
 * It intelligently handles PDF and DOC/DOCX files by using the appropriate parsing strategy.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import * as mammoth from 'mammoth';
import { 
  AnalyzeApplicantInputSchema,
  type AnalyzeApplicantInput,
  AnalyzeApplicantOutputSchema,
  type AnalyzeApplicantOutput 
} from './analyze-applicant-schema';

// Helper to extract base64 data and mime type from a data URI
function parseDataUri(dataUri: string) {
  const match = dataUri.match(/^data:([a-zA-Z0-9/.-]+);base64,(.*)$/);
  if (!match) {
    throw new Error('Invalid data URI format');
  }
  return {
    mimeType: match[1],
    base64Data: match[2],
  };
}

export async function analyzeApplicant(input: AnalyzeApplicantInput): Promise<AnalyzeApplicantOutput> {
  return analyzeApplicantFlow(input);
}

// Prompt for analyzing a file directly (works well for PDFs)
const analyzeApplicantPrompt = ai.definePrompt({
  name: 'analyzeApplicantFilePrompt',
  model: 'googleai/gemini-2.5-flash',
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
  
  6.  **Suggested Interview Questions:** Based on the strengths and gaps you identified, create a list of 3-5 insightful and targeted interview questions to ask the candidate. These questions should help a recruiter validate experience and probe into potential weaknesses.

  Provide your response ONLY in the requested JSON format.
  `,
});

// New schema and prompt for analyzing extracted text (for DOC/DOCX files)
const AnalyzeApplicantTextInputSchema = AnalyzeApplicantInputSchema.extend({
    resumeText: z.string().describe("The full text content extracted from the resume."),
}).omit({ resumeDataUri: true }); // We don't need the data URI if we have text

const analyzeApplicantTextPrompt = ai.definePrompt({
    name: 'analyzeApplicantTextPrompt',
    model: 'googleai/gemini-2.5-flash',
    input: { schema: AnalyzeApplicantTextInputSchema },
    output: { schema: AnalyzeApplicantOutputSchema },
    prompt: `You are an expert HR recruiter with 20 years of experience, specializing in technical roles.
    Your task is to analyze the provided resume text against the job description and generate a concise report for a human recruiter.

    **Job Description:**
    - Title: {{jobTitle}}
    - Description: {{jobDescription}}

    **Candidate's Resume Text:**
    ---
    {{resumeText}}
    ---

    **Your Task:**
    Provide your analysis in the required JSON format by performing the following steps:

    1.  **Match Score:** Carefully compare the resume text against the job description. Assign a score from 0 to 100 representing the candidate's suitability.
        - A score of 90-100 is a perfect or near-perfect match.
        - A score of 75-89 is a strong candidate who meets most key requirements.
        - A score of 50-74 is a potential fit, but has some gaps.
        - A score below 50 is likely not a good fit.
        Base the score on skills, years of experience, and qualifications mentioned in both the resume and the job description.

    2.  **Strengths:** Create a bulleted list of the candidate's strongest qualifications that directly match the job requirements. Be specific and use evidence from the resume (e.g., "5+ years of experience with React," "Managed a team of 3 engineers as listed in their role at Acme Corp").

    3.  **Gaps:** Create a bulleted list of key requirements from the job description that appear to be missing or are not clearly stated in the resume (e.g., "No mention of cloud infrastructure experience (AWS, Azure, GCP)," "The required PMP certification is not listed").

    4.  **Summary:** Write a one-paragraph summary of the candidate's profile and their overall fit for the role. This should be a high-level overview to help the recruiter quickly understand the candidate's potential.

    5.  **Suggested Interview Questions:** Based on the strengths and gaps you identified, create a list of 3-5 insightful and targeted interview questions to ask the candidate. These questions should help a recruiter validate experience and probe into potential weaknesses.

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
        const { mimeType, base64Data } = parseDataUri(input.resumeDataUri);

        let output;

        // If it's a Word document, extract text first.
        if (mimeType.includes('wordprocessingml') || mimeType.includes('msword')) {
            const buffer = Buffer.from(base64Data, 'base64');
            const { value: resumeText } = await mammoth.extractRawText({ buffer });
            const textInput = {
                jobTitle: input.jobTitle,
                jobDescription: input.jobDescription,
                resumeText: resumeText,
            };
            const response = await analyzeApplicantTextPrompt(textInput);
            output = response.output;
        } else {
            // For other supported types (like PDF), send the file directly.
            const response = await analyzeApplicantPrompt(input);
            output = response.output;
        }

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
