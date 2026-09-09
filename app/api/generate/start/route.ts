import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/google';
import { runGenerationPipeline, StartPipelineJobParams } from '@/lib/pipeline/worker';
import { db } from '@/lib/db/mongodb';

export async function POST(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { subjectId, subjectTitle, files, preferences } = body;

    if (!subjectId || !files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: 'Invalid generation parameters' }, { status: 400 });
    }

    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Save subject in draft/processing status
    await db.saveSubject({
      _id: subjectId,
      userId: session.userId,
      title: subjectTitle,
      fileCount: files.length,
      status: 'processing',
      preferences,
      updatedAt: new Date(),
    });

    const jobParams: StartPipelineJobParams = {
      sessionId,
      userId: session.userId,
      subjectId,
      subjectTitle: subjectTitle || 'Study Subject',
      files,
      preferences: preferences || {
        learningStyle: 'active_practice_quizzes',
        primaryGoal: 'ace_exams',
        preferredPace: 'moderate',
        questionDensity: 'high',
        wantsFlashcards: true,
      },
    };

    // Trigger pipeline asynchronously (worker updates Redis state for polling)
    runGenerationPipeline(jobParams).catch((err) => {
      console.error('Asynchronous Antigravity pipeline error:', err);
    });

    return NextResponse.json({
      success: true,
      sessionId,
      subjectId,
      message: 'Antigravity generation pipeline started',
    });
  } catch (error: any) {
    console.error('Failed to start generation pipeline:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
