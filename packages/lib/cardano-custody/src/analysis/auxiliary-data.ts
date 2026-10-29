import { blake2b } from '@cardano-sdk/crypto';

import { fail, ok } from '../result';

import { hashesOf } from './account-inspection';

import type { CustodyResult } from '../result';
import type { CustodyAccountHashes } from './outputs';
import type { CustodyRefusal } from './refusals';
import type { Cardano } from '@cardano-sdk/core';
import type { Serialization } from '@cardano-sdk/core';
import type { Hash32ByteBase16 } from '@cardano-sdk/crypto';

/**
 * The metadata a transaction carries, read from its auxiliary data and
 * bound to the signed body by the auxiliary data hash. Undefined without
 * any. A body that commits to auxiliary data the transaction does not
 * carry, or auxiliary data the body does not commit to by that hash, is
 * refused: a signature over the body would then authorise metadata consent
 * never saw. So is auxiliary data holding anything but metadata.
 */
export const readCustodyMetadata = (
  transaction: Serialization.Transaction,
  body: Cardano.TxBody,
): CustodyResult<Cardano.TxMetadata | undefined, CustodyRefusal> => {
  let auxiliaryData: Cardano.AuxiliaryData | undefined;
  let carried: string | undefined;
  try {
    const serialized = transaction.auxiliaryData();
    auxiliaryData = serialized?.toCore();
    // The body commits to the bytes the transaction carries, which another
    // valid encoding of the same data would not match.
    carried = serialized
      ? blake2b.hash<Hash32ByteBase16>(serialized.toCbor(), 32)
      : undefined;
  } catch {
    return fail({
      code: 'custody-unsupported-operation',
      reason: 'auxiliary-data-unreadable',
    });
  }
  const committed = body.auxiliaryDataHash?.toLowerCase();
  if (committed !== carried) {
    return fail({
      code: 'custody-unsupported-operation',
      reason: 'auxiliary-data-hash-mismatch',
    });
  }
  if ((auxiliaryData?.scripts?.length ?? 0) > 0) {
    return fail({
      code: 'custody-unsupported-operation',
      reason: 'auxiliary-data-scripts',
    });
  }
  const metadata = auxiliaryData?.blob;
  return ok(metadata && metadata.size > 0 ? metadata : undefined);
};

/**
 * A grant spend carrying metadata. An agent spends only what its grant
 * allows, and attaching data to the account's transactions is not among it.
 */
export const checkGrantSpendMetadata = (
  operated: readonly {
    readonly report: CustodyAccountHashes & {
      readonly grantSpend?: { readonly input: Cardano.TxIn };
    };
  }[],
  metadata: Cardano.TxMetadata | undefined,
): CustodyRefusal[] =>
  metadata === undefined
    ? []
    : operated.flatMap(({ report }): CustodyRefusal[] =>
        report.grantSpend
          ? [
              {
                code: 'custody-unsupported-operation',
                reason: 'grant-spend-metadata',
                account: hashesOf(report),
                input: report.grantSpend.input,
              },
            ]
          : [],
      );
