import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import prettier from 'prettier';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');

const inputFile = path.join(
  packageRoot,
  'scripts',
  'cip30-injection.webview.js',
);
const outputFile = path.join(
  packageRoot,
  'src',
  'mobile',
  'injection',
  'cip30-injection.webview.generated.ts',
);

const banner = `/**
 * AUTO-GENERATED FILE — DO NOT EDIT.
 *
 * Source: scripts/cip30-injection.webview.js
 * Generator: scripts/generate-cip30-webview-source.mjs
 * Regenerate with: npm run generate:cip30-webview
 */
`;

// Build the generated file's exact contents. Run through Prettier with the repo
// config so the output is byte-identical to what `npm run fix` would produce —
// otherwise regenerating always leaves a formatting diff and no drift check can
// be stable.
const buildGeneratedSource = () => {
  const source = fs.readFileSync(inputFile, 'utf8');
  const raw = `${banner}\nexport const CIP30_WEBVIEW_RUNTIME_SOURCE: string = ${JSON.stringify(
    source,
  )};\n`;
  const prettierConfig = prettier.resolveConfig.sync(outputFile) ?? {};
  return prettier.format(raw, { ...prettierConfig, filepath: outputFile });
};

const relativeOutput = path.relative(packageRoot, outputFile);
const generated = buildGeneratedSource();

// `--check` mode (used by the pre-commit drift guard): fail instead of writing
// when the committed file is stale, so a source edit without a regenerate cannot
// silently ship an out-of-date runtime.
if (process.argv.includes('--check')) {
  const current = fs.existsSync(outputFile)
    ? fs.readFileSync(outputFile, 'utf8')
    : '';
  if (current !== generated) {
    // eslint-disable-next-line no-console
    console.error(
      `[cip30] ${relativeOutput} is out of date. Run \`npm run generate:cip30-webview\` and commit the result.`,
    );
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.log(`[cip30] ${relativeOutput} is up to date.`);
} else {
  fs.writeFileSync(outputFile, generated, 'utf8');
  // eslint-disable-next-line no-console
  console.log(
    `[cip30] Generated ${relativeOutput} from ${path.relative(
      packageRoot,
      inputFile,
    )}`,
  );
}
