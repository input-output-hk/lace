import { Serialization } from '@cardano-sdk/core';
import {
  applyVkeyWitnesses,
  createCardanoKeyAgentFromEncryptedRoot,
} from '@lace-contract/cardano-context';
import {
  AuthenticationCancelledError,
  signerAuthFromPrompt,
} from '@lace-contract/signer';
import { HexBytes } from '@lace-lib/util';
import {
  catchError,
  concatMap,
  from,
  map,
  switchMap,
  throwError,
  toArray,
} from 'rxjs';

import { withDeviceHint } from './device-hint';

import type { SigningAccount } from './create-source-context';
import type { SideEffect } from '../..';
import type { Cardano } from '@cardano-sdk/core';
import type { Ed25519PublicKeyHex } from '@cardano-sdk/crypto';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type { AuthSecret } from '@lace-contract/authentication-prompt';
import type { CardanoTransactionSignerContext } from '@lace-contract/cardano-context';
import type { AnyWallet, InMemoryWallet } from '@lace-contract/wallet-repo';
import type { Observable } from 'rxjs';

type SideEffectDeps = Parameters<SideEffect>[2];

export type SignSweepTx = (
  source: {
    wallet: AnyWallet;
    chainId: Cardano.ChainId;
    signingAccounts: SigningAccount[];
    addresses: GroupedAddress[];
    utxos: Cardano.Utxo[];
    dependencies: SideEffectDeps;
  },
  tx: Serialization.Transaction,
) => Observable<Serialization.Transaction>;

/**
 * Signs the sweep with the source device via the standard signer factory. The
 * device ceremony is its own authorisation — no app-lock prompt, no AuthSecret
 * window; the `auth` on the context satisfies the signer interface and is
 * ignored by every device family.
 *
 * Every account signs the ORIGINAL transaction and the vkey maps are merged
 * once at the end, mirroring the software path. Chaining the device signer
 * output instead would lose earlier witnesses: its sign() rebuilds the vkey
 * set from its own signatures alone (applyVkeyWitnesses replaces, never
 * appends). One device review per account is inherent to the wallet type.
 */
/**
 * Which source accounts THIS transaction needs signatures from: the owners of
 * its inputs, and the owners of any reward account it withdraws from.
 *
 * Preserve mode sends one transaction per source account, but the signing loop
 * runs over every account in the sweep. Asking an account to sign a transaction
 * that spends none of its inputs resolves an empty `txInKeyPathMap`, so every
 * input reads as third-party, ledgerjs classifies the transaction as MULTISIG,
 * and the device returns witnesses for keys the transaction never required —
 * rejected as `InvalidWitnessesUTXOW`, with the fee short by exactly those
 * witnesses' bytes.
 *
 * Withdrawals are part of it because a withdrawal needs the stake key's
 * signature. Filtering on inputs alone dropped the account whose reward account
 * the transaction withdraws from when it supplied no input, so its stake key
 * never signed, `assertTransactionFullySigned` threw before submit, and the
 * retry rebuilt the identical plan and failed the same way — permanently. In a
 * chunked consolidation the earlier chunks are already on-chain by then, so the
 * plan strands part-way.
 *
 * Empty means "could not attribute anything", in which case every account
 * signs, as before — never sign with nobody.
 */
export const accountIndexesRequiringSignature = (
  tx: Serialization.Transaction,
  addresses: GroupedAddress[],
  utxos: Cardano.Utxo[],
): Set<number> => {
  // Nothing to resolve against, so nothing can be attributed.
  if (utxos.length === 0) return new Set();
  const body = tx.body().toCore();
  const accountIndexByAddress = new Map(
    addresses.map(({ address, accountIndex }) => [`${address}`, accountIndex]),
  );
  const accountIndexByRewardAccount = new Map(
    addresses.map(({ rewardAccount, accountIndex }) => [
      `${rewardAccount}`,
      accountIndex,
    ]),
  );
  const outputByRef = new Map(
    utxos.map(([txIn, txOut]) => [`${txIn.txId}#${txIn.index}`, txOut]),
  );
  const owners = new Set<number>();
  for (const input of body.inputs) {
    const output = outputByRef.get(`${input.txId}#${input.index}`);
    const accountIndex = output
      ? accountIndexByAddress.get(`${output.address}`)
      : undefined;
    if (accountIndex !== undefined) owners.add(accountIndex);
  }
  for (const withdrawal of body.withdrawals ?? []) {
    const accountIndex = accountIndexByRewardAccount.get(
      `${withdrawal.stakeAddress}`,
    );
    if (accountIndex !== undefined) owners.add(accountIndex);
  }
  return owners;
};

