import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import dotenvDefaults from 'dotenv-defaults';

function prepareExpoEnv(webpackDir: string, outputDir: string): void {
  const defaultsPath = path.join(webpackDir, '.env.defaults');
  const overridesPath = path.join(webpackDir, '.env');
  const examplePath = path.join(webpackDir, '.env.example');
  const outputPath = path.join(outputDir, '.env');

  console.log(` Webpack directory: ${webpackDir}`);
  console.log(`📁 Output directory: ${outputDir}`);
  console.log('');

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    console.log(`📁 Creating output directory: ${outputDir}`);
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Check if files exist
  if (!fs.existsSync(defaultsPath)) {
    console.warn(`⚠️  Defaults file not found: ${defaultsPath}`);
  }
  if (!fs.existsSync(overridesPath)) {
    console.warn(`⚠️  Overrides file not found: ${overridesPath}`);
  }

  // Use dotenv-defaults to merge the files
  console.log('🔄 Merging environment files...');
  const mergedEnv = dotenvDefaults.config({
    path: overridesPath,
    defaults: defaultsPath,
    encoding: 'utf8',
  });

  if (mergedEnv.error) {
    console.error('❌ Error loading environment files:', mergedEnv.error);
    process.exit(1);
  }

  // Transform variables to add EXPO_PUBLIC_ prefix
  console.log('✏️  Adding EXPO_PUBLIC_ prefix...');
  const expoEnvLines: string[] = [
    '# ========================================',
    '# AUTO-GENERATED FILE - DO NOT EDIT MANUALLY',
    '# ========================================',
    '#',
    '# This file is generated automatically before each build.',
    '# To modify environment variables, update:',
    `# ${overridesPath}`,
    '#',
    '# All variables are prefixed with EXPO_PUBLIC_ for Expo compatibility.',
    '#',
    '# Generated on: ' + new Date().toISOString(),
    '# ========================================',
    '',
  ];

  const parsed = mergedEnv.parsed || {};

  // Shell environment variables take precedence over file values, but only for
  // keys declared in .env.example or .env.defaults — prevents arbitrary system
  // vars (PATH, HOME, …) from leaking into the output.
  const knownKeys = new Set([
    ...Object.keys(
      fs.existsSync(examplePath)
        ? dotenv.parse(fs.readFileSync(examplePath))
        : {},
    ),
    ...Object.keys(
      fs.existsSync(defaultsPath)
        ? dotenv.parse(fs.readFileSync(defaultsPath))
        : {},
    ),
  ]);

  for (const key of knownKeys) {
    if (process.env[key] !== undefined) {
      parsed[key] = process.env[key] as string;
    }
  }

  // Add all environment variables with EXPO_PUBLIC_ prefix
  for (const [key, value] of Object.entries(parsed)) {
    const expoKey = key.startsWith('EXPO_PUBLIC_') ? key : `EXPO_PUBLIC_${key}`;
    expoEnvLines.push(`${expoKey}=${value}`);
  }

  // Write the output file
  const expoContent = expoEnvLines.join('\n') + '\n';
  console.log(`💾 Writing to: ${outputPath}`);
  fs.writeFileSync(outputPath, expoContent);

  console.log('');
  console.log('✅ Expo environment file generated successfully!');
  console.log(
    `📊 Total variables: ${Object.keys(mergedEnv.parsed || {}).length}`,
  );
  console.log(`📁 Output file: ${outputPath}`);
}

function main() {
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    console.error('Usage: tsx prepare-expo-env.ts <webpack-dir> <output-dir>');
    console.error('');
    console.error('Example:');
    console.error(
      '  tsx prepare-expo-env.ts apps/lace-extension/webpack apps/lace-extension',
    );
    process.exit(1);
  }

  const [webpackDir, outputDir] = args;
  prepareExpoEnv(webpackDir, outputDir);
}

if (require.main === module) {
  main();
}
