/**
 * The gated circuits that keep the account keys, named once so the flow
 * that submits a call, the authoriser that builds its challenge and the
 * signer that scopes a key session to it agree on the circuit. The
 * rotation replaces `enc_key`; an append writes one inbox entry: a live
 * holding re-encrypted towards the new key, a device envelope or
 * registration, or a grant record.
 */
export const ROTATE_ENC_KEY_CIRCUIT = 'rotate_enc_key_with_jubjub';
export const APPEND_INBOX_CIRCUIT = 'append_inbox_with_jubjub';
