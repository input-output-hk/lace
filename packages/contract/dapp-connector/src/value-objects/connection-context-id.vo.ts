import type { Tagged } from 'type-fest';

export type ConnectionContextId = Tagged<string, 'ConnectionContextId'>;

export const ConnectionContextId = (value: string): ConnectionContextId =>
  value as ConnectionContextId;
