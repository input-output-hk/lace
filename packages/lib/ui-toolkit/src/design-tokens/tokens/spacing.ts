const baseUnit = 4;

interface SpacingTokens {
  XS: number;
  S: number;
  M: number;
  L: number;
  XL: number;
  XXL: number;
  XXXL: number;
  XXXXL: number;
}

export const spacing: SpacingTokens = {
  XS: baseUnit * 1, // 4
  S: baseUnit * 2, // 8
  M: baseUnit * 4, // 16
  L: baseUnit * 6, // 24
  XL: baseUnit * 8, // 32
  XXL: baseUnit * 10, // 40
  XXXL: baseUnit * 12, // 48
  XXXXL: baseUnit * 24, // 96
};
