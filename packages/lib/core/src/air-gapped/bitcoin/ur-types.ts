/**
 * UR type strings for the Bitcoin SeedSigner messages over standard Blockchain
 * Commons UR (BC-UR2). These are the official BC-UR type registrations.
 */
export const BitcoinUrType = {
  Hdkey: 'crypto-hdkey',
  Account: 'crypto-account',
  Psbt: 'crypto-psbt',
} as const;

export type BitcoinUrType = (typeof BitcoinUrType)[keyof typeof BitcoinUrType];
