import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/google';
import { db } from '@/lib/db/mongodb';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { courseId } = await params;
  let course = await db.getCourse(courseId);

  if (!course) {
    course = await db.getCourseBySubject(courseId);
  }

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }

  const progress = await db.getUserProgress(session.userId, course.subjectId);

  return NextResponse.json({
    course,
    progress: progress || {
      completedLessonIds: [],
      quizAttempts: {},
      overallScorePercentage: 0,
    },
  });
}
