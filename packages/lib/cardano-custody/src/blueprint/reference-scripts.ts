// Copied from Biglup/cardano-account-custody-contract
// offchain/networks/preprod.json at revision
// b48545f4be850c1044de2dbeb51751718b4b8e70 (Apache-2.0). Modified for Lace:
// the records as TypeScript constants, so runtime code never loads the file.
// test/blueprint.test.ts ties them to the vendored preprod.json and to the
// vendored scripts.

import type { Cardano } from '@cardano-sdk/core';
import type { Hash28ByteBase16 } from '@cardano-sdk/crypto';

/**
 * A UTxO the contract's network setup created to hold one contract script as
 * its reference script, so a transaction can reference the script instead of
 * attaching it. It sits at a script address no transaction can spend from.
 */
export interface CustodyReferenceScript {
  /** Hash of the script the UTxO carries. */
  readonly scriptHash: Hash28ByteBase16;
  /** The UTxO's output reference, which a transaction lists among its reference inputs. */
  readonly txIn: Cardano.TxIn;
  /**
   * The UTxO's address. With `coins` and the script it rebuilds the UTxO, so
   * a builder can price the reference script without a chain lookup.
   */
  readonly address: Cardano.PaymentAddress;
  /** The lovelace the UTxO holds. */
  readonly coins: bigint;
}

/** The account proxy and logic version 1, parked on Preprod. */
export const PREPROD_REFERENCE_SCRIPTS: readonly CustodyReferenceScript[] = [
  {
    scriptHash:
      'ed61963ac94d12c0b320be5a336c36af66bc02c380e0aa3001899253' as Hash28ByteBase16,
    txIn: {
      txId: '574e6c3d2e64303015f4db89930848b47fef501c65c448a59d843a383a63fc7e' as Cardano.TransactionId,
      index: 0,
    },
    address:
      'addr_test1wqkddr3e300el0ydy4mpfd2yqdz3aeez2g8v0p07znud7ksuhmmkz' as Cardano.PaymentAddress,
    coins: 12_692_950n,
  },
  {
    scriptHash:
      '2cd68e398bdf9fbc8d257614b54403451ee722520ec785fe14f8df5a' as Hash28ByteBase16,
    txIn: {
      txId: '000b0715bb8613761555becc9b50105dd3e23b93f91bce01dea72c3bbd0228f8' as Cardano.TransactionId,
      index: 0,
    },
    address:
      'addr_test1wqkddr3e300el0ydy4mpfd2yqdz3aeez2g8v0p07znud7ksuhmmkz' as Cardano.PaymentAddress,
    coins: 40_281_260n,
  },
];
