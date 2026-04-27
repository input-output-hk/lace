import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');

const inputFile = path.join(
  packageRoot,
  'src',
  'injection',
  'cip30-injection.webview.js',
);
const outputFile = path.join(
  packageRoot,
  'src',
  'injection',
  'cip30-injection.webview.generated.ts',
);

const source = fs.readFileSync(inputFile, 'utf8');

const banner = `/**
 * AUTO-GENERATED FILE — DO NOT EDIT.
 *
 * Source: src/injection/cip30-injection.webview.js
 * Generator: scripts/generate-cip30-webview-source.mjs
 */
`;

const out = `${banner}

export const CIP30_WEBVIEW_RUNTIME_SOURCE: string = ${JSON.stringify(source)};
`;

fs.writeFileSync(outputFile, out, 'utf8');
// eslint-disable-next-line no-console
console.log(
  `[cip30] Generated ${path.relative(
    packageRoot,
    outputFile,
  )} from ${path.relative(packageRoot, inputFile)}`,
);
