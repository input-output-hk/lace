import { fileURLToPath } from 'url';
import { dirname } from 'node:path';

const __filename = (path: string) => fileURLToPath(path);
export const getDirname = (path: string): string => dirname(__filename(path));
