import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getCurrentUser } from '@/lib/auth/google';
import { db } from '@/lib/db/mongodb';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id: subjectId } = await params;

    if (!subjectId) {
      return NextResponse.json({ error: 'Subject ID is required' }, { status: 400 });
    }

    // 1. Delete from database
    await db.deleteSubject(subjectId, session.userId);

    // 2. Delete uploaded files from disk
    const userSubjectDir = path.join(process.cwd(), 'uploads', 'users', session.userId, 'subjects', subjectId);
    if (fs.existsSync(userSubjectDir)) {
      fs.rmSync(userSubjectDir, { recursive: true, force: true });
    }

    return NextResponse.json({
      success: true,
      message: 'Subject and files deleted successfully',
      subjectId,
    });
  } catch (error: any) {
    console.error('Failed to delete subject:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete subject' }, { status: 500 });
  }
}
