// eslint-disable-next-line unicorn/prefer-string-replace-all
const convertVersionFormat = (version: string) => version.replace('.', '_');

export const fetchNotes = async (version: string): Promise<string> => {
  const notes = await import(/* webpackMode: "eager" */ `../../release-notes/${convertVersionFormat(version)}.tsx`);

  return notes.default;
};
