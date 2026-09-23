import { HexBytes } from '@lace-lib/util';

import type { Tagged } from 'type-fest';

/**
 * One SDK-serialised wallet blob as persisted. Two encodings live under this
 * type and both must be handled on read:
 *
 * - verbatim — the JSON string the SDK returns, written since LW-14981;
 * - legacy hex — `HexBytes` of that same JSON, on profiles created before it.
 *
 * Hex is no longer written: encoding doubled a multi-megabyte payload and the
 * `Buffer.from(hugeString)` it forced OOM-crashed the MV3 service worker.
 * Read through `toJSON`, never the raw string.
 */
export type SerialisedWalletState = Tagged<string, 'SerialisedWalletState'>;

/**
 * Either encoding. Production only ever constructs this from the SDK's
 * verbatim JSON; the hex form comes back from storage on older profiles.
 */
export const SerialisedWalletState = (value: string): SerialisedWalletState =>
  value as SerialisedWalletState;

/**
 * A heuristic over the values we actually persist, not a parse: hex and JSON
 * overlap (`12345678` is both), so nothing can separate them in general. Every
 * blob written here opens with `{`; `[` is headroom for a serialiser that
 * returns a top-level array. Anything else reads as hex, and a wrong guess
 * costs a rebuild from seed, which the restore path already handles.
 *
 * First character only: matching hex across the whole payload cost ~2500ms
 * against 10k documents of 100k characters, against ~8ms here, and was
 * case-sensitive so it missed uppercase hex besides.
 */
const isVerbatimJson = (value: string): boolean =>
  value.startsWith('{') || value.startsWith('[');

SerialisedWalletState.toJSON = (value: SerialisedWalletState): string =>
  isVerbatimJson(value) ? value : HexBytes.toUTF8(value as unknown as HexBytes);
