import * as v8 from '@midnight-ntwrk/ledger-v8';
import * as v9 from '@midnightntwrk/ledger-v9';
import {
  ProtocolVersion,
  WalletTransaction,
} from '@midnightntwrk/wallet-sdk-abstractions';
import { Either } from 'effect';

/** Read only within the handle's epoch and verify the ledger instance before use. */
export const readMidnightTransaction = (handle: WalletTransaction) => {
  const raw = WalletTransaction.unwrapWithin<
    | v8.FinalizedTransaction
    | v8.Transaction<v8.SignatureEnabled, v8.Proof, v8.PreBinding>
    | v8.UnprovenTransaction
    | v9.FinalizedTransaction
    | v9.Transaction<v9.SignatureEnabled, v9.Proof, v9.PreBinding>
    | v9.UnprovenTransaction
  >(
    handle,
    ProtocolVersion.epochOf(
      handle.protocolVersion,
      ProtocolVersion.V9NativeForkVersion,
    ),
  );
  if (Either.isLeft(raw)) throw raw.left;
  const ledger =
    handle.protocolVersion >= ProtocolVersion.V9NativeForkVersion ? v9 : v8;
  if (!(raw.right instanceof ledger.Transaction))
    throw new Error('Transaction ledger does not match its epoch');
  return raw.right;
};
