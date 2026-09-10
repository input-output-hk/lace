/**
 * Runs a command with env vars loaded from a dotenv file, taking precedence
 * over the current shell env. Used by the `build:e2e` legs to point every
 * backend URL at the local mock backend (webpack/.env.e2e) WITHOUT forking
 * the .env.defaults machinery:
 * - webpack legs pick the vars up via dotenv-webpack `systemvars: true`
 * - the prepare-expo-env leg gives shell env precedence for keys declared in
 *   webpack/.env.defaults / .env.example
 *
 * Usage: tsx scripts/run-with-env.ts <env-file> <command> [args...]
 */
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';

import dotenv from 'dotenv';

const [envFile, command, ...args] = process.argv.slice(2);

if (!envFile || !command) {
  console.error(
    'Usage: tsx scripts/run-with-env.ts <env-file> <command> [args...]',
  );
  process.exit(1);
}

const parsed = dotenv.parse(fs.readFileSync(envFile));
const result = spawnSync(command, args, {
  stdio: 'inherit',
  env: { ...process.env, ...parsed },
});

// eslint-disable-next-line unicorn/no-process-exit
process.exit(result.status ?? 1);
