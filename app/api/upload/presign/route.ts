import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getCurrentUser } from '@/lib/auth/google';
import { buildS3Key, getS3Config } from '@/lib/s3';

export async function POST(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { fileName, fileType, fileSizeBytes, subjectId, sessionId, fileId } = await req.json();

    if (!fileName || !subjectId || !sessionId || !fileId) {
      return NextResponse.json({ error: 'Missing required file upload parameters' }, { status: 400 });
    }

    const s3Key = buildS3Key({
      userId: session.userId,
      subjectId,
      sessionId,
      fileId,
      fileName,
    });

    const s3Config = getS3Config();
    const hasAwsCreds = !!process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_ACCESS_KEY_ID.startsWith('your_');

    if (hasAwsCreds) {
      const s3 = new S3Client({
        region: s3Config.region,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
        endpoint: s3Config.endpoint,
        forcePathStyle: s3Config.forcePathStyle,
      });

      const command = new PutObjectCommand({
        Bucket: s3Config.bucketName,
        Key: s3Key,
        ContentType: fileType || 'application/octet-stream',
      });

      const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

      return NextResponse.json({
        uploadMode: 's3_direct',
        uploadUrl: presignedUrl,
        s3Key,
        s3Bucket: s3Config.bucketName,
        publicUrl: `https://${s3Config.bucketName}.s3.${s3Config.region}.amazonaws.com/${s3Key}`,
      });
    }

    // Dev Fallback: Local upload endpoint for development
    return NextResponse.json({
      uploadMode: 'mock_local',
      uploadUrl: `/api/upload/mock?key=${encodeURIComponent(s3Key)}`,
      s3Key,
      s3Bucket: s3Config.bucketName,
      publicUrl: `/uploads/${s3Key}`,
    });
  } catch (error: any) {
    console.error('Presign URL generation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate upload URL' }, { status: 500 });
  }
}
