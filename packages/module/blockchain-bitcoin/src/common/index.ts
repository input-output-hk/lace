export * from './address';
export * from './keyDerivation';
export type * from './info';
export * from './taproot';
export * from './constants';
export type * from './transaction';
export {
  encodeUnsignedTxToString,
  decodeUnsignedTxFromString,
} from './transaction';

export const toUint8Array = (input: string): Uint8Array =>
  new Uint8Array(Buffer.from(input, 'utf-8'));
