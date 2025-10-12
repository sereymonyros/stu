
import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server'
import { findJobMatches } from '@/ai/flows/find-job-matches-flow';

// This export is necessary to exempt this route from the development environment's
// default authentication, allowing the cron job to call it.
export const auth = 'public';

/**
 * This is a secure API endpoint designed to be triggered by a scheduled cron job.
 * It will trigger the flow to find job matches and send email alerts.
 */
export async function GET(request: NextRequest) {
  // 1. Secure the endpoint
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // 2. Trigger the job matching flow (non-blocking)
    // We don't await this so the cron service gets a fast success response.
    // The actual work happens in the background.
    findJobMatches(); 
    
    console.log("Job alert flow triggered successfully.");

    // 3. Return an immediate success response
    return NextResponse.json({ success: true, message: 'Job alert flow successfully triggered.' });

  } catch (error: any) {
    console.error("Error triggering findJobMatches flow:", error);
    // Even if triggering fails, return an error response to the cron service
    return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 });
  }
}
