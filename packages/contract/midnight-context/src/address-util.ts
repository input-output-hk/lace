import {
  DustAddress,
  MidnightBech32m,
  ShieldedAddress,
  UnshieldedAddress,
} from '@midnight-ntwrk/wallet-sdk-address-format';

import type { MidnightSDKNetworkId } from './const';
import type { MidnightAddressKind } from './types';
import type { Logger } from 'ts-log';

export const isShieldedAddress = (
  address: string,
  networkId: MidnightSDKNetworkId,
  logger?: Logger,
) => {
  try {
    return !!ShieldedAddress.codec.decode(
      networkId,
      MidnightBech32m.parse(address),
    );
  } catch (error) {
    logger?.error(error);
    return false;
  }
};

export const isUnshieldedAddress = (
  address: string,
  networkId: MidnightSDKNetworkId,
  logger?: Logger,
) => {
  try {
    return !!UnshieldedAddress.codec.decode(
      networkId,
      MidnightBech32m.parse(address),
    );
  } catch (error) {
    logger?.error(error);
    return false;
  }
};

export const isDustAddress = (
  address: string,
  networkId: MidnightSDKNetworkId,
  logger?: Logger,
) => {
  try {
    return !!DustAddress.codec.decode(
      networkId,
      MidnightBech32m.parse(address),
    );
  } catch (error) {
    logger?.error(error);
    return false;
  }
};

export const isValidMidnightAddress = (
  address: string,
  networkId: MidnightSDKNetworkId,
): boolean =>
  isShieldedAddress(address, networkId) ||
  isUnshieldedAddress(address, networkId) ||
  isDustAddress(address, networkId);

export const getAddressType = (
  address: string,
  networkId: MidnightSDKNetworkId,
): MidnightAddressKind => {
  if (isShieldedAddress(address, networkId)) {
    return 'shielded';
  } else if (isDustAddress(address, networkId)) {
    return 'dust';
  } else if (isUnshieldedAddress(address, networkId)) {
    return 'unshielded';
  }

  throw new Error('Invalid Midnight address');
};
