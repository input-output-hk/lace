import { BitcoinNetwork } from '@lace-contract/bitcoin-context';
import { Err, HexBytes, Ok } from '@lace-lib/util';
import { firstValueFrom, timeout } from 'rxjs';

import {
  findBitcoinAccountWallet,
  resolveBitcoinAccountId,
} from './resolve-bitcoin-account';

import type { StateObservables } from '@lace-contract/module';
import type { networkSelectors } from '@lace-contract/network';
import type { AccountId, walletsSelectors } from '@lace-contract/wallet-repo';
import type { Result } from '@lace-lib/util';

const SUBMIT_TX_TIMEOUT_MS = 60_000;

type RequiredObservables = StateObservables<
  typeof networkSelectors & typeof walletsSelectors
>;

/**
 * Structural requirement: the wallet must have been created with the Bitcoin
 * modules loaded (blockchainBitcoin and a Bitcoin provider).
 */
export type WalletWithBitcoinSubmit = {
  stateObservables: Pick<RequiredObservables, 'network' | 'wallets'>;
};

/** The options of `submitBitcoinTx`. */
export interface SubmitBitcoinTxProps {
  /** The signed transaction, as `signBitcoinTx` returns it. */
  serializedTx: HexBytes;
  /**
   * Bitcoin account that signed the transaction. Required when more than one
   * Bitcoin account is present on the active network.
   */
  accountId?: AccountId;
}

/** The signed transaction `signBitcoinTx` serializes: its network and hex. */
type SignedBitcoinTxPayload = {
  network: BitcoinNetwork;
  hex: string;
};

const isBitcoinNetwork = (network: unknown): network is BitcoinNetwork =>
  Object.values<unknown>(BitcoinNetwork).includes(network);

const decodeSignedTx = (serializedTx: HexBytes): SignedBitcoinTxPayload => {
  const payload = JSON.parse(HexBytes.toUTF8(HexBytes(serializedTx))) as {
    network?: unknown;
    hex?: unknown;
  } | null;
  if (typeof payload?.hex !== 'string' || !isBitcoinNetwork(payload.network)) {
    throw new Error('Not a signed Bitcoin transaction');
  }
  return { network: payload.network, hex: payload.hex };
};

/**
 * Submits a signed transaction through the account's Bitcoin wallet, which
 * adds it to the account's pending transactions once the provider accepts it,
 * and waits up to 60 seconds for the provider's answer. The account is
 * `props.accountId`, or the only Bitcoin account on the active network. A
 * Bitcoin account must be loaded by at most one wallet per JavaScript realm,
 * since the account's pending transactions are shared across the realm by
 * account id.
 *
 * @param wallet - A wallet with the Bitcoin modules loaded (see
 *   {@link WalletWithBitcoinSubmit}).
 * @param props - The signed transaction, and the account when needed.
 * @returns `Ok` with the transaction ID once the provider accepts it, or
 *   `Err` when no account matches, the account has not started syncing, the
 *   transaction is for another network, the provider refuses it or the wait
 *   times out. It never rejects.
 */
export const submitBitcoinTx = async (
  wallet: WalletWithBitcoinSubmit,
  props: SubmitBitcoinTxProps,
): Promise<Result<{ txId: string }, Error>> => {
  const { serializedTx, accountId: requestedAccountId } = props;

  try {
    const { network, hex } = decodeSignedTx(serializedTx);

    const resolved = await resolveBitcoinAccountId(
      wallet.stateObservables,
      requestedAccountId,
    );
    if (resolved.isErr()) return Err(resolved.error);
    const accountId = resolved.value;

    const foundWallet = findBitcoinAccountWallet(accountId);
    if (foundWallet.isErr()) return Err(foundWallet.error);
    const accountWallet = foundWallet.value;
    if (accountWallet.network !== network) {
      return Err(
        new Error(
          `The transaction is for the Bitcoin ${network} network, but account "${accountId}" is on ${accountWallet.network}`,
        ),
      );
    }

    const result = await firstValueFrom(
      accountWallet.submitTransaction(hex).pipe(timeout(SUBMIT_TX_TIMEOUT_MS)),
    );
    if (result.isErr()) {
      return Err(
        new Error(`Transaction submission failed: ${result.error.reason}`, {
          cause: result.error,
        }),
      );
    }
    return Ok({ txId: result.value });
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(String(error)));
  }
};
