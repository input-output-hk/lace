import {
  MaintenanceAuthorityMismatchError,
  MaintenanceUpdateRefusedError,
} from '@lace-contract/passport';
import { sha256 } from '@lace-lib/crypto';
import { HexBytes } from '@lace-lib/util';

import { DEPLOYED_OPERATIONS } from './deployed-operations';
import {
  assertVerifierKeyHeader,
  verifierKeyInsert,
} from './verifier-key-insert';

import type { VerifierKeyInsertLedger } from './verifier-key-insert';
import type {
  AccAddress,
  MaintenanceChanges,
  MaintenanceSignature,
  MaintenanceVerifierKey,
  MaintenanceVerifyingKey,
  SignedMaintenanceUpdate,
} from '@lace-contract/passport';
import type * as Ledger from '@midnightntwrk/ledger-v9';

/**
 * HKDF info of the maintenance authority secret a roster key derives. No
 * account address enters the derivation: the roster key is already
 * unique per account and is drawn before the address exists.
 */
const AUTHORITY_SECRET_INFO = new TextEncoder().encode(
  'lace-passport:cma:v1',
) as Uint8Array<ArrayBuffer>;

/** Byte length of a BIP-340 secret key. */
const AUTHORITY_SECRET_LENGTH = 32;

/** The ledger functions and classes a maintenance update is derived, built and signed with. */
type MaintenanceLedger = Pick<
  typeof Ledger,
  | 'ContractMaintenanceAuthority'
  | 'MaintenanceUpdate'
  | 'ReplaceAuthority'
  | 'signatureVerifyingKey'
  | 'signData'
  | 'signingKeyFromBip340'
> &
  VerifierKeyInsertLedger;

/** Loads the ledger on first use, so a host that never signs an update never loads it. */
export const loadMaintenanceLedger = async (): Promise<MaintenanceLedger> =>
  import('@midnightntwrk/ledger-v9');

/**
 * The 32-byte authority secret HKDF-SHA256 derives from a roster key with
 * an empty salt. The caller owns the bytes and zeroes them.
 */
const deriveAuthoritySecret = async (
  rosterKey: Uint8Array,
): Promise<Uint8Array> => {
  const material = await crypto.subtle.importKey(
    'raw',
    rosterKey as Uint8Array<ArrayBuffer>,
    'HKDF',
    false,
    ['deriveBits'],
  );
  return new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: new Uint8Array(0),
        info: AUTHORITY_SECRET_INFO,
      },
      material,
      AUTHORITY_SECRET_LENGTH * 8,
    ),
  );
};

/**
 * The ledger signing key over an authority secret.
 *
 * @throws when the secret is not a valid BIP-340 secret key, which a
 * uniform 32-byte secret is only with negligible probability.
 */
const signingKeyOf = (
  ledger: MaintenanceLedger,
  secret: Uint8Array,
): Ledger.SigningKey => {
  try {
    return ledger.signingKeyFromBip340(secret);
  } catch {
    throw new Error(
      'The maintenance authority secret a roster key derives is not a valid BIP-340 secret key.',
    );
  }
};

/**
 * Calls `run` with the Schnorr signing key of the maintenance authority a
 * roster key derives. The derived secret is zeroed before this settles,
 * on success and failure alike; the ledger signing key holds it as a hex
 * string and in wasm memory, which the ledger API cannot zero. `run` must
 * not retain the key.
 */
const withAuthorityKey = async <T>(
  ledger: MaintenanceLedger,
  rosterKey: Uint8Array,
  run: (key: Ledger.SigningKey) => T,
): Promise<T> => {
  const secret = await deriveAuthoritySecret(rosterKey);
  try {
    return run(signingKeyOf(ledger, secret));
  } finally {
    secret.fill(0);
  }
};

/** The verifying key of the maintenance authority a roster key derives. */
export const authorityOf = async (
  ledger: MaintenanceLedger,
  rosterKey: Uint8Array,
): Promise<MaintenanceVerifyingKey> =>
  withAuthorityKey(ledger, rosterKey, key => {
    const { tag, value } = ledger.signatureVerifyingKey(key);
    return { tag, value };
  });

