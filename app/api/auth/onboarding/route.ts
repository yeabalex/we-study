import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, setSessionCookie } from '@/lib/auth/google';
import { db } from '@/lib/db/mongodb';
import { OnboardingProfile } from '@/types/we-study';

export async function POST(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: OnboardingProfile = await req.json();

    const preferences: OnboardingProfile = {
      learningStyle: body.learningStyle || 'active_practice_quizzes',
      primaryGoal: body.primaryGoal || 'ace_exams',
      preferredPace: body.preferredPace || 'moderate',
      questionDensity: body.questionDensity || 'high',
      wantsFlashcards: body.wantsFlashcards !== false,
      studyReminderTime: body.studyReminderTime,
      completedAt: new Date(),
    };

    const updated = await db.upsertUser({
      _id: session.userId,
      email: session.email,
      name: session.name,
      image: session.image,
      preferences,
    });

    // Update cookie with hasCompletedOnboarding
    await setSessionCookie({
      ...session,
      hasCompletedOnboarding: true,
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save onboarding profile' }, { status: 500 });
  }
}
