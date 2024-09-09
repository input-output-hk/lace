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
