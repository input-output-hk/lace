import FractionJs from 'fraction.js';

export interface Fraction {
  numerator: number;
  denominator: number;
}

const toFractionJs = (value: Fraction | number): FractionJs => {
  if (typeof value === 'number') {
    return new FractionJs(value);
  }
  const { numerator, denominator } = value;
  return new FractionJs(numerator, denominator);
};

export const FractionUtils = {
  toFraction(value: Fraction | number): Fraction {
    const fractionJs = toFractionJs(value);
    const { n: numerator, d: denominator } = fractionJs;
    return { denominator, numerator };
  },
  toNumber(value: Fraction | number): number {
    const fractionJs = toFractionJs(value);
    return fractionJs.valueOf();
  },
};
