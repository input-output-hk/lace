import { SplitGroup } from './types';

export const getSwapQuoteSources = (splitGroup: SplitGroup[]): string =>
  splitGroup.flatMap((groups) => groups.flatMap((group) => group.pools?.map((pool) => pool.dex))).join(', ');
