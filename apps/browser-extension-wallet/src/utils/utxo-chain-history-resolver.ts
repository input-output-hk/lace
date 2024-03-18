import { Wallet } from '@lace/cardano';

import { combineInputResolvers, createBackendInputResolver, createInputResolver } from '@cardano-sdk/wallet';
import { Cardano } from '@cardano-sdk/core';

interface UtxoAndBackendChainHistoryResolverArgs {
  utxo: Wallet.ObservableWallet['utxo'];
  chainHistoryProvider: Wallet.ChainHistoryProvider;
}

export const utxoAndBackendChainHistoryResolver = ({
  utxo,
  chainHistoryProvider
}: UtxoAndBackendChainHistoryResolverArgs): Cardano.InputResolver =>
  combineInputResolvers(createInputResolver({ utxo }), createBackendInputResolver(chainHistoryProvider));
