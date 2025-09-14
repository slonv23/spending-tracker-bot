export function parseNumber(input: string): number | null {
  if (!input) return null;

  // Remove spaces
  const cleaned = input.trim();

  // Regex to match valid number formats with ',' or '.'
  const numberRegex = /^-?\d+([.,]\d+)?$/;

  if (!numberRegex.test(cleaned)) {
    return null;
  }

  // Normalize: replace comma with dot
  const normalized = cleaned.replace(',', '.');

  const parsed = Number(normalized);

  // Check for NaN
  if (isNaN(parsed)) {
    return null;
  }

  return parsed;
}
