import { ContractName, inferContractContext } from '@lace-contract/module';

export const stakingCenterProductCardAddonContract = inferContractContext({
  name: ContractName('staking-center-product-card-addon'),
  instance: 'zero-or-more',
  contractType: 'addon',
  provides: {
    addons: ['loadStakingCenterProductCard'],
  },
});
