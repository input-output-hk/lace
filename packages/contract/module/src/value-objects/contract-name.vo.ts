import type { Tagged } from 'type-fest';

/** The unique name of a contract, which modules reference to implement or depend on it. */
export type ContractName = Tagged<string, 'Contract'>;
/** Types a string as a contract's name. It checks nothing. */
export const ContractName = (moduleKind: string) => moduleKind as ContractName;
