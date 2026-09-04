// File processing — extracts text from common document formats and produces
// attachment objects. The actual AI analysis runs through the file-analysis
// provider; this module only handles ingestion + preview.

import type { FileAttachment } from '@/types';
import { uid, readFileAsText } from '@/utils';

const ACCEPTED_TYPES = [
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/json',
  'application/xml',
  'text/html',
  'text/javascript',
  'text/typescript',
  'application/javascript',
  'application/typescript',
  'text/css',
  'application/pdf',
];

const ACCEPTED_EXTENSIONS = [
  '.txt', '.csv', '.md', '.json', '.xml', '.html', '.js', '.ts', '.jsx', '.tsx', '.css', '.pdf',
];

export function isAcceptedFile(file: File): boolean {
  if (ACCEPTED_TYPES.includes(file.type)) return true;
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/** Build a FileAttachment from a File, generating a preview URL for images. */
export function createAttachment(file: File): FileAttachment {
  const previewUrl = isImageFile(file) ? URL.createObjectURL(file) : undefined;
  return {
    id: uid('file'),
    name: file.name,
    size: file.size,
    mimeType: file.type || 'application/octet-stream',
    previewUrl,
    status: 'uploading',
  };
}

/**
 * Extract text content from a file for analysis. For plain text formats we
 * read directly; for PDFs and other binary formats a real provider would OCR
 * or parse — here we return a placeholder so the boundary is clear.
 */
export async function extractText(file: File): Promise<string> {
  const type = file.type;
  if (
    type.startsWith('text/') ||
    type === 'application/json' ||
    type === 'application/xml' ||
    type === 'application/javascript' ||
    type === 'application/typescript'
  ) {
    return readFileAsText(file);
  }
  if (type === 'application/pdf') {
    return `[PDF document: ${file.name}. PDF text extraction requires a server-side parser or vision model.]`;
  }
  if (type.startsWith('image/')) {
    return `[Image file: ${file.name}. Image understanding requires a vision-capable model.]`;
  }
  return `[Unsupported file type: ${file.name}]`;
}
