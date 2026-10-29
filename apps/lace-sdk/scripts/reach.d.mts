/** Types for reach.mjs, for its TypeScript callers. */
import type ts from 'typescript';

export const packageDirectory: string;
export const compilerOptions: (
  channel?: 'canary' | 'stable',
) => ts.CompilerOptions;
export const channelEntries: (channel: 'canary' | 'stable') => string[];
export const reachedWorkspaceFiles: (
  roots: string[],
  options?: ts.CompilerOptions,
) => string[];
export const reachedOwnSource: (channel: 'canary' | 'stable') => Set<string>;
export const workspacePackages: (files: string[], root: string) => string[];
export const CARDANO_APPS: readonly string[];
export const cardanoReachedFiles: (apps?: readonly string[]) => string[];
