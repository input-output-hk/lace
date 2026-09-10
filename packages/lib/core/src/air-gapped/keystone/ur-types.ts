/**
 * UR type strings for the Keystone Cardano messages. These must match the
 * registry types defined by @keystonehq/bc-ur-registry (qr-hardware-call,
 * crypto-multi-accounts) and @keystonehq/bc-ur-registry-cardano (the
 * cardano-* types) so the device recognises scanned requests and the host can
 * route scanned responses. A tx-hash sign request is answered with the same
 * cardano-signature UR type as a full tx sign request.
 */
export const KeystoneUrType = {
  AccountRequest: 'qr-hardware-call',
  AccountResponse: 'crypto-multi-accounts',
  TxSignRequest: 'cardano-sign-request',
  TxHashSignRequest: 'cardano-sign-tx-hash-request',
  TxSignResponse: 'cardano-signature',
  DataSignRequest: 'cardano-sign-data-request',
  DataSignResponse: 'cardano-sign-data-signature',
} as const;

export type KeystoneUrType =
  (typeof KeystoneUrType)[keyof typeof KeystoneUrType];
