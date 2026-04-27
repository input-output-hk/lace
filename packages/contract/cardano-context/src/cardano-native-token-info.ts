import { ADA_DECIMALS, LOVELACE_TOKEN_ID } from './const';
import { getAdaTokenTickerByNetwork } from './get-ada-token-ticker-by-network';

import type { NetworkType } from '@lace-contract/network';

/**
 * Native currency (lovelace) descriptor for the active Cardano network — same shape as
 * `SendFlowSheetUICustomisation.nativeTokenInfo` in the app contract.
 */
export const getCardanoNativeTokenInfoForNetwork = (
  networkType: NetworkType,
) => ({
  tokenId: LOVELACE_TOKEN_ID,
  decimals: ADA_DECIMALS,
  displayShortName: getAdaTokenTickerByNetwork(networkType),
});
