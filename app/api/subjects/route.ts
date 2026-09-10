import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
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

export async function DELETE(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    let subjectId = searchParams.get('id') || searchParams.get('subjectId');

    if (!subjectId) {
      const body = await req.json().catch(() => ({}));
      subjectId = body.subjectId || body.id;
    }

    if (!subjectId) {
      return NextResponse.json({ error: 'Subject ID is required' }, { status: 400 });
    }

    // 1. Delete from database (subjects, courses, user_progress, topic_chats)
    await db.deleteSubject(subjectId, session.userId);

    // 2. Delete physical files from disk
    const userSubjectDir = path.join(process.cwd(), 'uploads', 'users', session.userId, 'subjects', subjectId);
    if (fs.existsSync(userSubjectDir)) {
      fs.rmSync(userSubjectDir, { recursive: true, force: true });
    }

    return NextResponse.json({
      success: true,
      message: 'Subject and associated files permanently deleted',
      subjectId,
    });
  } catch (error: any) {
    console.error('Failed to delete subject:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete subject' }, { status: 500 });
  }
}
