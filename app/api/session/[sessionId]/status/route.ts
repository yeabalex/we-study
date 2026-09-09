import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/google';
import { sessionCache } from '@/lib/db/redis';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sessionId } = await params;
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId parameter' }, { status: 400 });
  }

  const state = await sessionCache.getSessionState(sessionId);

  if (!state) {
    return NextResponse.json({
      sessionId,
      stage: 'uploading',
      progressPercentage: 0,
      currentStepMessage: 'Initializing Antigravity session...',
      processedFilesCount: 0,
      totalFilesCount: 0,
      processedRangesCount: 0,
      totalRangesCount: 0,
    });
  }

  return NextResponse.json(state);
}
