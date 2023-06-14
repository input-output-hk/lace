export const removeWhitespacesFromText = async (text: string): Promise<string> =>
  // eslint-disable-next-line unicorn/prefer-string-replace-all
  text.replace(/[\s/]+/g, ' ').trim();
