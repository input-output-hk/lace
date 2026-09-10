import { AuthenticationCancelledError } from '@lace-contract/signer';
import { pollCeremonyOutcome } from '@lace-lib/extension-shell-client';
import { from, of, switchMap, throwError } from 'rxjs';

import { assembleSignedTx } from '../assemble-signed-tx';
import { getCardanoSignTxResult, requestSignCardanoTx } from '../lace-client';

import type {
  CardanoDataSigner,
  CardanoSignRequest,
  CardanoSignResult,
  CardanoSignerContext,
  CardanoSignerFactory,
  CardanoTransactionSigner,
  CardanoTransactionSignerContext,
} from '@lace-contract/cardano-context';
import type { AnyAccount } from '@lace-contract/wallet-repo';
import type { LaceResult, SignTxResult } from '@lace-lib/extension-shell-api';
import type { Observable } from 'rxjs';

type PollOutcome =
  | { kind: 'cancelled' }
  | { kind: 'pending' }
  | { kind: 'signed'; witnessCborHex: string };

const classifyPoll = (result: LaceResult<SignTxResult>): PollOutcome => {
  // A transient host error is tolerated as "keep polling"; the ceiling
  // guards the case where it never recovers.
  if (!result.ok) return { kind: 'pending' };
  if (result.value.status === 'signed') {
    return { kind: 'signed', witnessCborHex: result.value.witnessCborHex };
  }
  if (result.value.status === 'cancelled') return { kind: 'cancelled' };
  // 'pending' or a status outside the union a newer host may emit (ADR 41 skew).
  return { kind: 'pending' };
};

/**
 * Transaction signer that delegates the signature to the host ceremony
 * (ADR 41/36): asks the host to mount its signing surface, polls for
 * completion, then assembles the signed tx from the host-returned witness set.
 * The Cardano secret never exists guest-side.
 */
class HostCardanoTransactionSigner implements CardanoTransactionSigner {
  public constructor(private readonly accountId: string) {}

  public sign({
    serializedTx,
  }: CardanoSignRequest): Observable<CardanoSignResult> {
    const txCbor = String(serializedTx);
    return from(requestSignCardanoTx(this.accountId, txCbor)).pipe(
      switchMap(handle => {
        if (!handle.ok) {
          return throwError(
            () => new Error(`${handle.error.code}: ${handle.error.message}`),
          );
        }
        const { ceremonyId } = handle.value;
        return pollCeremonyOutcome<PollOutcome>(
          async () => getCardanoSignTxResult(ceremonyId).then(classifyPoll),
          { kind: 'cancelled' },
        ).pipe(
          switchMap(outcome =>
            outcome.kind === 'signed'
              ? of<CardanoSignResult>(
                  assembleSignedTx(txCbor, outcome.witnessCborHex),
                )
              : throwError(() => new AuthenticationCancelledError()),
          ),
        );
      }),
    );
  }
}

/**
 * Guest signer factory (ADR 44): every Cardano
 * signature — whether the wallet is InMemory or a host-paired hardware wallet
 * (Ledger, Trezor, or air-gapped Keystone/SeedSigner) — is a host ceremony (the
 * host owns the device and the shape of the ceremony; the guest never knows a
 * device exists beyond the account type string). Data signing is host-owned and
 * has no guest consumer (dapp-connector-cardano is dropped from the guest), so
 * it throws.
 */
class HostSignerFactory implements CardanoSignerFactory {
  public canSign(account: AnyAccount): boolean {
    return (
      (account.accountType === 'InMemory' ||
        account.accountType === 'HardwareLedger' ||
        account.accountType === 'HardwareTrezor' ||
        account.accountType === 'HardwareKeystone' ||
        account.accountType === 'HardwareSeedSigner') &&
      account.blockchainName === 'Cardano'
    );
  }

  public createTransactionSigner(
    context: CardanoTransactionSignerContext,
  ): CardanoTransactionSigner {
    // The wire carries the account's network-specific accountId verbatim; the
    // host parses walletId/index/magic from it to resolve the exact account
    // (ADR 13/11). Validate here that it names a Cardano account of this wallet
    // so a bad id fails guest-side rather than at the host ceremony.
    const account = context.wallet.accounts.find(
      candidate => candidate.accountId === context.accountId,
    );
    if (!account || account.blockchainName !== 'Cardano') {
      throw new Error(
        `Cardano account not found for ${context.accountId} in wallet ${context.wallet.walletId}`,
      );
    }
    return new HostCardanoTransactionSigner(context.accountId);
  }

  public createDataSigner(_context: CardanoSignerContext): CardanoDataSigner {
    throw new Error(
      'Cardano data signing is host-owned — unsupported in the guest',
    );
  }
}

const initSignerFactory = (): CardanoSignerFactory => new HostSignerFactory();

export default initSignerFactory;
