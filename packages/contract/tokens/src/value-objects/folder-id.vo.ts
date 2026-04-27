import type { Tagged } from 'type-fest';

export type FolderId = Tagged<string, 'FolderId'>;
export const FolderId = (id: string): FolderId => id as FolderId;
