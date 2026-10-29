import type { CardanoContextSliceState } from '../store/slice';
import type { AccountRewardAccountDetailsMap, AccountUtxoMap } from '../types';
import type { Cardano, EraSummary } from '@cardano-sdk/core';
import type { State } from '@lace-contract/module';

/** The Cardano context selectors a feature's selectors are built on. */
export type CardanoContextCoreSelectors = {
  selectAccountUtxos: (state: State) => AccountUtxoMap;
  selectAccountUtxosWithInFlight: (state: State) => AccountUtxoMap;
  selectAllNetworkInfo: (
    state: State,
  ) => CardanoContextSliceState['networkInfo'];
  selectEraSummaries: (state: State) => EraSummary[] | undefined;
  selectRewardAccountDetails: (state: State) => AccountRewardAccountDetailsMap;
  selectTip: (state: State) => Cardano.Tip | undefined;
};
