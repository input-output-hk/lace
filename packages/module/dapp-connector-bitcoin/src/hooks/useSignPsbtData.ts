import { BitcoinNetworkId } from '@lace-contract/bitcoin-context';
import { inspectPsbt } from '@lace-lib/bitcoin-psbt';
import { useMemo } from 'react';

import { toBitcoinJsNetwork } from '../utils/bitcoin-network';

import { useLaceSelector } from './storeHooks';

import type {
  PendingSignPsbtRequest,
  ResolvedPreviousOut,
} from '../store/slice';
import type { PsbtInspection } from '@lace-lib/bitcoin-psbt';

/**
 * Everything the sign PSBT review screen needs to render one PSBT of a
 * signPsbt batch: its inspection, the resolving state of any
 * inputs the PSBT does not carry values for, and the raw PSBT for the
 * collapsible raw-data section.
 */
export interface UseSignPsbtDataResult {
  inspection: PsbtInspection | undefined;
  isResolvingInputs: boolean;
  currentPsbtBase64: string;
  hasError: boolean;
}

const toResolvedPreviousOutsMap = (
  previousOuts: Record<string, ResolvedPreviousOut>,
): Map<string, { script: Buffer; value: number }> =>
  new Map(
    Object.entries(previousOuts).map(([outpoint, { scriptHex, value }]) => [
      outpoint,
      { script: Buffer.from(scriptHex, 'hex'), value },
    ]),
  );

/**
 * Inspects the PSBT currently selected by the batch pager, combining it with
 * the addresses of the account the request carries and the previous outputs
 * resolved elsewhere for inputs the PSBT does not carry embedded values for.
 *
 * That account was captured when the request arrived and is the one the
 * signature will be made with, so the review cannot describe an account the
 * signing path will not use. Another account of the same wallet is foreign
 * here: its addresses are never tagged as own, never counted into the balance
 * change, and raise the foreign-input warning when the dApp asks to sign them.
 *
 * `inspection` stays undefined while inputs are still resolving, while the
 * active Bitcoin network is unknown, or when the PSBT fails to decode. The
 * review screen shows a loading state for the first two cases and, once
 * inputs are done resolving, an error state (`hasError`) when decoding
 * itself failed.
 *
 * A request without an account is an error too, never an inspection over an
 * empty ownership set: that would render as a transaction moving nothing, with
 * no address tagged as own and no warning, however much the PSBT spends.
 */
export const useSignPsbtData = (
  request: PendingSignPsbtRequest | null,
): UseSignPsbtDataResult => {
  const allAddresses = useLaceSelector('addresses.selectAllAddresses');
  const activeNetworkId = useLaceSelector(
    'network.selectActiveNetworkId',
    'Bitcoin',
  );
  const resolvedInputs = useLaceSelector(
    'bitcoinDappConnector.selectResolvedInputs',
  );
  const accountId = request?.accountId;

  const network = useMemo(
    () =>
      activeNetworkId
        ? BitcoinNetworkId.getBitcoinNetwork(activeNetworkId)
        : undefined,
    [activeNetworkId],
  );

  const ownAddresses = useMemo(
    (): ReadonlySet<string> =>
      new Set(
        allAddresses
          .filter(
            address =>
              address.blockchainName === 'Bitcoin' &&
              address.accountId === accountId,
          )
          .map(address => address.address as string),
      ),
    [accountId, allAddresses],
  );

  const currentPsbtBase64 = request?.psbtsBase64[request.currentIndex] ?? '';

  const isResolvingInputs =
    resolvedInputs.status === 'idle' || resolvedInputs.status === 'resolving';

  const { inspection, hasError } = useMemo((): {
    inspection: PsbtInspection | undefined;
    hasError: boolean;
  } => {
    if (!network || !currentPsbtBase64 || isResolvingInputs) {
      return { inspection: undefined, hasError: false };
    }
    if (!accountId) {
      return { inspection: undefined, hasError: true };
    }
    try {
      return {
        inspection: inspectPsbt(currentPsbtBase64, {
          ownAddresses,
          network: toBitcoinJsNetwork(network),
          toSignInputs: request?.options?.toSignInputs,
          resolvedPrevOuts: toResolvedPreviousOutsMap(resolvedInputs.prevOuts),
        }),
        hasError: false,
      };
    } catch {
      return { inspection: undefined, hasError: true };
    }
  }, [
    accountId,
    network,
    currentPsbtBase64,
    isResolvingInputs,
    ownAddresses,
    request?.options?.toSignInputs,
    resolvedInputs.prevOuts,
  ]);

  return {
    inspection,
    isResolvingInputs,
    currentPsbtBase64,
    hasError,
  };
};
