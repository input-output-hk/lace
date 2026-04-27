import { useMemo } from 'react';

import {
  inspectTransaction,
  type TransactionInspectorResult,
} from '../../../common/utils/transaction-inspector';

export {
  inspectTransaction,
  formatLovelaceToAda,
  type CertificateInfo,
  type CollateralInput,
  type TransactionInfo,
  type TransactionInspectorResult,
} from '../../../common/utils/transaction-inspector';

/**
 * React hook that parses a Cardano transaction CBOR hex and extracts basic information.
 *
 * This hook provides basic transaction details without requiring input resolution.
 * For full transaction summary (with amounts and address categorization), additional
 * context from the wallet (account addresses, input resolver) would be needed.
 *
 * @param txHex - Transaction CBOR hex string
 * @returns Transaction information, error state, and loading state
 */
export const useTransactionInspector = (
  txHex: string,
): TransactionInspectorResult => {
  return useMemo(() => inspectTransaction(txHex), [txHex]);
};
