import crypto from 'crypto';

export const removeWhitespacesFromText = async (text: string): Promise<string> => text.replace(/[\s/]+/g, ' ').trim();

export const generateRandomString = async (length: number): Promise<string> =>
  crypto
    .randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);

export type JSONValue = string | number | boolean | null | undefined | JSONValue[] | { [key: string]: JSONValue };

interface Match {
  path: string; // Path to the matched key or value
  key?: string; // The key where the match occurred
  value?: JSONValue; // The value where the match occurred
}

/**
 * Recursively searches for a specific needle in the keys or values of a JSON structure.
 * @param data - The JSON structure to search.
 * @param searchString - The string to search for.
 * @param currentPath - (Internal) The current path in the structure during recursion.
 * @returns An array of matches, including the path and matched key/value.
 */
export const findNeedleInJSONKeyOrValue = (
  data: JSONValue,
  searchString: string,
  currentPath: string[] = []
): Match[] => {
  const matches: Match[] = [];

  const traverse = (value: JSONValue, path: string[]) => {
    if (value && typeof value === 'object') {
      if (Array.isArray(value)) {
        // Handle arrays
        value.forEach((item, index) => {
          traverse(item, [...path, index.toString()]);
        });
      } else {
        // Handle objects
        Object.entries(value).forEach(([key, val]) => {
          const keyLower = key.toLowerCase();
          if (keyLower.includes(searchString)) {
            matches.push({ path: [...path, key].join('.'), key });
          }
          if (typeof val === 'string' && val.toLowerCase().includes(searchString)) {
            matches.push({
              path: [...path, key].join('.'),
              value: val
            });
          }
          traverse(val, [...path, key]);
        });
      }
    }
  };

  traverse(data, currentPath);
  return matches;
};
