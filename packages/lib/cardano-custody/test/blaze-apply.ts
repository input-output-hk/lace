import { applyParams } from '@blaze-cardano/uplc';
import { Serialization } from '@cardano-sdk/core';

type BlazeHex = Parameters<typeof applyParams>[0];
type BlazeData = Parameters<typeof applyParams>[1];

/**
 * Applies byte-string parameters with the generic UPLC applier the tests
 * trust as an oracle. Blaze bundles its own @cardano-sdk/core copy, so
 * values cross only as hex, and as plain objects whose `toCore()` yields the
 * parameter bytes.
 */
export const blazeApply = (
  compiledCode: string,
  ...parameters: string[]
): string =>
  applyParams(
    compiledCode as unknown as BlazeHex,
    ...parameters.map(
      parameter =>
        Serialization.PlutusData.newBytes(
          Buffer.from(parameter, 'hex'),
        ) as unknown as BlazeData,
    ),
  );
