/**
 * @fileOverview Defines the input and output schemas for the analyzeApplicant flow.
 */
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
