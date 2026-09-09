import fs from 'fs';
import path from 'path';

export interface ExtractedDocument {
  text: string;
  pageCount: number;
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
      const text = fs.readFileSync(filePath, 'utf-8');
      const pageCount = Math.max(1, Math.ceil(text.length / 2500));
      return { text, pageCount };
    }

    if (fileType === 'pdf') {
      try {
        const { getDocumentProxy, extractText } = await import('unpdf');
        const buffer = fs.readFileSync(filePath);
        const pdf = await getDocumentProxy(buffer);
        const { text, totalPages } = await extractText(pdf, { mergePages: true });
        return { text: text || '', pageCount: totalPages || 1 };
      } catch (pdfErr) {
        console.warn('PDF extraction fallback:', pdfErr);
        const raw = fs.readFileSync(filePath, 'utf-8');
        return { text: raw.slice(0, 10000), pageCount: 10 };
      }
    }

    if (fileType === 'docx') {
      try {
        const mammoth = await import('mammoth');
        const buffer = fs.readFileSync(filePath);
        const result = await mammoth.extractRawText({ buffer });
        const text = result.value || '';
        const pageCount = Math.max(1, Math.ceil(text.length / 2500));
        return { text, pageCount };
      } catch (docxErr) {
        console.warn('DOCX extraction fallback:', docxErr);
      }
    }

    // Default fallback
    const raw = fs.readFileSync(filePath, 'utf-8');
    return { text: raw.slice(0, 15000), pageCount: 1 };
  } catch (err: any) {
    console.error(`Failed to extract text from ${filePath}:`, err);
    return { text: '', pageCount: 1 };
  }
}
