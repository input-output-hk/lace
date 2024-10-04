import { Cardano } from '@cardano-sdk/core';
import { firstValueFrom } from 'rxjs';

import {
  // ERROR,
  TX,
} from '../../config/config';

import {
  // signTxHW,
  submitTx,
} from '.';

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

  const transaction = txBuilder.build();

  return transaction;
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

    const txHash = await submitTx(signedTx, inMemoryWallet);

    return txHash;
  }, password);

export const signAndSubmitHW = async (
  tx: Serialization.Transaction,
  {
    keyHashes,
    account,
    hw,
    partialSign,
  }: Readonly<{ keyHashes: any; account: any; hw: any; partialSign?: boolean }>,
) => {
  console.log(tx, {
    keyHashes,
    account,
    hw,
    partialSign,
  });
  return '';
  // const witnessSet = await signTxHW(
  //   tx.toCbor(),
  //   keyHashes,
  //   account,
  //   hw,
  //   partialSign,
  // );

  // const transaction = new Serialization.Transaction(
  //   tx.body(),
  //   witnessSet,
  //   tx.auxiliaryData(),
  // );

  // try {
  //   const txHash = await submitTx(transaction.toCbor());
  //   return txHash;
  // } catch {
  //   throw ERROR.submit;
  // }
};
