import { Tagged } from 'type-fest';

/**
 * Serialized 'bigint'.
 *
 * Example:
 * let serialized: BigNumber = BigNumber(123n);   // '123'
 * let x: bigint = BigNumber.valueOf(serialized); // 123n
 */
export type BigNumber = Tagged<string, 'BigNum'>;
export const BigNumber = (value: bigint) => value.toString() as BigNumber;
BigNumber.valueOf = BigInt;
BigNumber.abs = (value: BigNumber): bigint =>
  BigInt(value) < 0n ? -BigInt(value) : BigInt(value);
