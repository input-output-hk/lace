export type FieldNameToLocator = [string, string][];
export type FieldNameToCallback = [string, any];

export const fieldNameToLocator = (
  source: FieldNameToLocator | FieldNameToCallback,
  fieldName: string
): Promise<string | any> => {
  // eslint-disable-next-line eqeqeq
  const result = source.filter((s) => s[0] == fieldName);
  if (result.length <= 0) {
    return Promise.reject(`Locator not found for name ${fieldName}`);
  }
  return Promise.resolve(result[0][1]);
};
