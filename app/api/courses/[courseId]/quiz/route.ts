import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/google';
import { db } from '@/lib/db/mongodb';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { courseId } = await params;
  const course = await db.getCourse(courseId) || await db.getCourseBySubject(courseId);

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }

  try {
    const { lessonId, answers } = await req.json();

    if (!lessonId || !answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'Invalid quiz submission' }, { status: 400 });
    }

    // Find the quiz questions in the course document to grade server-side
    let targetLesson: any = null;
    for (const mod of course.modules) {
      for (const les of mod.lessons) {
        if (les.lessonId === lessonId) {
          targetLesson = les;
          break;
        }
      }
      if (targetLesson) break;
    }

    if (!targetLesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    let score = 0;
    const gradedAnswers = answers.map((ans: { questionId: string; selectedAnswer: string }) => {
      const q = targetLesson.quiz.find((item: any) => item.questionId === ans.questionId);
      const isCorrect = q ? q.correctAnswer === ans.selectedAnswer : false;
      if (isCorrect) score++;
      return {
        questionId: ans.questionId,
        selectedAnswer: ans.selectedAnswer,
        isCorrect,
      };
    });

    const attempt = await db.recordQuizAttempt(session.userId, course.subjectId, lessonId, {
      answers: gradedAnswers,
      score,
      maxScore: targetLesson.quiz.length,
    });

    return NextResponse.json({
      success: true,
      score,
      maxScore: targetLesson.quiz.length,
      percentage: Math.round((score / Math.max(targetLesson.quiz.length, 1)) * 100),
      attempt,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to submit quiz' }, { status: 500 });
  }
}
