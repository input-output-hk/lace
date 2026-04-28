import type { Tagged } from 'type-fest';

export type ModuleName = Tagged<string, 'ModuleName'>;
export const ModuleName = (moduleName: string) => moduleName as ModuleName;
