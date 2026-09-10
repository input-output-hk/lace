import { ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { BitcoinNetwork } from '@lace-contract/bitcoin-context';

import type { BitcoinUTxO } from '@lace-contract/bitcoin-context';
import type { BitcoinUtxo, LaceError } from '@lace-lib/extension-shell-api';

/** Map the host's transport utxo → the contract `BitcoinUTxO` the guest's
 * BitcoinWallet consumes. `satoshis` rides the wire as a decimal string
 * (transport convention) and reifies to a number here (the contract shape). */
export const transportUtxoToContract = (utxo: BitcoinUtxo): BitcoinUTxO => ({
  txId: utxo.txId,
  index: utxo.index,
  satoshis: Number(utxo.satoshis),
  address: utxo.address,
  script: utxo.script,
  confirmations: utxo.confirmations,
  height: utxo.height ?? 0,
  // Runes/inscriptions are off the wire (ADR 46) — no guest consumer reads them.
  runes: [],
  inscriptions: [],
});

export const laceErrorToProviderError = (error: LaceError): ProviderError =>
  new ProviderError(
    ProviderFailure.Unknown,
    undefined,
    `${error.code}: ${error.message}`,
  );

/** The BitcoinNetwork enum values ARE the wire's network names, but the enum
 * type is not directly assignable to the wire's string-literal union. */
export const toWireNetwork = (
  network: BitcoinNetwork,
): 'mainnet' | 'testnet4' =>
  network === BitcoinNetwork.Mainnet ? 'mainnet' : 'testnet4';
