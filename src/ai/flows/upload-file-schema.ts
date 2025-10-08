/**
 * @fileOverview Defines the input and output schemas for the file upload flow.
 */
import { z } from 'zod';

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
