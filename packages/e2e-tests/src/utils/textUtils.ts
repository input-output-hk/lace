export const removeWhitespacesFromText = async (text: string): Promise<string> => text.replace(/[\s/]+/g, ' ').trim();