/** Whether two verifying keys are the same key of the same kind. */
export const isSameAuthority = (
  left: MaintenanceVerifyingKey,
  right: MaintenanceVerifyingKey,
): boolean => left.tag === right.tag && left.value === right.value;

/**
 * Holds one verifier key to the one the module pins for its operation:
 * the operation must be in the deployed roster, the key's sha256 must be
 * its pin and the key must carry the pinned compiler's header. The pins
 * cover every compiled circuit, recovery and other device arms included,
 * so the roster is what keeps an install to the operations this module
 * deploys.
 *
 * @throws {@link MaintenanceUpdateRefusedError} for an operation outside
 * the roster or without a pin, a key whose digest is not the pin, or a key
 * under another header.
 */
const assertPinnedVerifierKey = (
  pins: Record<string, string>,
  { operation, verifierKey }: MaintenanceVerifierKey,
): void => {
  if (!DEPLOYED_OPERATIONS.includes(operation)) {
    throw new MaintenanceUpdateRefusedError(
      `'${operation}' is not an operation this module deploys.`,
    );
  }
  const pin = pins[operation];
  if (!pin) {
    throw new MaintenanceUpdateRefusedError(
      `No verifier key is pinned for '${operation}'.`,
    );
  }
  if (HexBytes.fromByteArray(sha256(verifierKey)) !== pin) {
    throw new MaintenanceUpdateRefusedError(
      `The verifier key of '${operation}' is not the pinned one.`,
    );
  }
  try {
    assertVerifierKeyHeader(operation, verifierKey);
  } catch (error) {
    throw new MaintenanceUpdateRefusedError((error as Error).message);
  }
};

/**
 * A copy of `changes` the caller no longer owns, so the values checked
 * are exactly the values signed.
 */
const copyOfChanges = (changes: MaintenanceChanges): MaintenanceChanges =>
  changes.kind === 'replace-authority'
    ? {
        kind: 'replace-authority',
        authority: {
          tag: changes.authority.tag,
          value: changes.authority.value,
        },
      }
    : {
        kind: 'insert-verifier-keys',
        inserts: changes.inserts.map(({ operation, verifierKey }) => ({
          operation,
          verifierKey: verifierKey.slice(),
        })),
      };

/**
 * Copies the changes of a maintenance update and holds the copy to what
 * the encryption key signs before any key is opened: a verifier key
 * install names at least one key and every key is the pinned one for an
 * operation of the deployed roster. A replace is held to the live roster
 * key once the keyring is open. The copy is what must be signed.
 *
 * @throws {@link MaintenanceUpdateRefusedError} when the changes are not
 * signable.
 */
export const signableChanges = async (
  changes: MaintenanceChanges,
): Promise<MaintenanceChanges> => {
  const copy = copyOfChanges(changes);
  if (copy.kind === 'replace-authority') return copy;
  if (copy.inserts.length === 0) {
    throw new MaintenanceUpdateRefusedError(
      'A maintenance update must install at least one verifier key.',
    );
  }
  const { expectedVk } = await import('./acc-module');
  for (const insert of copy.inserts) {
    assertPinnedVerifierKey(expectedVk, insert);
  }
  return copy;
};

/**
 * What a maintenance update is built from: the account `address`, the
 * on-chain `counter` and the `changes` it makes.
 */
type MaintenanceUpdateParts = {
  address: AccAddress;
  counter: bigint;
  changes: MaintenanceChanges;
};

/**
 * The ledger maintenance update `changes` describes against the account
 * at `address` and the on-chain `counter`. A replace installs its
 * authority as the sole member of a one-of-one committee under the next
 * counter. Every flow that submits a signed update rebuilds it here, so
 * it submits exactly the update that was signed.
 */
export const maintenanceUpdateOf = (
  ledger: MaintenanceLedger,
  { address, counter, changes }: MaintenanceUpdateParts,
): Ledger.MaintenanceUpdate =>
  new ledger.MaintenanceUpdate(
    address,
    changes.kind === 'insert-verifier-keys'
      ? changes.inserts.map(({ operation, verifierKey }) =>
          verifierKeyInsert(ledger, operation, verifierKey),
        )
      : [
          new ledger.ReplaceAuthority(
            new ledger.ContractMaintenanceAuthority(
              [changes.authority],
              1,
              counter + 1n,
            ),
          ),
        ],
    counter,
  );

