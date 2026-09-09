import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/google';
import { db } from '@/lib/db/mongodb';

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  const user = await db.getUser(session.userId);
  return NextResponse.json({
    authenticated: true,
    user: {
      ...session,
      preferences: user?.preferences || null,
    },
  });
}
