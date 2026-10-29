// The addon contracts through which blockchains customise the activity UI.
// The stable SDK build resolves ui-addon-contracts.stable.ts instead: the SDK
// runs headless and loads none of them.
// Keep the two files' exports in step, apart from the names the variant
// declares on stable-omits lines; the SDK's stable variant parity check
// enforces it.
import { ContractName, inferContractContext } from '@lace-contract/module';

export const activitiesListCustomizationsAddonContract = inferContractContext({
  name: ContractName('activities-list-customizations-addon'),
  contractType: 'addon',
  instance: 'zero-or-more',
  provides: {
    addons: [
      'loadActivitiesListUICustomisations',
      'loadActivitiesOfTokenUICustomisations',
    ],
  },
});

export const activitiesItemCustomizationsAddonContract = inferContractContext({
  name: ContractName('activities-item-customizations-addon'),
  contractType: 'addon',
  instance: 'zero-or-more',
  provides: {
    addons: ['loadActivitiesItemUICustomisations'],
  },
});

export const activitiesDetailsSheetCustomizationsAddonContract =
  inferContractContext({
    name: ContractName('activities-details-sheet-customizations-addon'),
    contractType: 'addon',
    instance: 'zero-or-more',
    provides: {
      addons: ['loadActivityDetailsSheetUICustomisations'],
    },
  });
