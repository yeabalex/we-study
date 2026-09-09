import { NextRequest, NextResponse } from 'next/server';
import { getGoogleTokens, getGoogleUserInfo, setSessionCookie } from '@/lib/auth/google';
import { db } from '@/lib/db/mongodb';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', appUrl));
  }

  try {
    const { access_token } = await getGoogleTokens(code);
    const userInfo = await getGoogleUserInfo(access_token);

    const userId = `usr_${userInfo.id}`;
    let user = await db.getUser(userId);

    const isNewUser = !user || !user.preferences?.completedAt;

    user = await db.upsertUser({
      _id: userId,
      email: userInfo.email,
      name: userInfo.name,
      image: userInfo.picture,
    });

    await setSessionCookie({
      userId: user._id,
      email: user.email,
      name: user.name,
      image: user.image,
      hasCompletedOnboarding: !!user.preferences?.completedAt,
    });

    // If new user, redirect to onboarding questionnaire, otherwise dashboard
    const redirectPath = isNewUser ? '/onboarding' : '/dashboard';
    return NextResponse.redirect(new URL(redirectPath, appUrl));
  } catch (error: any) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message || 'auth_failed')}`, appUrl));
  }
}
