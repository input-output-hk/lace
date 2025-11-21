/**
 * Shortens a string to a given length and adds "..." at the end.
 *
 * @param str The string to shorten.
 * @param length The desired length of the shortened string.
 * @returns A shortened version of the string followed by "...", or the original string if it is shorter than the specified length.
 */
export const shortenString = (str: string, length: number): string =>
  length > 0 && str?.length > length ? `${str.slice(0, length)}...` : str;

export const replaceWhitespace = (str: string, replacement = ''): string => str.replace(/\s/g, replacement);

const DEFAULT_MAX_LENGTH = 100;

/**
 * Sanitizes a string for PostHog analytics by converting to kebab-case,
 * preserving special characters, and limiting length.
 *
 * @param str - The string to sanitize
 * @param maxLength - Maximum length (default: 100)
 * @returns Sanitized kebab-case string with special characters preserved
 */
export const sanitizeForPostHog = (str: string | undefined | null, maxLength = DEFAULT_MAX_LENGTH): string => {
  if (!str) return '';

  return (
    str
      .toLowerCase()
      // Normalize unicode characters (é -> e, ñ -> n, etc.) but preserve special chars
      .normalize('NFD')
      .replaceAll(/[\u0300-\u036F]/g, '')
      // Replace spaces and underscores with hyphens
      .replaceAll(/[\s_]+/g, '-')
      // Remove only truly unsafe characters (control chars, but keep printable special chars)
      // eslint-disable-next-line no-control-regex
      .replaceAll(/[\u0000-\u001F\u007F]/g, '')
      // Remove multiple consecutive hyphens
      .replaceAll(/-+/g, '-')
      // Remove leading/trailing hyphens
      .replace(/^-+/, '')
      .replace(/-+$/, '')
      // Limit length
      .slice(0, maxLength)
      // Remove trailing hyphen if truncation created one
      .replace(/-+$/, '')
  );
};
