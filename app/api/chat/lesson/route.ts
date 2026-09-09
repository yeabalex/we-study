import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/google';
import { db } from '@/lib/db/mongodb';
import { executeTopicChatWithAntigravity } from '@/lib/ai/antigravity';

export async function GET(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get('subjectId');
  const lessonId = searchParams.get('lessonId');

  if (!subjectId || !lessonId) {
    return NextResponse.json({ error: 'Missing subjectId or lessonId' }, { status: 400 });
  }

  const chat = await db.getTopicChat(subjectId, lessonId);
  return NextResponse.json({ chat: chat || { messages: [] } });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { subjectId, moduleId, lessonId, rangeId, topicTitle, markdownNotes, message } = await req.json();

    if (!subjectId || !lessonId || !message || !message.trim()) {
      return NextResponse.json({ error: 'Missing required chat parameters' }, { status: 400 });
    }

    // Save student user message
    await db.saveTopicChatMessage(subjectId, moduleId, lessonId, rangeId, session.userId, {
      role: 'user',
      content: message.trim(),
    });

    // Get past chat history for context
    const existingChat = await db.getTopicChat(subjectId, lessonId);
    const history = (existingChat?.messages || []).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Run Antigravity AI Topic Tutor
    const reply = await executeTopicChatWithAntigravity({
      topicTitle: topicTitle || 'Study Lesson',
      markdownNotes: markdownNotes || '',
      userMessage: message.trim(),
      chatHistory: history,
    });

    // Save assistant response message
    const tutorMsg = await db.saveTopicChatMessage(subjectId, moduleId, lessonId, rangeId, session.userId, {
      role: 'assistant',
      content: reply,
    });

    return NextResponse.json({
      success: true,
      message: tutorMsg,
    });
  } catch (error: any) {
    console.error('Topic chat error:', error);
    return NextResponse.json({ error: error.message || 'Chat tutor error' }, { status: 500 });
  }
}
