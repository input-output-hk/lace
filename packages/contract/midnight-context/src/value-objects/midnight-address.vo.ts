import type { Address } from '@lace-contract/addresses';
import type { Tagged } from 'type-fest';

export type MidnightAddress = Address & Tagged<string, 'MidnightAddress'>;
export const MidnightAddress = (address: string) => address as MidnightAddress;

export type MidnightShieldedAddress = MidnightAddress &
  Tagged<string, 'MidnightShieldedAddress'>;
export const MidnightShieldedAddress = (address: string) =>
  address as MidnightShieldedAddress;

export type MidnightUnshieldedAddress = MidnightAddress &
  Tagged<string, 'MidnightUnshieldedAddress'>;
export const MidnightUnshieldedAddress = (address: string) =>
  address as MidnightUnshieldedAddress;

export type MidnightDustAddress = MidnightAddress &
  Tagged<string, 'MidnightDustAddress'>;
export const MidnightDustAddress = (address: string) =>
  address as MidnightDustAddress;
