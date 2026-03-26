export interface ProcessedText {
  cleaned: string;
  wordCount: number;
  hasContent: boolean;
}

export function processSourceText(rawText: string): ProcessedText {
  const cleaned = rawText
    .replace(/[\r\n]+/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();

  const wordCount = cleaned.split(/\s+/).filter(Boolean).length;
  const hasContent = wordCount >= 10;

  return {
    cleaned,
    wordCount,
    hasContent,
  };
}

export function validateSourceText(text: string): { valid: boolean; error?: string } {
  if (!text || text.trim().length === 0) {
    return { valid: false, error: 'Source text cannot be empty' };
  }
  
  const { wordCount } = processSourceText(text);
  if (wordCount < 10) {
    return { valid: false, error: 'Source text is too short (minimum 10 words)' };
  }
  
  if (wordCount > 10000) {
    return { valid: false, error: 'Source text is too long (maximum 10000 words)' };
  }
  
  return { valid: true };
}
