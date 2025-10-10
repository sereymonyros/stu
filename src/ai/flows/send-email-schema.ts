/**
 * @fileOverview Defines the input and output schemas for the email sending flow.
 */
import { z } from 'zod';

export const SendEmailInputSchema = z.object({
  to: z.string().email().describe('The recipient email address.'),
  subject: z.string().describe('The subject line of the email.'),
  htmlBody: z.string().describe('The HTML content of the email body.'),
});
export type SendEmailInput = z.infer<typeof SendEmailInputSchema>;

export const SendEmailOutputSchema = z.object({
  success: z.boolean().describe('Whether the email was sent successfully.'),
  messageId: z.string().optional().describe('The message ID of the sent email.'),
});
export type SendEmailOutput = z.infer<typeof SendEmailOutputSchema>;
