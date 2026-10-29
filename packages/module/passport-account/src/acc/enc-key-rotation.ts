import {
  APPEND_INBOX_CIRCUIT,
  ROTATE_ENC_KEY_CIRCUIT,
} from './enc-key-circuits';

import type { GrantCircuitCall } from './grants';

/** Prepares `rotate_enc_key_with_jubjub` over the raw 32-byte X25519 key `enc_key` is replaced with. */
export const prepareRotateEncKey = (newKey: Uint8Array): GrantCircuitCall => ({
  circuit: ROTATE_ENC_KEY_CIRCUIT,
  args: [newKey],
});

/** Prepares `append_inbox_with_jubjub` over one inbox entry: a re-encrypted coin or a Lace record. */
export const prepareAppendInbox = (entry: Uint8Array): GrantCircuitCall => ({
  circuit: APPEND_INBOX_CIRCUIT,
  args: [entry],
});
