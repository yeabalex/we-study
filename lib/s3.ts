/**
 * S3 Storage Utilities for WeStudy
 * Standardized key generation, presigned URL generation, and S3 file operations.
 */

export interface S3KeyParams {
  userId: string;
  subjectId: string;
  sessionId: string;
  fileId: string;
  fileName: string;
}

/**
 * Sanitizes a filename for S3 object keys (removes unsafe characters, preserves extensions)
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_');
}

/**
 * Generates a clean, hierarchical S3 Key
 * Hierarchy: users/{userId}/subjects/{subjectId}/sessions/{sessionId}/files/{fileId}/{sanitizedFileName}
 *
 * Example:
 * users/user_123/subjects/sub_456/sessions/sess_789/files/file_01/Lecture_1_Metabolism.pdf
 */
export function buildS3Key({
  userId,
  subjectId,
  sessionId,
  fileId,
  fileName,
}: S3KeyParams): string {
  const safeName = sanitizeFileName(fileName);
  return `users/${userId}/subjects/${subjectId}/sessions/${sessionId}/files/${fileId}/${safeName}`;
}

/**
 * Extracts metadata parameters from an existing S3 Key
 */
export function parseS3Key(s3Key: string): S3KeyParams | null {
  const regex = /^users\/([^/]+)\/subjects\/([^/]+)\/sessions\/([^/]+)\/files\/([^/]+)\/(.+)$/;
  const match = s3Key.match(regex);
  if (!match) return null;

  return {
    userId: match[1],
    subjectId: match[2],
    sessionId: match[3],
    fileId: match[4],
    fileName: match[5],
  };
}

/**
 * S3 configuration environment variables
 */
export function getS3Config() {
  return {
    bucketName: process.env.AWS_S3_BUCKET || 'we-study-uploads',
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.AWS_S3_ENDPOINT, // Optional (for MinIO / Cloudflare R2)
    forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === 'true',
  };
}
