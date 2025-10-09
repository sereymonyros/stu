"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendApplicationConfirmationEmail = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const sgMail = __importStar(require("@sendgrid/mail"));
const app_1 = require("firebase-admin/app");
const firestore_2 = require("firebase-admin/firestore");
const params_1 = require("firebase-functions/params");
// Define secrets and parameters. We will set the actual values in the Google Cloud console later.
const SENDGRID_API_KEY = (0, params_1.defineString)('SENDGRID_API_KEY');
const SENDGRID_FROM_EMAIL = (0, params_1.defineString)('SENDGRID_FROM_EMAIL');
(0, app_1.initializeApp)();
/**
 * Sends a confirmation email to the applicant and a notification to the recruiter
 * when a new job application is created.
 */
exports.sendApplicationConfirmationEmail = (0, firestore_1.onDocumentCreated)({
    document: 'jobs/{jobId}/applications/{applicationId}',
    secrets: ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL'],
}, async (event) => {
    // Set the API key for SendGrid
    sgMail.setApiKey(SENDGRID_API_KEY.value());
    const snapshot = event.data;
    if (!snapshot) {
        return;
    }
    const applicationData = snapshot.data();
    // Get the Job ID and Applicant ID from the document path
    const jobId = event.params.jobId;
    const applicantId = applicationData.applicantId;
    try {
        const db = (0, firestore_2.getFirestore)();
        // --- Get Applicant and Recruiter Information ---
        // 1. Fetch the applicant's user profile to get their email
        const applicantDoc = await db.collection('users').doc(applicantId).get();
        const applicant = applicantDoc.data();
        if (!applicant || !applicant.email) {
            return;
        }
        // 2. Fetch the job details to get the job title and recruiter ID
        const jobDoc = await db.collection('jobs').doc(jobId).get();
        const job = jobDoc.data();
        if (!job || !job.recruiterId) {
            return;
        }
        // 3. Fetch the recruiter's user profile to get their email
        const recruiterDoc = await db.collection('users').doc(job.recruiterId).get();
        const recruiter = recruiterDoc.data();
        if (!recruiter || !recruiter.email) {
            return;
        }
        // --- Send Emails ---
        // Email to the applicant
        const applicantMsg = {
            to: applicant.email,
            from: SENDGRID_FROM_EMAIL.value(),
            subject: `Your application for "${job.title}" has been received!`,
            text: `Hi ${applicant.displayName},\n\nThank you for applying for the position of "${job.title}" at ${job.companyName}. We have received your application and will be in touch soon.\n\nBest regards,\nThe Cambodia Hub Team`,
            html: `<p>Hi ${applicant.displayName},</p><p>Thank you for applying for the position of "<strong>${job.title}</strong>" at ${job.companyName}. We have received your application and will be in touch soon.</p><p>Best regards,<br>The Cambodia Hub Team</p>`,
        };
        // Email to the recruiter
        const recruiterMsg = {
            to: recruiter.email,
            from: SENDGRID_FROM_EMAIL.value(),
            subject: `New application for "${job.title}"`,
            text: `Hi ${recruiter.displayName},\n\nA new candidate, ${applicant.displayName}, has applied for the position of "${job.title}".\n\nYou can view their application in your dashboard.\n\nBest regards,\nThe Cambodia Hub Team`,
            html: `<p>Hi ${recruiter.displayName},</p><p>A new candidate, <strong>${applicant.displayName}</strong>, has applied for the position of "<strong>${job.title}</strong>".</p><p>You can view their application in your dashboard.</p><p>Best regards,<br>The Cambodia Hub Team</p>`,
        };
        // Send both emails
        await Promise.all([
            sgMail.send(applicantMsg),
            sgMail.send(recruiterMsg)
        ]);
    }
    catch (error) { }
});
//# sourceMappingURL=index.js.map