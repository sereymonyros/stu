/**
 * @fileOverview Defines the input and output schemas for the analyzeApplicant flow.
 */
import { z } from 'zod';

export const AnalyzeApplicantInputSchema = z.object({
  jobTitle: z.string().describe('The title of the job posting.'),
  jobDescription: z.string().describe('The full description of the job posting.'),
  resumeDataUri: z.string().describe("A data URI of the applicant's resume file (PDF, DOC, DOCX). Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type AnalyzeApplicantInput = z.infer<typeof AnalyzeApplicantInputSchema>;

export const AnalyzeApplicantOutputSchema = z.object({
  matchScore: z.number().min(0).max(100).describe('A score from 0-100 indicating how well the resume matches the job description.'),
  strengths: z.array(z.string()).describe('A list of key strengths and qualifications from the resume that align with the job.'),
  gaps: z.array(z.string()).describe('A list of requirements from the job description that appear to be missing from the resume.'),
  summary: z.string().describe('A one-paragraph summary of the candidate and their overall fit for the role.'),
  suggestedInterviewQuestions: z.array(z.string()).describe("A list of 3-5 suggested interview questions to ask the candidate based on their resume and the job description."),
  performanceIndicators: z.array(z.string()).describe("A list of indicators from the resume that suggest high performance, such as rapid promotions, project leadership, or quantifiable achievements."),
});
export type AnalyzeApplicantOutput = z.infer<typeof AnalyzeApplicantOutputSchema>;
