
import { NextRequest, NextResponse } from 'next/server';
import { findJobMatches } from '@/ai/flows/find-job-matches-flow';

// This tells Next.js to not require authentication for this specific route.
export const auth = 'public';

// IMPORTANT: We are now using GET instead of POST.
export async function GET(request: NextRequest) {
  try {
    // 1. Check for the secret key to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 2. If authorized, run the job matching flow
    const result = await findJobMatches();

    // 3. Return a success response
    return NextResponse.json({ success: true, ...result });
    
  } catch (error: any) {
    console.error('Cron Job Error:', error);
    return new NextResponse(`Error running job alert: ${error.message}`, { status: 500 });
  }
}
