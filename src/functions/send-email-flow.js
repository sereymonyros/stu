'use strict';
/**
 * @fileOverview A flow for sending emails using Nodemailer.
 */
const nodemailer = require('nodemailer');

async function sendEmail(input) {
    const smtpHost = process.env.NEXT_PUBLIC_SMTP_HOST;
    const smtpPort = process.env.NEXT_PUBLIC_SMTP_PORT;
    const smtpUser = process.env.NEXT_PUBLIC_SMTP_USER;
    const smtpPass = process.env.NEXT_PUBLIC_SMTP_PASS;
    const senderEmail = process.env.NEXT_PUBLIC_SENDER_EMAIL;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !senderEmail) {
        console.error("SMTP environment variables not set.");
        throw new Error('Email service is not configured on the server.');
    }

    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort, 10),
        secure: parseInt(smtpPort, 10) === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const mailOptions = {
        from: `Cambodia Hub <${senderEmail}>`,
        to: input.to,
        subject: input.subject,
        html: input.htmlBody,
        replyTo: input.replyTo || senderEmail,
      };

      const info = await transporter.sendMail(mailOptions);
      
      console.log('Email sent: %s', info.messageId);

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (e) {
      console.error('Flow Error: Failed to send email.', e);
      throw new Error(`Failed to send email: ${e.message}`);
    }
}

module.exports = { sendEmail };
