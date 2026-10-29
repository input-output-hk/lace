// The addon contracts through which the app's UI is customised and
// assembled. The stable SDK build resolves ui-addon-contracts.stable.ts
// instead: the SDK runs headless and loads none of them.
// Keep the two files' exports in step, apart from the names the variant
// declares on stable-omits lines; the SDK's stable variant parity check
// enforces it.
import { ContractName, inferContractContext } from '@lace-contract/module';

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
