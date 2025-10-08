'use server';
/**
 * @fileOverview A flow for uploading files to Firebase Storage.
 */

import { ai } from '@/ai/genkit';
import { initializeFirebaseAdmin } from '@/firebase/server-init';
import {
  UploadFileInput,
  UploadFileInputSchema,
  UploadFileOutput,
  UploadFileOutputSchema,
} from './upload-file-schema';
import { z } from 'zod';

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

export async function uploadFile(
  input: UploadFileInput
): Promise<UploadFileOutput> {
  return uploadFileFlow(input);
}

const uploadFileFlow = ai.defineFlow(
  {
    name: 'uploadFileFlow',
    inputSchema: UploadFileInputSchema,
    outputSchema: UploadFileOutputSchema,
  },
  async (input) => {
    try {
      const { storage } = initializeFirebaseAdmin();
      const bucket = storage.bucket();

      const { mimeType, base64Data } = parseDataUri(input.fileDataUri);
      const buffer = Buffer.from(base64Data, 'base64');
      
      const filePath = `${input.path}/${input.fileName}`;
      const file = bucket.file(filePath);
      
      await file.save(buffer, {
        metadata: {
          contentType: mimeType,
        },
      });

      // Make the file public to get a downloadable URL
      await file.makePublic();

      const downloadUrl = file.publicUrl();
      
      return { downloadUrl };
    } catch (e: any) {
      console.error("Flow Error: Failed to upload file.", e);
      // Check for billing-related or permission errors and show a user-friendly message.
      if (e.message?.includes('billing') || e.code === 403) {
        throw new Error('Failed to upload file: A server-side error occurred. Please try again later.');
      }
      throw new Error(`Failed to upload file: ${e.message}`);
    }
  }
);
