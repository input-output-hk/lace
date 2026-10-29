// The stable SDK build resolves bundles.stable.ts in place of this file, which
// ships no translation bundle and types a translation key as any string.
// Keep the two files' exports in step, apart from the names the variant
// declares on stable-omits lines; the SDK's stable variant parity check
// enforces it.

// To add a new language:
// 1. Create a translation JSON (e.g. `fr.json`) mirroring the `en.json` keys.
// 2. Translate the values and ensure `translation.language.name` / `.code` are set.
// 3. Import the new file below and register it in `rawTranslations`.
// 4. i18next initialisation and the language picker will pick it up automatically.
import en from './en.json';
import es from './es.json';
import ja from './ja.json';

// Collect every locale bundle we ship so the rest of the helpers can derive
// their data from a single source of truth.
export const rawTranslations = {
  en,
  es,
  ja,
} as const;

/** The messages of one language, keyed by translation key. */
export type TranslationMessages = typeof en;

// Use tsc (typecheck) to verify that translation files are in sync
const _en: typeof en = es;
const _es: typeof es = en;
const _ja: typeof ja = en;
// `_ja` above only catches `en` missing a `ja` key; this catches the reverse —
// `ja` missing an `en` key (the gap that let 22 en/es keys ship without `ja`).
const _enJa: typeof en = ja;
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
_en;
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
_es;
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
_ja;
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
_enJa;