/** What a maintenance update is signed over: see {@link signMaintenanceUpdate}. */
type MaintenanceUpdateSigning = MaintenanceUpdateParts & {
  rosterKeys: readonly Uint8Array[];
  authority: MaintenanceVerifyingKey;
};

/** The first of `rosterKeys` whose derived authority is `authority`, if any. */
const findRosterKey = async (
  ledger: MaintenanceLedger,
  rosterKeys: readonly Uint8Array[],
  authority: MaintenanceVerifyingKey,
): Promise<Uint8Array | undefined> => {
  for (const rosterKey of rosterKeys) {
    if (isSameAuthority(await authorityOf(ledger, rosterKey), authority)) {
      return rosterKey;
    }
  }
  return undefined;
};

/**
 * The first of `rosterKeys` whose derived authority is `authority`.
 *
 * @throws {@link MaintenanceAuthorityMismatchError} when none is.
 */
const rosterKeyOf = async (
  ledger: MaintenanceLedger,
  rosterKeys: readonly Uint8Array[],
  authority: MaintenanceVerifyingKey,
): Promise<Uint8Array> => {
  const rosterKey = await findRosterKey(ledger, rosterKeys, authority);
  if (!rosterKey) throw new MaintenanceAuthorityMismatchError();
  return rosterKey;
};

/** Whether any of `rosterKeys` derives the maintenance authority `authority`. */
export const derivesAuthority = async (
  ledger: MaintenanceLedger,
  rosterKeys: readonly Uint8Array[],
  authority: MaintenanceVerifyingKey,
): Promise<boolean> =>
  (await findRosterKey(ledger, rosterKeys, authority)) !== undefined;

/**
 * The authority a replace installs: the one the live roster key derives,
 * which the replace must name.
 *
 * @throws {@link MaintenanceUpdateRefusedError} when it names another.
 */
const replacementOf = async (
  ledger: MaintenanceLedger,
  liveRosterKey: Uint8Array,
  named: MaintenanceVerifyingKey,
): Promise<MaintenanceVerifyingKey> => {
  const live = await authorityOf(ledger, liveRosterKey);
  if (!isSameAuthority(live, named)) {
    throw new MaintenanceUpdateRefusedError(
      'A replace may only install the authority the live roster key derives.',
    );
  }
  return live;
};

/** Signs the data of `update` with the authority `rosterKey` derives. */
const signUpdate = async (
  ledger: MaintenanceLedger,
  rosterKey: Uint8Array,
  update: Ledger.MaintenanceUpdate,
): Promise<MaintenanceSignature> =>
  withAuthorityKey(ledger, rosterKey, key => {
    const { tag, value } = ledger.signData(key, update.dataToSign);
    return { tag, value };
  });

/**
 * Builds the maintenance update `changes` describes with
 * {@link maintenanceUpdateOf} and signs its data with the authority one
 * of `rosterKeys`, the live one first, derives when that authority is the
 * on-chain `authority`. A replace may install only the authority the live
 * roster key derives. The update is built here and never taken as bytes,
 * so the authority signs nothing but the changes it was asked for. The
 * changes must be the copy {@link signableChanges} answered.
 *
 * @throws {@link MaintenanceAuthorityMismatchError} when no roster key
 * derives the on-chain authority.
 * @throws {@link MaintenanceUpdateRefusedError} when a replace names
 * another authority than the live roster key's.
 */
export const signMaintenanceUpdate = async (
  ledger: MaintenanceLedger,
  {
    address,
    rosterKeys,
    authority,
    counter,
    changes,
  }: MaintenanceUpdateSigning,
): Promise<SignedMaintenanceUpdate> => {
  const signer = await rosterKeyOf(ledger, rosterKeys, authority);
  const installed =
    changes.kind === 'replace-authority'
      ? await replacementOf(ledger, rosterKeys[0], changes.authority)
      : undefined;
  const signature = await signUpdate(
    ledger,
    signer,
    maintenanceUpdateOf(ledger, { address, counter, changes }),
  );
  return installed ? { signature, authority: installed } : { signature };
};
