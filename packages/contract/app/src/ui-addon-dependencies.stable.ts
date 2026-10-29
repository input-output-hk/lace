// The stable SDK build resolves this file in place of ui-addon-dependencies.ts:
// the SDK runs headless, so the app store depends on no UI addon.

/** The UI addon contracts the app store depends on: none. */
export const appUiAddonDependencies = [] as const;
