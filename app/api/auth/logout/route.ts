import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth/google';

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ success: true, message: 'Logged out successfully' });
}
