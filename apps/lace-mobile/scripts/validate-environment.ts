#!/usr/bin/env tsx
import * as fs from 'fs';
import * as path from 'path';

// Ensure we are running from apps/lace-mobile
const cwd = process.cwd();
const environmentPath = path.resolve(cwd, '.env.production');

if (!fs.existsSync(environmentPath)) {
  // eslint-disable-next-line no-console
  console.error('❌ .env.production file not found at:', environmentPath);
  // eslint-disable-next-line no-console
  console.error(
    '   CI must create it from secrets before running this script.',
  );
  process.exit(1);
}

// Load .env.production into process.env (KEY=VALUE lines, ignore comments/blank)
const lines = fs
  .readFileSync(environmentPath, 'utf8')
  .split(/\r?\n/)
  .filter(l => l.trim() && !l.trim().startsWith('#'));

for (const line of lines) {
  const index = line.indexOf('=');
  if (index > 0) {
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    process.env[key] = value;
  }
}

const main = async (): Promise<void> => {
  // Import AFTER env vars are loaded so config can validate them
  const { appConfig, configValidationError } = await import(
    '../src/app/util/config'
  );

  if (appConfig === null) {
    // eslint-disable-next-line no-console
    console.error('❌ Environment validation failed.');
    if (configValidationError) {
      // eslint-disable-next-line no-console
      console.error(configValidationError);
    }
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.log('✅ Environment configuration is valid.');
  process.exit(0);
};

void main().catch(error => {
  // eslint-disable-next-line no-console
  console.error('❌ Unexpected error during environment validation:', error);
  process.exit(1);
});
