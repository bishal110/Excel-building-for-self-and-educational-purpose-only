/** Count words and characters in a plain-text string. */
export interface TextStats {
  words: number;
  characters: number;
}

export function textStats(text: string): TextStats {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  const words = trimmed === '' ? 0 : trimmed.split(' ').length;
  return { words, characters: text.replace(/\n/g, '').length };
}
