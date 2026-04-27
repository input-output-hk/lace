import type { Tagged } from 'type-fest';

export type TokenId = Tagged<string, 'TokenId'>;
export const TokenId = (tokenId: string) => tokenId as TokenId;
