
import { NextResponse, type NextRequest } from 'next/server';
import { findJobMatches } from '@/ai/flows/find-job-matches-flow';

// This is the new, recommended approach for scheduled tasks.
// It is a standard API route that can be invoked by Google Cloud Scheduler.

// The name of the header that Cloud Scheduler will use to send the token.
const SCHEDULER_AUTH_HEADER = 'X-Cloud-Scheduler-Auth';

/**
 * This is a handler for HTTP POST requests. It is designed to be triggered
 * by Google Cloud Scheduler to run the daily job alert process.
 *
 * It provides two layers of security:
 * 1. The route itself is a long, unguessable URL.
 * 2. It requires a secret token to be passed in a specific header, which is
 *    configured in the Cloud Scheduler job.
 */
export async function POST(request: NextRequest) {
  // 1. Verify the secret token from the scheduler.
  const providedSecret = request.headers.get(SCHEDULER_AUTH_HEADER);
  
  // This secret should be stored securely as an environment variable.
  const expectedSecret = process.env.CLOUD_SCHEDULER_SECRET;

  if (!expectedSecret) {
    console.error("CRON_SECRET environment variable is not set on the server.");
    return NextResponse.json({ success: false, message: 'Internal server configuration error.' }, { status: 500 });
  }

  if (providedSecret !== expectedSecret) {
    // If the token is missing or incorrect, reject the request.
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  // 2. If authorized, run the job matching flow for all users.
  try {
    console.log("Cron job triggered: Starting job match analysis for all users.");
    const result = await findJobMatches({});
    console.log(`Cron job finished: Processed ${result.processedUsers} users, found ${result.matchedJobs} matches, sent ${result.emailsSent} emails.`);
    
    // Return a success response to the scheduler.
    return NextResponse.json({ success: true, ...result });

  } catch (error: any) {
    console.error("An error occurred during the scheduled job alert execution:", error);
    // Return an error response to the scheduler so it can be monitored.
    return NextResponse.json({ success: false, message: error.message || 'An internal error occurred.' }, { status: 500 });
  }
}
