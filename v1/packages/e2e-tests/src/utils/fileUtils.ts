import fs from 'fs';
import path from 'path';

export const readFromFile = (directory: string, pathToFile: string): string =>
  String(fs.readFileSync(path.resolve(directory, pathToFile)));

// To be used in a future e.g. to update files with legal notes
export const writeToFile = (directory: string, pathToFile: string, content: string): void => {
  fs.writeFileSync(path.resolve(directory, pathToFile), content);
};
