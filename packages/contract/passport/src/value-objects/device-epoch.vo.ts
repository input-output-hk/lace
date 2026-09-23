import type { Tagged } from 'type-fest';

/**
 * Key-rotation epoch of a device authoriser inside the Account Custody
 * Contract. Bumped when the device set changes so that a commitment made
 * under a retired epoch can no longer authorise anything.
 */
export type DeviceEpoch = Tagged<bigint, 'DeviceEpoch'>;
export const DeviceEpoch = (value: bigint): DeviceEpoch => value as DeviceEpoch;
