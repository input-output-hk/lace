/**
 * Compares two version strings with `x.y.z` format
 *
 * @param v1 - The first version string
 * @param v2 - The second version string
 *
 * @return **1** if `v1` is greater than `v2`, **-1** if `v1` is less than `v2`, **0** if `v1` and `v2` are equal
 */
export const compareVersions = (v1: string, v2: string): number => {
  if (!v1 && v2) return -1;
  if (v1 && !v2) return 1;
  if (!v1 && !v2) return 0;

  const v1Arr = v1.split('.');
  const v2Arr = v2.split('.');

  for (const [i, element] of v1Arr.entries()) {
    if (Number.parseInt(element) > Number.parseInt(v2Arr[i])) {
      return 1;
    } else if (Number.parseInt(element) < Number.parseInt(v2Arr[i])) {
      return -1;
    }
  }

  return 0;
};

/**
 * Compares two version strings with x.y.z format and returns whether they are equal
 *
 * @return True if v1 and v2 are equal, false otherwise
 */
export const isVersionEqual = (v1: string, v2: string): boolean => compareVersions(v1, v2) === 0;

/**
 * Compares two version strings with x.y.z format and returns whether the first one is older than the second one
 *
 * @return True if v1 is older than v2, false otherwise
 */
export const isVersionOlderThan = (v1: string, v2: string): boolean => compareVersions(v1, v2) === -1;

/**
 * Compares two version strings with x.y.z format and returns whether the first one is older than or equal to the second one
 *
 * @returns True if v1 is older than or equal to v2, false otherwise
 */
export const isVersionOlderThanOrEqual = (v1: string, v2: string): boolean => compareVersions(v1, v2) !== 1;

/**
 * Compares two version strings with x.y.z format and returns whether the first one is newer than the second one
 *
 * @return True if v1 is newer than v2, false otherwise
 */
export const isVersionNewerThan = (v1: string, v2: string): boolean => compareVersions(v1, v2) === 1;

/**
 * Compares two version strings with x.y.z format and returns whether the first one is newer than or equal to the second one
 *
 * @return True if v1 is newer than or equal to v2, false otherwise
 */
export const isVersionNewerThanOrEqual = (v1: string, v2: string): boolean => compareVersions(v1, v2) !== -1;

/**
 * Retrieves a value from the browser's localStorage based on a given key with an optional reviver function.
 *
 * @return The retrieved value from the localStorage if it exists, otherwise the defaultValue.
 */
export const getItemFromLocalStorage = <T>(
  key: string,
  defaultValue?: T,
  reviver?: (key: string, value: unknown) => unknown
): T => {
  const item = window.localStorage.getItem(key);
  return item ? JSON.parse(item, reviver) : defaultValue;
};

/**
 * Saves a value to the browser's localStorage with the given key.
 */
export const setItemInLocalStorage = <T>(
  key: string,
  value: T,
  replacer?: (key: string, value: unknown) => unknown
): void => {
  const valueToStore = JSON.stringify(value, replacer);
  window.localStorage.setItem(key, valueToStore);
};

/**
 * Deletes an item from the browser's localStorage based on a given key.
 */
export const removeItemFromLocalStorage = (key: string): void => window.localStorage.removeItem(key);
