import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getCurrentUser } from '@/lib/auth/google';
import { sanitizeFileName } from '@/lib/s3';

export async function POST(req: NextRequest) {
  const session = await getCurrentUser();
  const userId = session?.userId || 'usr_local_student';

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const subjectId = (formData.get('subjectId') as string) || `sub_${Date.now()}`;
    const sessionId = (formData.get('sessionId') as string) || `sess_${Date.now()}`;
    const fileId = (formData.get('fileId') as string) || `file_${Date.now()}`;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const safeName = sanitizeFileName(file.name);
    const relativeDir = path.join('uploads', 'users', userId, 'subjects', subjectId, 'sessions', sessionId, 'files', fileId);
    const targetDir = path.join(process.cwd(), relativeDir);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const fullPath = path.join(targetDir, safeName);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(fullPath, buffer);

    return NextResponse.json({
      success: true,
      fileId,
      fileName: file.name,
      fileSizeBytes: file.size,
      mimeType: file.type,
      localPath: fullPath,
      relativePath: path.join(relativeDir, safeName),
    });
  } catch (error: any) {
    console.error('Local file upload failed:', error);
    return NextResponse.json({ error: error.message || 'Failed to save local file' }, { status: 500 });
  }
}
