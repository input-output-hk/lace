import type { Tagged } from 'type-fest';

/** Identifies a token folder, a user-named group of tokens. */
export type FolderId = Tagged<string, 'FolderId'>;
/** Types a string as the identifier of a token folder. It checks nothing. */
export const FolderId = (id: string): FolderId => id as FolderId;
