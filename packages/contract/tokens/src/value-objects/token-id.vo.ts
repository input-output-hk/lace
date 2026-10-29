import type { Tagged } from 'type-fest';

/** Identifies a token, unique on its blockchain. */
export type TokenId = Tagged<string, 'TokenId'>;
/** Types a string as a token identifier, unique on its blockchain. It checks nothing. */
export const TokenId = (tokenId: string) => tokenId as TokenId;
