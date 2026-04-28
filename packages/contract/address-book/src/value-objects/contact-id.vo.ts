import type { Tagged } from 'type-fest';

export type ContactId = Tagged<string, 'ContactId'>;
export const ContactId = (value: string) => value as ContactId;
