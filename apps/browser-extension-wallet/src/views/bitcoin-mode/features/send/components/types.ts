import { HandleResolution } from '@cardano-sdk/core';

export type AddressValue = {
  isHandle: boolean;
  address: string;
  resolvedAddress: string;
  handleResolution?: HandleResolution;
};

export enum HandleVerificationState {
  VALID = 'valid',
  INVALID = 'invalid',
  VERIFYING = 'verifying',
  CHANGED_OWNERSHIP = 'changedOwnership'
}
