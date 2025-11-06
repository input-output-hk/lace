import { SplitGroup } from './types';

export const getSwapQuoteSources = (splitGroup: SplitGroup[]): string =>
  splitGroup
    .flatMap((groups) => groups.flatMap((group) => group.pools?.map((pool) => pool.dex) ?? []))
    .filter((dex): dex is string => dex !== undefined)
    .join(', ');
