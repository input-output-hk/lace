import type * as Ledger from '@midnightntwrk/ledger-v9';

/** The ledger classes a verifier key insert is built from. */
export type VerifierKeyInsertLedger = Pick<
  typeof Ledger,
  'ContractOperationVersionedVerifierKey' | 'VerifierKeyInsert'
>;

/**
 * The operation version the vendored contract's verifier keys belong to.
 * The compiler this module pins emits keys under the v7 header, which the
 * ledger files under operation version 'v4'; the midnight-js maintenance
 * helpers still assume 'v3' and refuse these keys before a transaction
 * exists, so the insert is built against the ledger directly.
 */
const VERIFIER_KEY_OPERATION_VERSION = 'v4';

/** The header every verifier key of the pinned compiler starts with. */
const VERIFIER_KEY_HEADER = 'midnight:verifier-key[v7]:';

const headerOf = (verifierKey: Uint8Array): string =>
  new TextDecoder().decode(verifierKey.subarray(0, VERIFIER_KEY_HEADER.length));

/**
 * Refuses a verifier key under any other header, naming the operation.
 * The ledger would refuse it too, but only once a transaction is being
 * built, after the key has been downloaded and a wave planned around it.
 */
export const assertVerifierKeyHeader = (
  operation: string,
  verifierKey: Uint8Array,
): void => {
  const header = headerOf(verifierKey);
  if (header !== VERIFIER_KEY_HEADER) {
    throw new Error(
      `The verifier key of '${operation}' is not a ${VERIFIER_KEY_HEADER} key, got '${header}'`,
    );
  }
};

/**
 * The maintenance update entry that installs one operation's verifier
 * key under the operation version the pinned compiler's keys belong to.
 */
export const verifierKeyInsert = (
  ledger: VerifierKeyInsertLedger,
  operation: string,
  verifierKey: Uint8Array,
): Ledger.VerifierKeyInsert => {
  assertVerifierKeyHeader(operation, verifierKey);
  return new ledger.VerifierKeyInsert(
    operation,
    new ledger.ContractOperationVersionedVerifierKey(
      VERIFIER_KEY_OPERATION_VERSION,
      verifierKey,
    ),
  );
};
