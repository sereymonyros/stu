
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// In production, server-side environment variables should be used.
// This logic prioritizes the server-only variable if it exists.
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  const errorMessage = 
    'The GEMINI_API_KEY environment variable is not set. ' +
    'This is required for all AI features. ' +
    'If you are in production, add it as a secret in your hosting environment. ' +
    'If you are in local development, add it to your .env file.';

  if (process.env.NODE_ENV === 'production') {
    console.error(`CRITICAL: ${errorMessage}`);
  } else {
    console.warn(`WARNING: ${errorMessage}`);
  }
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: apiKey
    }),
  ],
});
