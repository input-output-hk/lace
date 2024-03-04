import inRange from 'lodash/inRange';

export enum SaturationLevels {
  Medium = 'medium',
  High = 'high',
  Veryhigh = 'veryHigh',
}

const mediumUpperBound = 90;
const highUpperBound = 95;

const saturationLevelsRangeMap: Record<SaturationLevels, [number, number]> = {
  [SaturationLevels.Veryhigh]: [highUpperBound, Number.MAX_SAFE_INTEGER],
  [SaturationLevels.High]: [mediumUpperBound, highUpperBound],
  [SaturationLevels.Medium]: [0, mediumUpperBound],
};

const oversaturatedLowerBound = 100;
export const isOversaturated = (saturation: number): boolean =>
  inRange(saturation, oversaturatedLowerBound, Number.MAX_SAFE_INTEGER);

type Entries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];

export const getSaturationLevel = (saturation: number): SaturationLevels => {
  for (const [level, [min, max]] of Object.entries(saturationLevelsRangeMap) as Entries<
    typeof saturationLevelsRangeMap
  >) {
    if (inRange(saturation, min, max)) {
      return level;
    }
  }
  return SaturationLevels.Medium;
};
