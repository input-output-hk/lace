import type { Tagged } from 'type-fest';

export type CustomDappId = Tagged<string, 'CustomDappId'>;
export const CustomDappId = (value: string) => value as CustomDappId;
