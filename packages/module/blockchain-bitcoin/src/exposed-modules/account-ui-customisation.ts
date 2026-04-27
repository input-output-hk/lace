import { BITCOIN_TOKEN_ID } from '@lace-contract/bitcoin-context';
import { createUICustomisation } from '@lace-lib/util-render';

import { AccountCardBitcoin } from '../components/AccountCardBitcoin';

import type { AccountUICustomisation } from '@lace-contract/app';
import type { NetworkType } from '@lace-contract/network';

const BITCOIN_DECIMALS = 8;

const accountUICustomisation = () =>
  createUICustomisation<AccountUICustomisation>({
    key: 'bitcoin',
    uiCustomisationSelector: ({ blockchainName }) =>
      blockchainName === 'Bitcoin',
    supportsNfts: true,
    AccountCard: AccountCardBitcoin,
    nativeTokenInfo: (_params: { networkType: NetworkType }) => ({
      tokenId: BITCOIN_TOKEN_ID,
      decimals: BITCOIN_DECIMALS,
      displayShortName: 'BTC',
    }),
  });

export default accountUICustomisation;
