/** Normalize a phone number to a consistent key (digits + leading +). */
export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^0-9]/g, "");
  return hasPlus ? `+${digits}` : digits;
}

/**
 * Split text into overlapping chunks suitable for embedding.
 * Approximate token sizing via characters (~4 chars/token).
 */
export function chunkText(
  text: string,
  opts: { maxChars?: number; overlapChars?: number } = {},
): string[] {
  const maxChars = opts.maxChars ?? 1600;
  const overlapChars = opts.overlapChars ?? 200;
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxChars) return clean.length ? [clean] : [];

  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + maxChars, clean.length);
    chunks.push(clean.slice(start, end));
    if (end === clean.length) break;
    start = end - overlapChars;
  }
  return chunks;
}

/** Format the pgvector literal from a number array: '[1,2,3]'. */
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
