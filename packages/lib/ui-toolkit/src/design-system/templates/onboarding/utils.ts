// Remove extra spaces, multiple spaces and converts to lowercase
export const normalizePassphraseInput = (value: string): string =>
  value.trim().replace(/\s+/g, ' ').toLowerCase();