export const signSweepTxWithDevice = (
  {
    wallet,
    signingAccounts,
    addresses,
    utxos,
    dependencies,
  }: Pick<
    Parameters<SignSweepTx>[0],
    'addresses' | 'dependencies' | 'signingAccounts' | 'utxos' | 'wallet'
  >,
  tx: Serialization.Transaction,
): Observable<Serialization.Transaction> => {
  if (signingAccounts.length === 0) {
    return throwError(
      () => new Error('A device-signed sweep needs at least one account'),
    );
  }
  const auth = signerAuthFromPrompt(
    {
      accessAuthSecret: dependencies.accessAuthSecret,
      authenticate: dependencies.authenticate,
    },
    {
      cancellable: true,
      confirmButtonLabel: 'migrate-wallet.auth.confirm',
      message: 'migrate-wallet.auth.message',
    },
  );
  const owners = accountIndexesRequiringSignature(tx, addresses, utxos);
  return from(
    signingAccounts.filter(
      account => owners.size === 0 || owners.has(account.accountIndex),
    ),
  ).pipe(
    concatMap(account => {
      const context: CardanoTransactionSignerContext = {
        wallet,
        accountId: account.accountId,
        knownAddresses: addresses.filter(
          a => a.accountIndex === account.accountIndex,
        ),
        utxo: utxos,
        auth,
      };
      return dependencies.signerFactory
        .createTransactionSigner(context)
        .sign({ serializedTx: HexBytes(tx.toCbor()) })
        .pipe(
          catchError((error: unknown) => {
            // The device recomputes the tx id from its own canonical
            // serialization; a mismatch means our bytes and its bytes diverge
            // somewhere the mapping cannot see. The unsigned body is the only
            // evidence that localises WHERE — without it every failure is a
            // guess. Unsigned + the user's own console, so nothing secret.
            dependencies.logger.warn(
              '[migrate-wallet] device sweep signing failed; unsigned tx cbor:',
              tx.toCbor(),
            );
            // A device raised this, so its category is trustworthy here in a way
            // it would not be at the sweep's catchError — see withDeviceHint.
            throw withDeviceHint(error);
          }),
        );
    }),
    toArray(),
    map(results => {
      const merged = new Map<Ed25519PublicKeyHex, string>();
      for (const result of results) {
        const signed = Serialization.Transaction.fromCbor(
          Serialization.TxCBOR(result.serializedTx),
        );
        for (const [publicKey, signature] of signed.toCore().witness
          .signatures) {
          merged.set(publicKey, signature);
        }
      }
      const witnessSet = tx.witnessSet();
      applyVkeyWitnesses(witnessSet, merged);
      return new Serialization.Transaction(
        tx.body(),
        witnessSet,
        tx.auxiliaryData(),
      );
    }),
  );
};

/**
 * Signs the one sweep tx with every account in the swept set. A key agent is
 * bound to one accountIndex, so each account signs the shared tx to its own
 * `Cardano.Signatures` Map (signing only its own inputs and withdrawals, foreign
 * ones skipped) and the Maps are merged and set as vkeys ONCE, chaining `.sign`
 * would drop earlier witnesses. An in-memory source derives all agents from
 * the same encrypted root inside a single `accessAuthSecret` window opened
 * after one confirm prompt, bypassing `signerFactory` (which throws for
 * accounts not in `wallet.accounts` — accounts 1+ never enter it for a phrase
 * import). A source with no encrypted root is a hardware wallet and signs
 * on-device instead (see {@link signSweepTxWithDevice}).
 */
export const signSweepTx: SignSweepTx = (
  { wallet, chainId, signingAccounts, addresses, utxos, dependencies },
  tx,
) => {
  const { accessAuthSecret, authenticate } = dependencies;
  const encryptedRootPrivateKey = (wallet as InMemoryWallet).blockchainSpecific
    .Cardano?.encryptedRootPrivateKey;
  if (!encryptedRootPrivateKey) {
    return signSweepTxWithDevice(
      { wallet, signingAccounts, addresses, utxos, dependencies },
      tx,
    );
  }
  const auth = signerAuthFromPrompt(
    { accessAuthSecret, authenticate },
    {
      cancellable: true,
      confirmButtonLabel: 'migrate-wallet.auth.confirm',
      message: 'migrate-wallet.auth.message',
    },
  );
  return auth.authenticate().pipe(
    switchMap(confirmed => {
      if (!confirmed) {
        return throwError(() => new AuthenticationCancelledError());
      }
      return auth.accessAuthSecret(authSecret =>
        from(
          signWithAccounts({
            tx,
            signingAccounts,
            addresses,
            utxos,
            chainId,
            encryptedRootPrivateKey,
            authSecret,
          }),
        ),
      );
    }),
  );
};

export const signWithAccounts = async ({
  tx,
  signingAccounts,
  addresses,
  utxos,
  chainId,
  encryptedRootPrivateKey,
  authSecret,
}: {
  tx: Serialization.Transaction;
  signingAccounts: SigningAccount[];
  addresses: GroupedAddress[];
  utxos: Cardano.Utxo[];
  chainId: Cardano.ChainId;
  encryptedRootPrivateKey: HexBytes;
  authSecret: AuthSecret;
}): Promise<Serialization.Transaction> => {
  const scripts = tx.toCore().witness.scripts;
  const merged = new Map<Ed25519PublicKeyHex, string>();
  const owners = accountIndexesRequiringSignature(tx, addresses, utxos);
  for (const account of signingAccounts) {
    if (owners.size > 0 && !owners.has(account.accountIndex)) continue;
    const keyAgent = await createCardanoKeyAgentFromEncryptedRoot({
      accountIndex: account.accountIndex,
      chainId,
      encryptedRootPrivateKey,
      extendedAccountPublicKey: account.extendedAccountPublicKey,
      authSecret,
    });
    const signatures = await keyAgent.signTransaction(tx.body(), {
      knownAddresses: addresses.filter(
        a => a.accountIndex === account.accountIndex,
      ),
      utxo: utxos,
      scripts,
    });
    for (const [publicKey, signature] of signatures) {
      merged.set(publicKey, signature);
    }
  }
  const witnessSet = tx.witnessSet();
  applyVkeyWitnesses(witnessSet, merged);
  return new Serialization.Transaction(
    tx.body(),
    witnessSet,
    tx.auxiliaryData(),
  );
};
