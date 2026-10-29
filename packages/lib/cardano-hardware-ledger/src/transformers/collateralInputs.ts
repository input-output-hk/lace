import { mapTxIns } from './txIn';

import type { LedgerTxTransformerContext } from '../types';
import type * as Ledger from '@cardano-foundation/ledgerjs-hw-app-cardano';
import type { Cardano } from '@lace-lib/cardano-core';

export const mapCollateralTxIns = (
  collateralTxIns: Cardano.TxIn[] | undefined,
  context: LedgerTxTransformerContext,
): Ledger.TxInput[] | null =>
  collateralTxIns ? mapTxIns(collateralTxIns, context) : null;
