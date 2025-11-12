
'use server';
/**
 * @fileOverview A multi-purpose chatbot flow that can guide users or find jobs.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { initializeFirebaseAdmin } from '@/firebase/server-init';
import { marked } from 'marked';

// Initialize Firebase Admin at the module level for reuse.
const { firestore } = initializeFirebaseAdmin();

// Schema for the 'Job' entity, used for the tool output.
const JobSchema = z.object({
  id: z.string(),
  title: z.string(),
  companyName: z.string(),
  location: z.string(),
  jobType: z.string(),
});
type Job = z.infer<typeof JobSchema>;


// Input for the `findJobs` tool
const FindJobsToolInputSchema = z.object({
  searchQuery: z.string().optional().describe("Keywords for job title or description."),
  companyNames: z.array(z.string()).optional().describe("A list of company names to filter by."),
  locations: z.array(z.string()).optional().describe("A list of locations (cities) to filter by."),
  jobTypes: z.array(z.string()).optional().describe("A list of job types (e.g., 'Full-time', 'Part-time')."),
});

// Tool definition for finding jobs
const findJobs = ai.defineTool(
  {
    name: 'findJobs',
    description: 'Finds available job postings based on various criteria.',
    inputSchema: FindJobsToolInputSchema,
    outputSchema: z.array(JobSchema),
  },
  async (input) => {
    console.log("findJobs tool called with input:", input);
    // Use the pre-initialized firestore instance
    let query: FirebaseFirestore.Query = firestore.collection('jobs');

    // We only want available jobs
    query = query.where('status', '==', 'Available');

    // The AI model is good at extracting entities, but we still need to handle them.
    if (input.companyNames && input.companyNames.length > 0) {
      query = query.where('companyName', 'in', input.companyNames);
    }
    if (input.locations && input.locations.length > 0) {
      query = query.where('location', 'in', input.locations);
    }
    if (input.jobTypes && input.jobTypes.length > 0) {
      query = query.where('jobType', 'in', input.jobTypes);
    }
    
    const snapshot = await query.get();
    let jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));

    // Handle text search query separately, as Firestore doesn't do full-text search well.
    if (input.searchQuery) {
        const q = input.searchQuery.toLowerCase();
        jobs = jobs.filter(job => 
            (job.title?.toLowerCase().includes(q) || false)
        );
    }
    
    // Limit to 5 results to keep the chat response concise.
    return jobs.slice(0, 5);
  }
);


// Schema for the app's features that the AI can query (for guidance).
const AppFeatureSchema = z.object({
  feature: z.enum([
    'apply-for-job', 'post-a-job', 'update-profile', 'withdraw-application',
    'view-dashboard', 'search-jobs', 'save-job-search', 'become-recruiter',
  ]),
});
const FeatureInfoSchema = z.object({
  featureName: z.string(),
  description: z.string(),
  steps: z.array(z.string()),
  requiredRole: z.string().optional(),
  relatedPage: z.string().optional(),
});
type FeatureInfo = z.infer<typeof FeatureInfoSchema>;

const featureDatabase: Record<string, FeatureInfo> = {
    'apply-for-job': { featureName: 'Applying for a Job', description: "To apply for a job, you need to be a 'standard' user with a complete profile.", steps: ["Log in or sign up as a 'standard' user.", "Go to your Profile page and make sure you have uploaded a profile picture and a resume.", "Navigate to the 'Job Board'.", "Find a job you're interested in and click 'View & Apply'.", "On the application page, confirm your details and submit."], requiredRole: 'standard', relatedPage: '/jobs' },
    'post-a-job': { featureName: 'Posting a Job', description: "Only users with the 'recruiter' role can post jobs.", steps: ["Log in or sign up with the 'recruiter' user type.", "Go to the 'Job Board' page.", "Click the 'Post a New Job' button.", "Fill out the job details form and submit it."], requiredRole: 'recruiter', relatedPage: '/jobs/new' },
    'update-profile': { featureName: 'Updating Your Profile', description: "You can update your personal information, photo, and resume from your profile page.", steps: ["Click on your user avatar in the top-right corner to open the menu.", "Select 'Profile' from the dropdown.", "Fill in the fields you want to update.", "To update your photo or resume, click the upload area and select a new file.", "Click 'Save Changes'."], relatedPage: '/profile' },
    'withdraw-application': { featureName: 'Withdrawing a Job Application', description: "You can withdraw an application if it has been submitted or is under review.", steps: ["Navigate to the job page for the application you want to withdraw.", "You can find your applied jobs on your Dashboard or on the main Job Board.", "On the application page, you will see a 'Withdraw' button.", "Click the button and confirm your choice in the dialog box."], requiredRole: 'standard', relatedPage: '/dashboard' },
    'view-dashboard': { featureName: 'Viewing Your Dashboard', description: "The dashboard shows you relevant information based on your user type.", steps: ["If you are a 'standard' user, your dashboard shows jobs you've applied for, your favorite jobs, and saved searches.", "If you are a 'recruiter', your dashboard shows the jobs you have posted and the number of applicants for each."], relatedPage: '/dashboard' },
    'search-jobs': { featureName: 'Searching and Filtering Jobs', description: "The job board has powerful search and filter capabilities.", steps: ["Use the main search bar to search by keywords in the job title or description.", "Use the filter toggles for Company, Location, and Job Type to narrow down the results.", "Use the slider to filter by salary range."], relatedPage: '/jobs' },
    'save-job-search': { featureName: 'Saving a Job Search', description: "You can save your filter combinations to get notified about new matching jobs.", steps: ["On the Job Board, apply the filters you want to save.", "Click the 'Save Search' button.", "Give your search a name.", "You can view and manage your saved searches on your Dashboard."], requiredRole: 'standard', relatedPage: '/jobs' },
    'become-recruiter': { featureName: 'Becoming a Recruiter', description: "You can select your user type when you first create your account.", steps: ["Go to the 'Sign Up' page.", "Fill in your name, email, and other details.", "At the bottom of the form, you will see a choice between 'General User' and 'Recruiter'.", "Select the 'Recruiter' option before creating your account."], relatedPage: '/signup' }
};

const getFeatureInformation = ai.defineTool(
  {
    name: 'getFeatureInformation',
    description: 'Retrieves information about a specific feature of the Cambodia Hub application.',
    inputSchema: AppFeatureSchema,
    outputSchema: FeatureInfoSchema,
  },
  async (input) => {
    return featureDatabase[input.feature];
  }
);


const ChatInputSchema = z.object({
  query: z.string().describe("The user's question or command."),
  userId: z.string().optional().describe("The user's ID, if they are authenticated."),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;

const ChatOutputSchema = z.object({
  response: z.union([z.string(), z.array(JobSchema)]).describe("The chatbot's response. This can be a text string for guidance, or an array of Job objects if the user was searching for jobs."),
});
export type ChatOutput = z.infer<typeof ChatOutputSchema>;


export async function chat(input: ChatInput): Promise<ChatOutput> {
  return chatFlow(input);
}


const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async ({ query, userId }) => {

    let userName = 'there';
    if (userId) {
        const userDoc = await firestore.collection('users').doc(userId).get();
        const user = userDoc.data();
        userName = user?.displayName || 'there';
    }

    const llmResponse = await ai.generate({
      prompt: `You are the "Cambodia Hub Helper", an expert and friendly guide for the Cambodia Hub application.
      The user you are talking to is named ${userName}.

      You have two main capabilities:
      1.  **Find Jobs**: If the user asks to find jobs, use the 'findJobs' tool. Extract entities like job titles, locations, and company names to pass to the tool.
      2.  **Provide Help**: If the user asks for help on how to do something, use the 'getFeatureInformation' tool to find the facts about the feature. Based on the tool's output, formulate a friendly, step-by-step answer in Markdown.

      **Decision Making:**
      - If the user's query is clearly a job search (e.g., "find me marketing jobs", "show me roles in Battambang"), prioritize using the 'findJobs' tool.
      - If the user's query is a "how-to" question (e.g., "how do I post a job?"), use the 'getFeatureInformation' tool.
      - If the query is ambiguous, ask a clarifying question.
      - If the user asks a question not related to the app's features (e.g., about history, tourism), you MUST politely decline and state that you can only help with questions about the Cambodia Hub app.
      
      User's question: "${query}"`,
      model: 'googleai/gemini-2.5-flash',
      tools: [findJobs, getFeatureInformation],
    });
    
    // Check if the model decided to use a tool
    if (llmResponse.toolRequests && llmResponse.toolRequests.length > 0) {
        // For simplicity, we'll only handle the first tool request if there are multiple.
        const toolRequest = llmResponse.toolRequests[0];
        
        // If the `findJobs` tool was called, the output will be an array of jobs.
        if (toolRequest.tool.name === 'findJobs') {
            const jobs = toolRequest.output as Job[];
            return { response: jobs };
        }
    }

    // If no tool was used, or a different tool was used, return the text response.
    const text = llmResponse.text;
    return { response: text };
  }
);
