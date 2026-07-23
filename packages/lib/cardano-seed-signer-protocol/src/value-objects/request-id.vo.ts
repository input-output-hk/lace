import type { Tagged } from 'type-fest';

/**
 * A request correlation id (typically a UUID string) echoed by the device in
 * its response so the host can match a reply to its originating request. May be
 * the empty string for menu-initiated exports on the device.
 */
export type RequestId = Tagged<string, 'RequestId'>;
export const RequestId = (value: string): RequestId => value as RequestId;
