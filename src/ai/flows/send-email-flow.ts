'use server';
/**
 * @fileOverview A flow for sending emails using Nodemailer.
 */

import { ai } from '@/ai/genkit';
import {
  SendEmailInput,
  SendEmailInputSchema,
  SendEmailOutput,
  SendEmailOutputSchema,
} from './send-email-schema';
import * as nodemailer from 'nodemailer';

export async function sendEmail(input: SendEmailInput): Promise<SendEmailOutput> {
  return sendEmailFlow(input);
}

const sendEmailFlow = ai.defineFlow(
  {
    name: 'sendEmailFlow',
    inputSchema: SendEmailInputSchema,
    outputSchema: SendEmailOutputSchema,
  },
  async (input) => {
    // IMPORTANT: You must configure these environment variables.
    // For local development, add them to your .env file.
    // For production, set them as secrets in your hosting environment.
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
        console.error("SMTP environment variables not set. Cannot send email.");
        throw new Error('Email service is not configured on the server.');
    }

    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort, 10),
        secure: parseInt(smtpPort, 10) === 465, // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const mailOptions = {
        from: `Cambodia Hub <${smtpUser}>`,
        to: input.to,
        subject: input.subject,
        html: input.htmlBody,
      };

      const info = await transporter.sendMail(mailOptions);
      
      console.log('Email sent: %s', info.messageId);

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (e: any) {
      console.error('Flow Error: Failed to send email.', e);
      // Re-throw or handle the error as needed for the flow's output
      throw new Error(`Failed to send email: ${e.message}`);
    }
  }
);
