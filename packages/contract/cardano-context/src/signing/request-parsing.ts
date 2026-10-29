import { Cardano } from '@cardano-sdk/core';

import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';

/** The dApp sent a request whose named field the signer cannot read. */
export class MalformedRequestError extends Error {
  public readonly code = 'malformed-request' as const;
  public constructor(field: string) {
    super(`The sign request field "${field}" is malformed.`);
    this.name = 'MalformedRequestError';
  }
}

const XPUB_HEX = /^[\da-f]{128}$/i;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const parseChainId = (
  value: unknown,
  field = 'chainId',
): Cardano.ChainId => {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('networkId' in value) ||
    typeof value.networkId !== 'number' ||
    !('networkMagic' in value) ||
    typeof value.networkMagic !== 'number' ||
    !Number.isSafeInteger(value.networkMagic) ||
    value.networkMagic < 0
  ) {
    throw new MalformedRequestError(field);
  }
  const networkId = value.networkId as Cardano.NetworkId;
  if (
    networkId !== Cardano.NetworkId.Testnet &&
    networkId !== Cardano.NetworkId.Mainnet
  ) {
    throw new MalformedRequestError(field);
  }
  return { networkId, networkMagic: value.networkMagic };
};

export const parseAccountIndex = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new MalformedRequestError('accountIndex');
  }
  return value;
};

export const parseExtendedAccountPublicKey = (
  value: unknown,
  field = 'extendedAccountPublicKey',
): Bip32PublicKeyHex => {
  if (typeof value !== 'string' || !XPUB_HEX.test(value)) {
    throw new MalformedRequestError(field);
  }
  return value as Bip32PublicKeyHex;
};

export const parseArray = <T>(value: unknown, field: string): T[] => {
  if (!Array.isArray(value)) throw new MalformedRequestError(field);
  return value as T[];
};

export const parseString = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new MalformedRequestError(field);
  }
  return value;
};
