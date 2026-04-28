import {
  DUST_TOKEN_DECIMALS,
  getDustTokenIdByNetwork,
  getDustTokenTickerByNetwork,
  MidnightSDKNetworkIds,
} from '@lace-contract/midnight-context';
import { createUICustomisation } from '@lace-lib/util-render';

import { AccountCardMidnight } from '../components/AccountCardMidnight';

import type { AccountUICustomisation } from '@lace-contract/app';

const accountUICustomisation = () =>
  createUICustomisation<AccountUICustomisation>({
    key: 'midnight',
    uiCustomisationSelector: ({ blockchainName }) =>
      blockchainName === 'Midnight',
    supportsNfts: false,
    AccountCard: AccountCardMidnight,
    nativeTokenInfo: ({ networkType }) => ({
      tokenId: getDustTokenIdByNetwork(MidnightSDKNetworkIds.MainNet),
      decimals: DUST_TOKEN_DECIMALS,
      displayShortName: getDustTokenTickerByNetwork(networkType),
    }),
  });

export default accountUICustomisation;
