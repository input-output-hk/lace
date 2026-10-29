// The stable SDK build resolves augmentations.stable.ts in place of this file,
// which adds the reload dependency and no UI customisation addon.
// Keep the two files' exports in step, apart from the names the variant
// declares on stable-omits lines; the SDK's stable variant parity check
// enforces it.

import type {
  AccountUICustomisation,
  InitializeAppContext,
  SettingsPageUICustomisation,
  SendFlowSheetUICustomisation,
  ReceiveSheetAddressDataCustomisation,
  AppMenuItems,
  TokenDetailsUICustomization,
  TabMenuItems,
  ProfileDropdownWalletsUICustomisation,
  DropdownMenuItemUICustomisation,
  PortfolioBannerUICustomisation,
  PortfolioAnnouncement,
  AboutPageUICustomisation,
  Dialogs,
} from './types';
import type { DynamicallyLoadedInit } from '@lace-contract/module';
import type { Observable } from 'rxjs';

declare module '@lace-contract/module' {
  interface SideEffectDependencies {
    performAppReload: () => Observable<void>;
  }

  interface LaceAddons {
    readonly loadAccountUICustomisations: DynamicallyLoadedInit<AccountUICustomisation>;
    readonly loadInitializeAppContext: DynamicallyLoadedInit<InitializeAppContext>;
    readonly loadSettingsPageUICustomisations: DynamicallyLoadedInit<SettingsPageUICustomisation>;
    readonly loadAboutPageUICustomisations?: DynamicallyLoadedInit<AboutPageUICustomisation>;
    readonly loadProfileDropdownWalletsUICustomisations: DynamicallyLoadedInit<ProfileDropdownWalletsUICustomisation>;
    readonly loadSendFlowSheetUICustomisations: DynamicallyLoadedInit<SendFlowSheetUICustomisation>;
    readonly loadProfileDropdownMenuItemUICustomisations: DynamicallyLoadedInit<DropdownMenuItemUICustomisation>;
    readonly loadReceiveSheetAddressDataCustomisations: DynamicallyLoadedInit<ReceiveSheetAddressDataCustomisation>;
    readonly loadTokenDetailsUICustomisations: DynamicallyLoadedInit<TokenDetailsUICustomization>;
    readonly loadAppMenuItems: DynamicallyLoadedInit<AppMenuItems>;
    readonly loadTabMenuItems: DynamicallyLoadedInit<TabMenuItems>;
    readonly loadPortfolioBannerUICustomisations: DynamicallyLoadedInit<PortfolioBannerUICustomisation>;
    readonly loadPortfolioAnnouncements: DynamicallyLoadedInit<PortfolioAnnouncement>;
    readonly loadDialogs?: DynamicallyLoadedInit<Dialogs>;
  }
}
