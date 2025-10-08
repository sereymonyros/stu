/**
 * @fileOverview Defines the input and output schemas for the file upload flow.
 */
import { z } from 'zod';

export const UploadFileInputSchema = z.object({
  fileDataUri: z.string().describe("The file content as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  fileName: z.string().describe('The name of the file.'),
  path: z.string().describe('The path in Firebase Storage to upload the file to.'),
});
export type UploadFileInput = z.infer<typeof UploadFileInputSchema>;

export const UploadFileOutputSchema = z.object({
  downloadUrl: z.string().describe('The public download URL of the uploaded file.'),
});
export type UploadFileOutput = z.infer<typeof UploadFileOutputSchema>;
