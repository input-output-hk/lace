import { Wallet } from '@lace/cardano';

export const hasPhase2ValidationFailed = (
  tx: Wallet.TxInFlight | Wallet.Cardano.HydratedTx | Wallet.Cardano.Tx
): boolean => 'inputSource' in tx && tx.inputSource === Wallet.Cardano.InputSource.collaterals;
