import { Wallet } from '@lace/cardano';

import { combineInputResolvers, createBackendInputResolver, createInputResolver } from '@cardano-sdk/wallet';
import { Cardano } from '@cardano-sdk/core';

interface CombinedInputResolverArgs {
  utxo: Wallet.ObservableWallet['utxo'];
  chainHistoryProvider?: any;
}

export const combinedInputResolver = ({
  utxo,
  chainHistoryProvider
}: CombinedInputResolverArgs): Cardano.InputResolver =>
  combineInputResolvers(createInputResolver({ utxo }), createBackendInputResolver(chainHistoryProvider));
