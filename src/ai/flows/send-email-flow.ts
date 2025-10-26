
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
    // This flow is now configured for SendGrid.
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    const sendgridFromEmail = process.env.SENDGRID_FROM_EMAIL;

    if (!sendgridApiKey || !sendgridFromEmail) {
        const errorMsg = "SendGrid environment variables not set. Cannot send email. Check SENDGRID_API_KEY and SENDGRID_FROM_EMAIL.";
        console.error(errorMsg);
        throw new Error('Email service is not configured on the server.');
    }

    try {
      // Configure Nodemailer for SendGrid
      const transporter = nodemailer.createTransport({
        host: "smtp.sendgrid.net",
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: "apikey", // This is always "apikey" for SendGrid API keys
          pass: sendgridApiKey,
        },
      });

      const mailOptions = {
        from: `Cambodia Hub <${sendgridFromEmail}>`, // Use the verified sender email
        to: input.to,
        subject: input.subject,
        html: input.htmlBody,
        replyTo: input.replyTo || sendgridFromEmail, // Add a reply-to for user convenience
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
