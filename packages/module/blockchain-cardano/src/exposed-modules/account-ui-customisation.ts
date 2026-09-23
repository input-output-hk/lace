import { getCardanoNativeTokenInfoForNetwork } from '@lace-contract/cardano-context';
import { createUICustomisation } from '@lace-lib/util-render';

import { CnightDesignationAccountAction } from '../components/CnightDesignationAccountAction';

import type { AccountUICustomisation } from '@lace-contract/app';

const accountUICustomisation = () =>
  createUICustomisation<AccountUICustomisation>({
    key: 'cardano',
    uiCustomisationSelector: ({ blockchainName }) =>
      blockchainName === 'Cardano',
    supportsNfts: true,
    AccountCardExtraActions: CnightDesignationAccountAction,
    nativeTokenInfo: ({ networkType }) =>
      getCardanoNativeTokenInfoForNetwork(networkType),
  });

export default accountUICustomisation;
