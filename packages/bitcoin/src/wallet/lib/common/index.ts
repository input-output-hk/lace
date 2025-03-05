export * from './address';
export * from './keyDerivation';
export * from './network';
export * from './info';
export * from './taproot';

export const toUint8Array = (input: string) => {
  return new Uint8Array(Buffer.from(input, 'utf-8'));
};
