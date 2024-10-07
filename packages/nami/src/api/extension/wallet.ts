import { Cardano } from '@cardano-sdk/core';
import { firstValueFrom } from 'rxjs';

import { TX } from '../../config/config';

import { submitTx } from '.';

import type { OutsideHandlesContextValue } from '../../ui';
import type { Serialization } from '@cardano-sdk/core';
import type { UnwitnessedTx } from '@cardano-sdk/tx-construction';
import type { Wallet } from '@lace/cardano';

export const buildTx = async ({
  output,
  auxiliaryData,
  inMemoryWallet,
}: Readonly<{
  output: Serialization.TransactionOutput;
  auxiliaryData: Serialization.AuxiliaryData;
  inMemoryWallet: Wallet.ObservableWallet;
}>): Promise<Wallet.UnwitnessedTx> => {
  const txBuilder = inMemoryWallet.createTxBuilder();
  const metadata = auxiliaryData.metadata()?.toCore();
  const tip = await firstValueFrom(inMemoryWallet.tip$);
  txBuilder.addOutput(output.toCore());

  if (metadata) {
    txBuilder.metadata(metadata);
  }

  txBuilder.setValidityInterval({
    invalidHereafter: Cardano.Slot(tip.slot + TX.invalid_hereafter),
  });

  return txBuilder.build();
};

export const signAndSubmit = async ({
  tx,
  password,
  withSignTxConfirmation,
  inMemoryWallet,
}: Readonly<{
  tx: UnwitnessedTx;
  password: string;
  withSignTxConfirmation: OutsideHandlesContextValue['withSignTxConfirmation'];
  inMemoryWallet: Wallet.ObservableWallet;
}>) =>
  withSignTxConfirmation(async () => {
    const { cbor: signedTx } = await tx.sign();

    return await submitTx(signedTx, inMemoryWallet);
  }, password);
