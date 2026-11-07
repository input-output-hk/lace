import { displayableApy } from './realfi-yield';

export const formatStakingApy = (
  value: number | null | undefined,
): string | undefined => {
  const apy = displayableApy(value);
  return apy === undefined ? undefined : `${(apy * 100).toFixed(1)}%`;
};
