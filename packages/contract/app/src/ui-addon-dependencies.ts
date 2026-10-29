// The stable SDK build resolves ui-addon-dependencies.stable.ts in place of
// this file, whose app store depends on no UI addon. Keep the two files'
// exports in step, apart from the names the variant declares on stable-omits
// lines; the SDK's stable variant parity check enforces it.
import {
  appContextInitializationAddonContract,
  appMenuItemsAddonContract,
  tabMenuItemsAddonContract,
} from './ui-addon-contracts';

/**
 * The UI addon contracts the app store depends on, in its dependency
 * order.
 */
export const appUiAddonDependencies = [
  appContextInitializationAddonContract,
  appMenuItemsAddonContract,
  tabMenuItemsAddonContract,
] as const;
