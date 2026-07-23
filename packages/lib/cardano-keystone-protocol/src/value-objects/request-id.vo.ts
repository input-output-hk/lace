import { Buffer } from 'buffer';

import type { Tagged } from 'type-fest';

/** Length in bytes of a request id on the wire (a UUID, CBOR tag 37). */
export const REQUEST_ID_LENGTH = 16;

const UUID_PATTERN =
  /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

const UUID_GROUPS: readonly [number, number][] = [
  [0, 8],
  [8, 12],
  [12, 16],
  [16, 20],
  [20, 32],
];

/**
 * A request correlation id as a UUID string. It is encoded as 16 UUID bytes
 * on the wire and echoed by the device in its response so the host can match
 * a reply to its originating request.
 */
export type RequestId = Tagged<string, 'RequestId'>;

/** Wraps a UUID string as a {@link RequestId}, validating the format. */
export const RequestId = (value: string): RequestId => {
  if (!UUID_PATTERN.test(value)) {
    throw new Error(`request id must be a UUID string, got: ${value}`);
  }
  return value as RequestId;
};

RequestId.fromBytes = (bytes: Uint8Array): RequestId => {
  if (bytes.length !== REQUEST_ID_LENGTH) {
    throw new Error(
      `request id must be ${REQUEST_ID_LENGTH} bytes, got ${bytes.length}`,
    );
  }
  const hex = Buffer.from(bytes).toString('hex');
  return RequestId(
    UUID_GROUPS.map(([start, end]) => hex.slice(start, end)).join('-'),
  );
};
