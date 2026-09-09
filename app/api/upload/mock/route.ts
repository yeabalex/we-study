import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function PUT(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key') || `file_${Date.now()}`;
  const buffer = Buffer.from(await req.arrayBuffer());

  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Sanitize key for local filesystem
  const safePath = path.join(uploadsDir, key.replace(/\//g, '_'));
  fs.writeFileSync(safePath, buffer);

  return NextResponse.json({
    success: true,
    key,
    localPath: safePath,
    message: 'File saved to local storage successfully',
  });
}

export async function POST(req: NextRequest) {
  return PUT(req);
}
