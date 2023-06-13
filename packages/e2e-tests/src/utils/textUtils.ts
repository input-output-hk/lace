export const removeWhitespacesFromText = async (text: string): Promise<string> =>
  text.replaceAll(/[\s/]+/g, ' ').trim();
