
'use server';
/**
 * @fileOverview A chatbot flow to guide users on how to use the application.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { marked } from 'marked';

// Define the schema for the app's features that the AI can query.
const AppFeatureSchema = z.object({
  feature: z.enum([
    'apply-for-job',
    'post-a-job',
    'update-profile',
    'withdraw-application',
    'view-dashboard',
    'search-jobs',
    'save-job-search',
    'become-recruiter',
  ]),
});

// The data structure returned by our tool.
const FeatureInfoSchema = z.object({
  featureName: z.string(),
  description: z.string(),
  steps: z.array(z.string()),
  requiredRole: z.string().optional(),
  relatedPage: z.string().optional(),
});
type FeatureInfo = z.infer<typeof FeatureInfoSchema>;


// This is our "knowledge base". It's a simple map for now.
const featureDatabase: Record<string, FeatureInfo> = {
    'apply-for-job': {
        featureName: 'Applying for a Job',
        description: "To apply for a job, you need to be a 'standard' user with a complete profile.",
        steps: [
            "Log in or sign up as a 'standard' user.",
            "Go to your Profile page and make sure you have uploaded a profile picture and a resume.",
            "Navigate to the 'Job Board'.",
            "Find a job you're interested in and click 'View & Apply'.",
            "On the application page, confirm your details and submit."
        ],
        requiredRole: 'standard',
        relatedPage: '/jobs'
    },
    'post-a-job': {
        featureName: 'Posting a Job',
        description: "Only users with the 'recruiter' role can post jobs.",
        steps: [
            "Log in or sign up with the 'recruiter' user type.",
            "Go to the 'Job Board' page.",
            "Click the 'Post a New Job' button.",
            "Fill out the job details form and submit it."
        ],
        requiredRole: 'recruiter',
        relatedPage: '/jobs/new'
    },
    'update-profile': {
        featureName: 'Updating Your Profile',
        description: "You can update your personal information, photo, and resume from your profile page.",
        steps: [
            "Click on your user avatar in the top-right corner to open the menu.",
            "Select 'Profile' from the dropdown.",
            "Fill in the fields you want to update.",
            "To update your photo or resume, click the upload area and select a new file.",
            "Click 'Save Changes'."
        ],
        relatedPage: '/profile'
    },
     'withdraw-application': {
        featureName: 'Withdrawing a Job Application',
        description: "You can withdraw an application if it has been submitted or is under review.",
        steps: [
            "Navigate to the job page for the application you want to withdraw.",
            "You can find your applied jobs on your Dashboard or on the main Job Board.",
            "On the application page, you will see a 'Withdraw' button.",
            "Click the button and confirm your choice in the dialog box."
        ],
        requiredRole: 'standard',
        relatedPage: '/dashboard'
    },
    'view-dashboard': {
        featureName: 'Viewing Your Dashboard',
        description: "The dashboard shows you relevant information based on your user type.",
        steps: [
           "If you are a 'standard' user, your dashboard shows jobs you've applied for, your favorite jobs, and saved searches.",
           "If you are a 'recruiter', your dashboard shows the jobs you have posted and the number of applicants for each."
        ],
        relatedPage: '/dashboard'
    },
    'search-jobs': {
        featureName: 'Searching and Filtering Jobs',
        description: "The job board has powerful search and filter capabilities.",
        steps: [
           "Use the main search bar to search by keywords in the job title or description.",
           "Use the filter toggles for Company, Location, and Job Type to narrow down the results.",
           "Use the slider to filter by salary range."
        ],
        relatedPage: '/jobs'
    },
    'save-job-search': {
        featureName: 'Saving a Job Search',
        description: "You can save your filter combinations to get notified about new matching jobs.",
        steps: [
           "On the Job Board, apply the filters you want to save.",
           "Click the 'Save Search' button.",
           "Give your search a name.",
           "You can view and manage your saved searches on your Dashboard."
        ],
        requiredRole: 'standard',
        relatedPage: '/jobs'
    },
    'become-recruiter': {
        featureName: 'Becoming a Recruiter',
        description: "You can select your user type when you first create your account.",
        steps: [
            "Go to the 'Sign Up' page.",
            "Fill in your name, email, and other details.",
            "At the bottom of the form, you will see a choice between 'General User' and 'Recruiter'.",
            "Select the 'Recruiter' option before creating your account."
        ],
        relatedPage: '/signup'
    }
};

// Define the Genkit Tool
const getFeatureInformation = ai.defineTool(
  {
    name: 'getFeatureInformation',
    description: 'Retrieves information about a specific feature of the Cambodia Hub application.',
    inputSchema: AppFeatureSchema,
    outputSchema: FeatureInfoSchema,
  },
  async (input) => {
    // Look up the feature in our "database"
    return featureDatabase[input.feature];
  }
);


const GuideUserSchema = z.object({
  query: z.string().describe("The user's question about the app."),
});
export type GuideUserInput = z.infer<typeof GuideUserSchema>;

const GuideUserOutputSchema = z.object({
  answer: z.string().describe('A helpful answer to the user\'s question, formatted in Markdown.'),
});
export type GuideUserOutput = z.infer<typeof GuideUserOutputSchema>;


export async function guideUser(input: GuideUserInput): Promise<GuideUserOutput> {
  return guideUserFlow(input);
}


const guideUserFlow = ai.defineFlow(
  {
    name: 'guideUserFlow',
    inputSchema: GuideUserSchema,
    outputSchema: GuideUserOutputSchema,
  },
  async ({ query }) => {

    const llmResponse = await ai.generate({
        prompt: `You are the "Cambodia Hub Helper", an expert and friendly guide for the Cambodia Hub application.
        Your knowledge is strictly limited to the application's features.
        Your goal is to answer the user's question clearly and concisely.
        
        Use the 'getFeatureInformation' tool to find the facts about the feature the user is asking about.
        
        Based on the tool's output, formulate a friendly, step-by-step answer.
        - If the feature has required steps, list them out clearly.
        - If the feature has a related page, mention it.
        - Format your response in simple Markdown. Use bullet points for lists.
        
        If the user asks a question not related to the app's features (e.g., about history, tourism, or other general topics), you MUST politely decline and state that you can only help with questions about using the Cambodia Hub app.
        
        User's question: "${query}"`,
        model: 'googleai/gemini-2.5-flash',
        tools: [getFeatureInformation],
        output: {
            format: 'text',
        },
    });

    const text = llmResponse.text;
    return { answer: text };
  }
);
