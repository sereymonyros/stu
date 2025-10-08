
'use server';
/**
 * @fileOverview A flow for uploading files to Firebase Storage.
 * This flow is designed to be called from the client-side to bypass CORS issues.
 */

import { ai } from '@/ai/genkit';
import { getStorage, ref, getDownloadURL } from 'firebase-admin/storage';
import { initializeFirebaseAdmin } from '@/firebase/server-init';
import { UploadFileInput, UploadFileInputSchema, UploadFileOutput, UploadFileOutputSchema } from './upload-file-schema';

// Initialize Firebase Admin SDK
const { storage } = initializeFirebaseAdmin();

export async function uploadFile(input: UploadFileInput): Promise<UploadFileOutput> {
  return uploadFileFlow(input);
}

const uploadFileFlow = ai.defineFlow(
  {
    name: 'uploadFileFlow',
    inputSchema: UploadFileInputSchema,
    outputSchema: UploadFileOutputSchema,
  },
  async (input) => {
    const { fileDataUrl, path, contentType } = input;
    
    const bucket = storage.bucket();
    const fileRef = bucket.file(path);

    // Data URLs are in the format "data:<mimetype>;base64,<data>"
    // We need to extract just the base64 data.
    const base64Data = fileDataUrl.split(',')[1];
    
    if (!base64Data) {
        throw new Error("Invalid data URL format.");
    }
    
    await fileRef.save(Buffer.from(base64Data, 'base64'), {
        metadata: {
            contentType: contentType,
        },
    });

    const downloadUrl = await getDownloadURL(fileRef);

    return { downloadUrl };
  }
);
