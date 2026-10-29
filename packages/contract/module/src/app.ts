// The stable SDK build resolves app.stable.ts in place of this file, which names
// the SDK as the only app.
// Keep the two files' exports in step, apart from the names the variant
// declares on stable-omits lines; the SDK's stable variant parity check
// enforces it.

/**
 * Identifies the host application the modules run in. `Runtime.app` carries the
 * current one, and a `LaceModuleMap` keys module variants by it.
 */
export type App =
  | 'lace-extension-carbon'
  | 'lace-extension-guest'
  | 'lace-extension'
  | 'lace-mobile'
  | 'lace-sdk';
