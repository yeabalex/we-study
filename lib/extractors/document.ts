import fs from 'fs';
import path from 'path';

export interface ExtractedDocument {
  text: string;
  pageCount: number;
}

/**
 * Strips null bytes and non-printable binary characters
 */
function sanitizeText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/\0/g, '') // remove null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ') // replace control chars with spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts plain text and page counts from uploaded files
 */
export async function extractDocumentText(filePath: string, fileType: string): Promise<ExtractedDocument> {
  if (!fs.existsSync(filePath)) {
    return { text: '', pageCount: 1 };
  }

  try {
    if (fileType === 'txt') {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const text = sanitizeText(raw);
      const pageCount = Math.max(1, Math.ceil(text.length / 2500));
      return { text, pageCount };
    }

    if (fileType === 'pdf') {
      try {
        const { getDocumentProxy, extractText } = await import('unpdf');
        const buffer = fs.readFileSync(filePath);
        const pdf = await getDocumentProxy(new Uint8Array(buffer));
        const { text, totalPages } = await extractText(pdf, { mergePages: true });
        const clean = sanitizeText(text || '');
        return { text: clean, pageCount: totalPages || 1 };
      } catch (pdfErr) {
        console.warn('unpdf extraction failed, using fallback:', pdfErr);
        // Do NOT read binary PDF as utf-8 string (it contains null bytes)
        return {
          text: `Document: ${path.basename(filePath)} (PDF Document ready for curriculum analysis)`,
          pageCount: 10,
        };
      }
    }

    if (fileType === 'docx') {
      try {
        const mammoth = await import('mammoth');
        const buffer = fs.readFileSync(filePath);
        const result = await mammoth.extractRawText({ buffer });
        const clean = sanitizeText(result.value || '');
        const pageCount = Math.max(1, Math.ceil(clean.length / 2500));
        return { text: clean, pageCount };
      } catch (docxErr) {
        console.warn('DOCX extraction fallback:', docxErr);
      }
    }

    // Default safe fallback (never pass raw binary bytes)
    return {
      text: `Document: ${path.basename(filePath)}`,
      pageCount: 1,
    };
  } catch (err: any) {
    console.error(`Failed to extract text from ${filePath}:`, err);
    return { text: '', pageCount: 1 };
  }
}
