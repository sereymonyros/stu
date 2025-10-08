
'use server';
/**
 * @fileOverview A flow for uploading files to Firebase Storage.
 * This flow is designed to be called from the client-side to bypass CORS issues.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase-admin/storage';
import { initializeFirebaseAdmin } from '@/firebase/server-init';

// Initialize Firebase Admin SDK
const { storage } = initializeFirebaseAdmin();

export const UploadFileInputSchema = z.object({
  fileDataUrl: z.string().describe("The file encoded as a data URL."),
  path: z.string().describe("The path where the file should be stored in Firebase Storage."),
  contentType: z.string().describe("The MIME type of the file."),
});
export type UploadFileInput = z.infer<typeof UploadFileInputSchema>;

export const UploadFileOutputSchema = z.object({
  downloadUrl: z.string().describe("The public URL of the uploaded file."),
});
export type UploadFileOutput = z.infer<typeof UploadFileOutputSchema>;


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
