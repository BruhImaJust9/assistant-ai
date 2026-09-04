// Mock file analysis — reads the file text and returns a short summary. Real
// providers implement the same `FileAnalysisProvider` interface.

import type { FileAnalysisProvider } from '@/ai/types';
import { sleep } from '@/utils';

export const mockFileAnalysisProvider: FileAnalysisProvider = {
  id: 'mock-file-analysis',
  async analyze(req): Promise<string> {
    await sleep(600 + Math.random() * 400);
    const text = req.file.extractedText ?? '';
    const words = text.split(/\s+/).filter(Boolean).length;
    const lines = text.split(/\n/).length;
    return `I analyzed **${req.file.name}** (${words} words, ${lines} lines).

Regarding "${req.prompt}": the file contains ${words > 0 ? 'readable text content' : 'no extractable text'}. ${
      words > 0
        ? 'The content appears well-structured. Ask me specific questions about it and I can pull out details, summarize sections, or reformat the data.'
        : 'This may be a binary or scanned file — for images and PDFs, an OCR or vision-capable model would be needed to inspect the contents.'
    }`;
  },
};
