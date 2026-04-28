import { analyticsStoreContract } from '@lace-contract/analytics';
import {
  ContractName,
  combineContracts,
  combineStore,
  createMixin,
  inferContractContext,
} from '@lace-contract/module';

import store from './store';

import type {
  ContractActionCreators,
  ContractSelectors,
} from '@lace-contract/module';

export const initializeExtensionViewAddonContract = inferContractContext({
  name: ContractName('initialize-extension-view-addon'),
  instance: 'zero-or-more',
  contractType: 'addon',
  provides: {
    addons: ['loadInitializeExtensionView'],
  },
});

export const initializeMobileViewAddonContract = inferContractContext({
  name: ContractName('initialize-mobile-view-addon'),
  instance: 'zero-or-more',
  contractType: 'addon',
  provides: {
    addons: ['loadInitializeMobileView'],
  },
});

export const renderRootAddonContract = inferContractContext({
  name: ContractName('render-root-addon'),
  instance: 'zero-or-more',
  contractType: 'addon',
  provides: {
    addons: ['renderRoot'],
  },
});

export const stackPagesAddonContract = inferContractContext({
  name: ContractName('stack-pages-addon'),
  instance: 'zero-or-more',
  contractType: 'addon',
  provides: {
    addons: ['loadStackPages'],
  },
});

export const tabPagesAddonContract = inferContractContext({
  name: ContractName('tab-pages-addon'),
  instance: 'zero-or-more',
  contractType: 'addon',
  provides: {
    addons: ['loadTabPages'],
  },
});

export const globalOverlaysAddonContract = inferContractContext({
  name: ContractName('global-overlays-addon'),
  instance: 'zero-or-more',
  contractType: 'addon',
  provides: {
    addons: ['loadGlobalOverlays'],
  },
});

export const sheetPagesAddonContract = inferContractContext({
  name: ContractName('sheet-pages-addon'),
  instance: 'zero-or-more',
  contractType: 'addon',
  provides: {
    addons: ['loadSheetPages'],
  },
});

export const mobileDeepLinksAddonContract = inferContractContext({
  name: ContractName('load-deep-links-addon'),
  instance: 'exactly-one',
  contractType: 'addon',
  provides: {
    addons: ['loadMobileDeepLinks'],
  },
});

export const viewsStoreContract = inferContractContext({
  name: ContractName('views-store'),
  instance: 'exactly-one',
  contractType: 'store',
  dependsOn: combineContracts([
    analyticsStoreContract,
    initializeExtensionViewAddonContract,
    initializeMobileViewAddonContract,
    tabPagesAddonContract,
    stackPagesAddonContract,
    renderRootAddonContract,
    sheetPagesAddonContract,
  ] as const),
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

export type Selectors = ContractSelectors<typeof viewsStoreContract>;
export type ActionCreators = ContractActionCreators<typeof viewsStoreContract>;
