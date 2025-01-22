export const abs = (big: bigint | number | string): bigint => {
  const b = BigInt(big);
  return b < BigInt(0) ? b * BigInt(-1) : b;
};
