/**
 * UR type strings for the six Cardano Seed Signer messages. These must match
 * the firmware's QRType constants byte-for-byte (see
 * ../../angel/cardano-seedsigner/src/seedsigner/models/qr_type.py).
 */
export const CardanoUrType = {
  AccountRequest: 'cardano-account-req',
  Account: 'cardano-account',
  TxSignRequest: 'cardano-tx-sig-req',
  TxSignResponse: 'cardano-tx-sig-res',
  Cip8SignRequest: 'cardano-cip8-sig-req',
  Cip8SignResponse: 'cardano-cip8-sig-res',
} as const;

export type CardanoUrType = (typeof CardanoUrType)[keyof typeof CardanoUrType];
