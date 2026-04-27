import type { ConnectionContextId } from '@lace-contract/dapp-connector';
import type { Tagged } from 'type-fest';

/**
 * Extension-specific connection context identifier
 * Encodes tabId + frameId to uniquely identify a connection.
 */
export type ExtensionConnectionContextId = ConnectionContextId &
  Tagged<string, 'ExtensionConnectionContextId'>;

export const ExtensionConnectionContextId = (
  tabId: number,
  frameId: number,
): ExtensionConnectionContextId =>
  `${tabId}-${frameId}` as ExtensionConnectionContextId;
