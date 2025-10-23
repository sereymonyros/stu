import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// In production, server-side environment variables should be used.
// The NEXT_PUBLIC_ prefix is primarily for browser-side variables.
// This logic prioritizes the server-only variable if it exists.
const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!apiKey) {
  if (process.env.NODE_ENV === 'production') {
    console.error('CRITICAL: GEMINI_API_KEY is not set in the production environment.');
  } else {
    console.warn('Could not find GEMINI_API_KEY or NEXT_PUBLIC_GEMINI_API_KEY. AI features will not work.');
  }
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: apiKey
    }),
  ],
});
