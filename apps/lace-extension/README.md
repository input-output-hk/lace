# Lace Extension

## Development Setup

### Development Commands

- `npm run dev` - Start all development watchers (app, service worker, UI, dev tools)
- `npm run dev:ui` - Start UI development with automatic rebuilds
- `npm run dev:app` - Start app webpack in watch mode
- `npm run dev:sw` - Start service worker webpack in watch mode
- `npm run build:dev` - One-time development build (UI + app + service worker)
- `npm run build` - Production build (UI + app + service worker)

### Environment Setup

Before running `build:ui`, `build:dev:ui`, or `dev:ui`, you must run `npm run prepare:expo-env` to generate the `.env` file that Expo needs. This script:

- Reads from `webpack/.env` and `webpack/.env.defaults`
- Merges them and adds the `EXPO_PUBLIC_` prefix required by Expo
- Outputs to `apps/lace-extension/.env`

**Note**: The `build` and `build:dev` commands automatically call `prepare:expo-env`, so you don't need to run it manually for full builds.

### Script Naming Convention

- `build:*` - Production builds (minified, optimized)
- `build:dev:*` - Development builds (unminified, with source maps)
- `dev:*` - Watch mode development (automatically rebuilds on file changes)

**Important**: Run `prepare:expo-env` every time you make changes to `webpack/.env` or `webpack/.env.defaults` files.

### Why Not Expo Watch?

Expo export works for mobile development but not for browser extensions, which need files on disk rather than served from memory. Browser extensions require static files that can be loaded by the browser, so we use chokidar to watch for changes and rebuild the UI component automatically.

## Sentry Logging

Sentry logging is **disabled by default**. To enable it:

1. Get your DSN from [Sentry.io](https://sentry.io) → **Settings** → **Projects** → **[Your Project]** → **Client Keys (DSN)**
2. Add to `webpack/.env.defaults`:
   ```bash
   SENTRY_DSN=https://your-dsn-url@o123456.ingest.us.sentry.io/123456
   ```
3. Rebuild: `npm run build:dev:app`
