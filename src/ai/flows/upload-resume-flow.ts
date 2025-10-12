'use server';
/**
 * @fileOverview A flow for uploading a resume, converting it to PDF if necessary.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import * as mammoth from 'mammoth';
import { uploadFile } from './upload-file-flow';
import { convertToPdf } from './convert-to-pdf-flow';

const UploadResumeInputSchema = z.object({
  fileDataUri: z.string().describe("The resume file as a data URI."),
  fileName: z.string().describe('The name of the file.'),
  userId: z.string().describe('The UID of the user uploading the resume.'),
});
export type UploadResumeInput = z.infer<typeof UploadResumeInputSchema>;

const UploadResumeOutputSchema = z.object({
  downloadUrl: z.string().describe('The public download URL of the uploaded PDF file.'),
});
export type UploadResumeOutput = z.infer<typeof UploadResumeOutputSchema>;


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

export async function uploadResume(
  input: UploadResumeInput
): Promise<UploadResumeOutput> {
  return uploadResumeFlow(input);
}

const uploadResumeFlow = ai.defineFlow(
  {
    name: 'uploadResumeFlow',
    inputSchema: UploadResumeInputSchema,
    outputSchema: UploadResumeOutputSchema,
  },
  async ({ fileDataUri, fileName, userId }) => {
    try {
      const { mimeType } = parseDataUri(fileDataUri);

      let finalFileDataUri = fileDataUri;
      let finalFileName = fileName;

      // If it's a Word document, convert it to PDF.
      if (mimeType.includes('wordprocessingml') || mimeType.includes('msword')) {
        const { base64Data } = parseDataUri(fileDataUri);
        const buffer = Buffer.from(base64Data, 'base64');
        const { value: text } = await mammoth.extractRawText({ buffer });

        const conversionResult = await convertToPdf({ text, fileName });
        finalFileDataUri = conversionResult.pdfDataUri;
        finalFileName = conversionResult.fileName;
      }
      
      // Upload the final file (either original PDF or converted PDF)
      const uploadResult = await uploadFile({
        fileDataUri: finalFileDataUri,
        fileName: finalFileName,
        path: `resumes/${userId}`,
      });

      return { downloadUrl: uploadResult.downloadUrl };

    } catch (e: any) {
      console.error("Flow Error: Failed to upload and process resume.", e);
      throw new Error(`Failed to process resume: ${e.message}`);
    }
  }
);
