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
      const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
      if (!storageBucket) {
        throw new Error('FIREBASE_STORAGE_BUCKET environment variable is not set.');
      }
      
      const { storage } = initializeFirebaseAdmin();
      const bucket = storage.bucket(storageBucket);

      const { mimeType, base64Data } = parseDataUri(input.fileDataUri);
      const buffer = Buffer.from(base64Data, 'base64');
      
      const filePath = `${input.path}/${input.fileName}`;
      const file = bucket.file(filePath);
      
      await file.save(buffer, {
        metadata: {
          contentType: mimeType,
        },
        public: true, // Make the file public upon upload
      });

      // The publicUrl format is consistent and can be constructed directly.
      const downloadUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
      
      return { downloadUrl };
    } catch (e: any) {
      console.error("Flow Error: Failed to upload file.", e);
      // Re-throw or handle the error as needed for the flow's output
      throw new Error(`Failed to upload file: ${e.message}`);
    }
  }
);
