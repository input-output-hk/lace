import type { onboardingV2Reducers } from './store';
import type {
  HwBlockchainSupport,
  HwWalletConnector,
  HwAccountConnector,
  OnboardingConfig,
  OnboardingOption,
  OnboardingStartWalletDropdownUICustomisation,
} from './types';
import type { DynamicallyLoadedInit } from '@lace-contract/module';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

declare module '@lace-contract/module' {
  interface State
    extends StateFromReducersMapObject<typeof onboardingV2Reducers> {}

  interface LaceAddons {
    readonly loadOnboardingOptions: DynamicallyLoadedInit<OnboardingOption[]>;
    readonly loadHwWalletConnector: DynamicallyLoadedInit<HwWalletConnector>;
    readonly loadLedgerHwAccountConnector: DynamicallyLoadedInit<
      HwAccountConnector[]
    >;
    readonly loadTrezorHwAccountConnector: DynamicallyLoadedInit<
      HwAccountConnector[]
    >;
    readonly loadHwBlockchainSupport: DynamicallyLoadedInit<
      HwBlockchainSupport[]
    >;
    readonly loadOnboardingStartWalletDropdownUICustomisations: DynamicallyLoadedInit<OnboardingStartWalletDropdownUICustomisation>;
    readonly loadOnboardingConfig: DynamicallyLoadedInit<OnboardingConfig>;
  }

  interface AppConfig {
    cookiePolicyUrl: string;
    privacyPolicyUrl: string;
    termsAndConditionsUrl: string;
    zendeskNewRequestUrl: string;
  }
}
