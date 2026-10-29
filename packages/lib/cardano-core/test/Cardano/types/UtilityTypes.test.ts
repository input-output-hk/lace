import { FractionUtils } from '../../../src/Cardano';

describe('Cardano/types/UtilityTypes', () => {
  describe('FractionUtils', () => {
    it('toFraction reduces a fraction and converts a number', () => {
      expect(
        FractionUtils.toFraction({ denominator: 6, numerator: 3 }),
      ).toEqual({
        denominator: 2,
        numerator: 1,
      });
      expect(FractionUtils.toFraction(0.25)).toEqual({
        denominator: 4,
        numerator: 1,
      });
      expect(FractionUtils.toFraction(2)).toEqual({
        denominator: 1,
        numerator: 2,
      });
    });

    it('toNumber evaluates a fraction and passes a number through', () => {
      expect(FractionUtils.toNumber({ denominator: 8, numerator: 3 })).toBe(
        0.375,
      );
      expect(FractionUtils.toNumber(0.5)).toBe(0.5);
    });
  });
});
