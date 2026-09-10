import { BitcoinNetworkId } from '@lace-contract/bitcoin-context';
import { AuthenticationCancelledError } from '@lace-contract/signer';
import { pollCeremonyOutcome } from '@lace-lib/extension-shell-client';
import { HexBytes } from '@lace-lib/util';
import { from, of, switchMap, throwError } from 'rxjs';

import { getBitcoinSignTxResult, requestSignBitcoinTx } from '../lace-client';
import { toWireNetwork } from '../mappers';

import type {
  BitcoinBip32AccountProps,
  BitcoinDataSigner,
  BitcoinNetwork,
  BitcoinSignRequest,
  BitcoinSignResult,
  BitcoinSignerContext,
  BitcoinSignerFactory,
  BitcoinTransactionSigner,
} from '@lace-contract/bitcoin-context';
import type {
  AnyAccount,
  InMemoryWalletAccount,
} from '@lace-contract/wallet-repo';
import type {
  BitcoinSignTxResult,
  LaceResult,
} from '@lace-lib/extension-shell-api';
import type { Observable } from 'rxjs';

type PollOutcome =
  | { kind: 'cancelled' }
  | { kind: 'pending' }
  | { kind: 'signed'; signedTxHex: string };

const classifyPoll = (result: LaceResult<BitcoinSignTxResult>): PollOutcome => {
  // A transient host error is tolerated as "keep polling"; the ceiling guards
  // the case where it never recovers.
  if (!result.ok) return { kind: 'pending' };
  const value = result.value;
  if (value.status === 'signed') {
    return { kind: 'signed', signedTxHex: value.signedTxHex };
  }
  if (value.status === 'cancelled') return { kind: 'cancelled' };
  // 'pending' or a status outside the union a newer host may emit (ADR 41 skew).
  return { kind: 'pending' };
};

/** The executor's unsigned artifact (blockchain-bitcoin common/transaction.ts
 * SerializedDto): hex-of-UTF8 JSON with the PSBT under `context`. D4: only the
 * PSBT crosses the wire — the guest-authored signers/display fields never do. */
type UnsignedEnvelope = { context: string; network?: BitcoinNetwork };

/**
 * Transaction signer that delegates the signature to the host ceremony (ADR 46,
 * ADR 41/36): extracts the PSBT from the executor's artifact, asks the host to
 * mount its Bitcoin signing surface, polls for completion, then re-wraps the
 * host-returned raw tx hex into the `{ network, hex }` DTO the executor's submit
 * path expects (SignedBitcoinTransactionDto). The seed never exists guest-side.
 */
class HostBitcoinTransactionSigner implements BitcoinTransactionSigner {
  public constructor(
    private readonly walletId: string,
    private readonly accountIndex: number,
    private readonly network: BitcoinNetwork,
  ) {}

  public sign({
    serializedTx,
  }: BitcoinSignRequest): Observable<BitcoinSignResult> {
    const envelope = JSON.parse(
      HexBytes.toUTF8(serializedTx),
    ) as UnsignedEnvelope;
    const psbtHex = envelope.context;
    // Preserve the envelope's network in the signed DTO so submit-tx sees the
    // same network the monolith signer would emit; it agrees with the account
    // network the host signs under (build-tx sets it from the same account).
    const signedNetwork = envelope.network ?? this.network;
    return from(
      requestSignBitcoinTx({
        walletId: this.walletId,
        accountIndex: this.accountIndex,
        network: toWireNetwork(this.network),
        psbtHex,
      }),
    ).pipe(
      switchMap(handle => {
        if (!handle.ok) {
          return throwError(
            () => new Error(`${handle.error.code}: ${handle.error.message}`),
          );
        }
        const { ceremonyId } = handle.value;
        return pollCeremonyOutcome<PollOutcome>(
          async () => getBitcoinSignTxResult(ceremonyId).then(classifyPoll),
          { kind: 'cancelled' },
        ).pipe(
          switchMap(outcome =>
            outcome.kind === 'signed'
              ? of<BitcoinSignResult>({
                  serializedTx: HexBytes.fromUTF8(
                    JSON.stringify({
                      network: signedNetwork,
                      hex: outcome.signedTxHex,
                    }),
                  ),
                })
              : throwError(() => new AuthenticationCancelledError()),
          ),
        );
      }),
    );
  }
}

/**
 * Guest signer factory (ADR 46, ADR 44 / ADR 44 / ADR 44): every Bitcoin
 * signature — whether the wallet is InMemory or a host-paired hardware wallet
 * (Ledger, Trezor, or air-gapped Keystone/SeedSigner) — is a host ceremony (the
 * host owns the device and the shape of the ceremony; the guest never knows a
 * device exists beyond the account type string). Data signing (BIP-322) is
 * deferred — it has no consumer in the guest loadout (ADR 46) — so it throws,
 * exactly like the Cardano host factory.
 */
class HostBitcoinSignerFactory implements BitcoinSignerFactory {
  public canSign(account: AnyAccount): boolean {
    return (
      (account.accountType === 'InMemory' ||
        account.accountType === 'HardwareLedger' ||
        account.accountType === 'HardwareTrezor' ||
        account.accountType === 'HardwareKeystone' ||
        account.accountType === 'HardwareSeedSigner') &&
      account.blockchainName === 'Bitcoin'
    );
  }

  public createTransactionSigner(
    context: BitcoinSignerContext,
  ): BitcoinTransactionSigner {
    // The host signs any account, so the signer must carry the target index and
    // network — taken from the signing account the factory is created for (its
    // accountId, resolved against the wallet's projected accounts). The network
    // disambiguates the exact account (both network accounts share an index).
    const account = context.wallet.accounts.find(
      candidate => candidate.accountId === context.accountId,
    );
    if (!account || account.blockchainName !== 'Bitcoin') {
      throw new Error(
        `Bitcoin account not found for ${context.accountId} in wallet ${context.wallet.walletId}`,
      );
    }
    const network = BitcoinNetworkId.getBitcoinNetwork(
      account.blockchainNetworkId,
    );
    if (!network) {
      throw new Error(
        `Cannot resolve Bitcoin network for account ${context.accountId}`,
      );
    }
    const { accountIndex } = (
      account as InMemoryWalletAccount<BitcoinBip32AccountProps>
    ).blockchainSpecific;
    return new HostBitcoinTransactionSigner(
      context.wallet.walletId,
      accountIndex,
      network,
    );
  }

  public createDataSigner(_context: BitcoinSignerContext): BitcoinDataSigner {
    throw new Error(
      'Bitcoin data signing is host-owned — unsupported in the guest',
    );
  }
}

const initSignerFactory = (): BitcoinSignerFactory =>
  new HostBitcoinSignerFactory();

export default initSignerFactory;
