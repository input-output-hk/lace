import { Wallet } from '@lace/cardano';
import { WitnessedTx } from '@cardano-sdk/key-management';

import { combineInputResolvers, createBackendInputResolver, createInputResolver } from '@cardano-sdk/wallet';
import { Cardano } from '@cardano-sdk/core';
import { Observable } from 'rxjs';

interface UtxoAndBackendChainHistoryResolverArgs {
  utxo: Wallet.ObservableWallet['utxo'];
  chainHistoryProvider: Wallet.ChainHistoryProvider;
  transactions: {
    history$: Observable<Cardano.HydratedTx[]>;
    outgoing: {
      signed$: Observable<WitnessedTx[]>;
    };
  };
}

export const utxoAndBackendChainHistoryResolver = ({
  utxo,
  transactions,
  chainHistoryProvider
}: UtxoAndBackendChainHistoryResolverArgs): Cardano.InputResolver =>
  combineInputResolvers(createInputResolver({ utxo, transactions }), createBackendInputResolver(chainHistoryProvider));
