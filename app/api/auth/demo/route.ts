import { NextRequest, NextResponse } from 'next/server';
import { setSessionCookie } from '@/lib/auth/google';
import { db } from '@/lib/db/mongodb';

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const userId = 'usr_demo_student';

  const user = await db.upsertUser({
    _id: userId,
    email: 'demo.student@westudy.app',
    name: 'Alex Rivera',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  });

  const hasOnboarded = !!user.preferences?.completedAt;

  await setSessionCookie({
    userId: user._id,
    email: user.email,
    name: user.name,
    image: user.image,
    hasCompletedOnboarding: hasOnboarded,
  });

  const nextPath = hasOnboarded ? '/dashboard' : '/onboarding';
  return NextResponse.redirect(new URL(nextPath, appUrl));
}
