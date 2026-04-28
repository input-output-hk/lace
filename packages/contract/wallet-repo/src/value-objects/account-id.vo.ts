import type { Tagged } from 'type-fest';

export type AccountId = Tagged<string, 'AccountId'>;
export const AccountId = (value: string) => value as AccountId;
