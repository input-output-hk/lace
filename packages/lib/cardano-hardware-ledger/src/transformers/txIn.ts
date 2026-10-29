import { TxInId, util } from '@lace-lib/cardano-key-management';

import type { LedgerTxTransformerContext } from '../types';
import type * as Ledger from '@cardano-foundation/ledgerjs-hw-app-cardano';
import type { Cardano } from '@lace-lib/cardano-core';
import type { Transform } from '@lace-lib/util/common';

const resolveKeyPath = (
  txIn: Cardano.TxIn,
  { accountIndex, txInKeyPathMap }: LedgerTxTransformerContext,
): Ledger.BIP32Path | null => {
  const utxoKeyPath = txInKeyPathMap[TxInId(txIn)];
  if (utxoKeyPath) {
    return util.accountKeyDerivationPathToBip32Path(accountIndex, utxoKeyPath);
  }

  return null;
};

export const toTxIn: Transform<
  Cardano.TxIn,
  Ledger.TxInput,
  LedgerTxTransformerContext
> = (txIn, context) => ({
  outputIndex: txIn.index,
  path: resolveKeyPath(txIn, context!),
  txHashHex: txIn.txId,
});

export const mapTxIns = (
  txIns: Cardano.TxIn[],
  context: LedgerTxTransformerContext,
): Ledger.TxInput[] => txIns.map(txIn => toTxIn(txIn, context));
