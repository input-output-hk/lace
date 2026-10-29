import {
  applyMidnightSignedMessagePrefix,
  decodeMidnightSignData,
} from '@lace-lib/vendor/midnight-sign-data';
import { defer, map } from 'rxjs';

import { withMidnightWallet } from './midnight-wallet';

import type {
  MidnightAccountProps,
  WalletWithMidnight,
} from './midnight-wallet';
import type { Result } from '@lace-lib/util';
import type {
  Signature,
  SignDataOptions,
} from '@midnight-ntwrk/dapp-connector-api';

/** Connector message signing options and the account whose unshielded key signs. */
export interface SignMidnightDataProps extends MidnightAccountProps {
  /** Original payload in the selected transport encoding; echoed unchanged in the result. */
  data: string;
  options: SignDataOptions;
}

/**
 * Signs a connector-compatible message with the selected account's unshielded
 * NIGHT key. Obtain consumer consent for this payload and account before calling;
 * this helper shows no prompt and the module's password unlocks the key.
 *
 * Decodes hex/base64 with Buffer (including permissive malformed input), or text
 * as UTF-8, then prefixes `midnight_signed_message:<byteLength>:`. Empty payloads
 * still receive the prefix. Only the `unshielded` key type is supported.
 * Returns the original payload, signature and verifying key. Account resolution,
 * unsupported options and signing failures settle as `Err<Error>`.
 */
export const signMidnightData = async (
  wallet: WalletWithMidnight,
  { data, options, ...account }: SignMidnightDataProps,
): Promise<Result<Signature, Error>> =>
  withMidnightWallet(wallet, account, midnightWallet =>
    defer(() => {
      if (options.keyType !== 'unshielded') {
        throw new Error(`Unsupported key type: ${String(options.keyType)}`);
      }
      const bytes = applyMidnightSignedMessagePrefix(
        decodeMidnightSignData(data, options.encoding),
      );
      return midnightWallet.signData(bytes).pipe(
        map(({ signature, verifyingKey }) => ({
          data,
          signature,
          verifyingKey,
        })),
      );
    }),
  );
