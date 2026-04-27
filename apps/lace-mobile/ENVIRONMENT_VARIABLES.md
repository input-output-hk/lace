# Environment Variables Guide

This guide explains how to add and validate environment variables for the Lace Mobile app.

## Quick Reference: Complete Steps

1. Add to `src/app/util/config.ts`
   - Add the variable to `cleanEnv` inputs (reads from `process.env.EXPO_PUBLIC_*`)
   - Add a validator (`str`, `num`, etc.) to `cleanEnv` schema
   - Map the validated value into the returned `appConfig`
2. Add to `.env.example` with an example value
3. Add to local env files: `.env.development` and `.env.local`
4. CI/Production: Ensure `.env.production` includes the variable
5. Validate locally or in CI using the preflight script

> Important: All Expo-visible variables must be prefixed with `EXPO_PUBLIC_`.

## Overview

Validation is implemented directly in `src/app/util/config.ts` using [envalid](https://github.com/af/envalid) `cleanEnv`. This file is the single source of truth for environment variables and for the `appConfig` mapping used at runtime.

## File Structure

- `src/app/util/config.ts` — All env validation and `appConfig` mapping
- `scripts/validate-environment.ts` — Preflight validator (used locally and by CI)
- `ci/mobile/01_check_env.sh` — Runs the preflight validator before builds
- `.env.example` — Example file with all variables

## Adding a New Environment Variable

### 1) Update `config.ts`

Add the variable in BOTH the input and the schema of `cleanEnv`:

```ts
const validatedEnvironment = cleanEnv(
  {
    // ...existing
    YOUR_NEW_VARIABLE: process.env.EXPO_PUBLIC_YOUR_NEW_VARIABLE as string,
  },
  {
    // ...existing
    YOUR_NEW_VARIABLE: str({ desc: 'What this variable does' }),
  },
);

return {
  // ...existing
  yourNewConfigKey: validatedEnvironment.YOUR_NEW_VARIABLE,
};
```

### 2) Update `.env.example`

```bash
# Description of what this does
EXPO_PUBLIC_YOUR_NEW_VARIABLE=example-value
```

### 3) Update Local Environment Files

```bash
# .env.development or .env.local
EXPO_PUBLIC_YOUR_NEW_VARIABLE=your-local-value
```

### 4) CI/Production

- Ensure `.env.production` contains the variable
- CI runs a preflight validation and fails fast if variables are missing (see below)

## Preflight Validation (Local & CI)

- Local (from `apps/lace-mobile`):

```bash
npm run validate-env
# or
npx tsx scripts/validate-environment.ts
```

- CI runs `ci/mobile/01_check_env.sh`, which:
  - Ensures `apps/lace-mobile/.env.production` exists
  - Runs `scripts/validate-environment.ts` with `NODE_ENV=production`
  - Fails the pipeline if validation fails

## Required vs Optional Variables

- Required: omit `default` and validation fails if missing
- Optional: provide a `default` in the validator

```ts
// Required
REQUIRED_VAR: str({ desc: 'This must be provided' }),

// Optional
OPTIONAL_VAR: str({
  desc: 'This has a default',
  default: 'default-value',
}),
```

## Best Practices

1. Use clear, descriptive names
2. Provide helpful `desc` values for validators
3. Keep all validation centralized in `config.ts`
4. Document defaults in `.env.example`
5. Validate locally before committing (run the preflight script)

## Environment Files

- `.env.local` — Local overrides (gitignored)
- `.env.development` — Local development defaults
- `.env.example` — Example values for all variables
- `.env.production` — CI/production values (injected by CI)

## Troubleshooting

- App shows configuration error screen: populate your local `.env.development`/`.env.local` with the missing variables.
- Variable not found: ensure it has the `EXPO_PUBLIC_` prefix and is listed in both `cleanEnv` input and schema in `config.ts`.
- Build fails in CI: verify `.env.production` is generated from secrets and includes all required variables.
