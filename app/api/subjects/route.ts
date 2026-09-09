import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/google';
import { db } from '@/lib/db/mongodb';

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const subjects = await db.getSubjects(session.userId);
  return NextResponse.json({ subjects });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, subjectContext, preferences } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Subject title is required' }, { status: 400 });
    }

    const subjectId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newSubject = {
      _id: subjectId,
      userId: session.userId,
      title: title.trim(),
      status: 'draft',
      fileCount: 0,
      subjectContext: subjectContext || {
        targetExamType: 'final_exam',
        timeAvailable: '1_to_2_weeks',
        targetDepth: 'solid_understanding',
      },
      preferences: preferences || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.saveSubject(newSubject);
    return NextResponse.json({ success: true, subject: newSubject });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create subject' }, { status: 500 });
  }
}
