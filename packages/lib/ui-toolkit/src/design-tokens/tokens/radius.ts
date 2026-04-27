const baseUnit = 4;

interface RadiusTokens {
  XS: number;
  S: number;
  SS?: number; // SS is not in the figma, but it is used in the code.
  M: number;
  MM?: number; // MM is not in the figma, but it is used in the code.
  L: number;
  XL: number;
  squareRounded: number;
  rounded: number;
}

// new radius based on figma
export const radius: RadiusTokens = {
  XS: baseUnit * 2, // 8
  S: baseUnit * 4, // 16
  SS: baseUnit * 5, // 20
  M: baseUnit * 6, // 24
  MM: baseUnit * 8, // 32
  L: baseUnit * 12, // 48
  XL: baseUnit * 13, // 52
  squareRounded: baseUnit * 10, // 40,
  rounded: baseUnit * 25, // 100,
};
