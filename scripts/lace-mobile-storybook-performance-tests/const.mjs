import path from 'path';
import { fileURLToPath } from 'url';

export const TEST_PORT = 6008; // Different port to avoid conflicts
export const TEST_RUNS = 2;

export const MONOREPO_ROOT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../',
);
export const APPS_ROOT = path.join(MONOREPO_ROOT, 'apps');
export const STORYBOOK_APP = 'lace-mobile-storybook';
export const BUILD_OUTPUT_DIR = 'storybook-static-test';
export const STATIC_SERVER_BUILD_PATH = path.join(
  APPS_ROOT,
  STORYBOOK_APP,
  BUILD_OUTPUT_DIR,
);
