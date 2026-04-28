import type { Tagged } from 'type-fest';

export type ContractName = Tagged<string, 'Contract'>;
export const ContractName = (moduleKind: string) => moduleKind as ContractName;
