import type { Tagged } from 'type-fest';

/** The name of a module, the `moduleName` it declares. */
export type ModuleName = Tagged<string, 'ModuleName'>;
/** Types a string as a module's name, the `moduleName` it declares. It checks nothing. */
export const ModuleName = (moduleName: string) => moduleName as ModuleName;
