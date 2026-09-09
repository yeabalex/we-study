import { NextResponse } from 'next/server';
import { getGoogleOAuthURL } from '@/lib/auth/google';

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || clientId.startsWith('mock_')) {
    // If Google OAuth credentials aren't configured yet, redirect to demo login
    return NextResponse.redirect(new URL('/api/auth/demo', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  }

  const url = getGoogleOAuthURL();
  return NextResponse.redirect(url);
}
