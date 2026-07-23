import { readArrayItems, readUint } from '@lace-lib/ur-transport';

import { DerivationPath } from '../value-objects/derivation-path.vo';
import { Xfp } from '../value-objects/xfp.vo';

import type { CborReader, CborWriter } from '@lace-lib/ur-transport';

/** Writes a derivation path as a definite-length array of component ints. */
export const writePath = (
  writer: CborWriter,
  path: readonly number[],
): void => {
  writer.writeStartArray(path.length);
  for (const component of path) {
    writer.writeInt(component);
  }
};

/** Reads and validates a derivation path. */
export const readPath = (reader: CborReader): DerivationPath =>
  DerivationPath(readArrayItems(reader, readUint));

/** Validates an xfp byte string read from the wire. */
export const checkXfp = (
  value: Uint8Array,
  { allowEmpty }: { allowEmpty: boolean },
): Xfp => Xfp(value, { allowEmpty });
