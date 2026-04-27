import type { Tagged } from 'type-fest';

export type DappId = Tagged<string, 'DappId'>;
export const DappId = (dappId: string) => dappId as DappId;
