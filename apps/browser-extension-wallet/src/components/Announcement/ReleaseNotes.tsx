const convertVersionFormat = (version: string) => version.replace(/\./g, '_');

export const fetchNotes = async (version: string): Promise<string> => {
  const notes = await import(/* webpackMode: "eager" */ `../../release-notes/${convertVersionFormat(version)}.tsx`);

  return notes.default;
};
