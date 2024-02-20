import { Wallet } from '@lace/cardano';

import { combineInputResolvers, createBackendInputResolver, createInputResolver } from '@cardano-sdk/wallet';
import { Cardano } from '@cardano-sdk/core';

interface UtxoAndBackendChainHistoryResolverArgs {
  utxo: Wallet.ObservableWallet['utxo'];
  chainHistoryProvider?: any;
}

export const utxoAndBackendChainHistoryResolver = ({
  utxo,
  chainHistoryProvider
}: UtxoAndBackendChainHistoryResolverArgs): Cardano.InputResolver =>
  combineInputResolvers(createInputResolver({ utxo }), createBackendInputResolver(chainHistoryProvider));
