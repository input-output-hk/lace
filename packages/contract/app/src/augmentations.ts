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
  AboutPageUICustomisation,
  Dialogs,
} from './types';
import type { DynamicallyLoadedInit } from '@lace-contract/module';

declare module '@lace-contract/module' {
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
    readonly loadDialogs?: DynamicallyLoadedInit<Dialogs>;
  }
}
