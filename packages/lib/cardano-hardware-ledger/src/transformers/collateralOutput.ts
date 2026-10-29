import { toTxOut } from './txOut';

import type { LedgerTxTransformerContext } from '../types';
import type { Cardano } from '@lace-lib/cardano-core';

export const mapCollateralTxOut = (
  collateralTxOut: Cardano.TxOut | undefined,
  context: LedgerTxTransformerContext,
) =>
  collateralTxOut
    ? toTxOut({ index: 0, isCollateral: true, txOut: collateralTxOut }, context)
    : null;
