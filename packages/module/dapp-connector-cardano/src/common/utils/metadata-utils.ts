import { metadatum } from '@cardano-sdk/core';

import type { Cardano } from '@cardano-sdk/core';

/**
 * JSON stringify indent size for formatted metadata output.
 */
const JSON_STRINGIFY_INDENT = 2;

/**
 * Custom JSON replacer function that handles non-JSON-native types.
 * Converts BigInt values to strings and Uint8Array values to regular arrays.
 *
 * @param _key - The current key being processed (unused but required by replacer signature)
 * @param value - The value being processed
 * @returns The processed value suitable for JSON serialization
 */
export const jsonReplacer = (_key: unknown, value: unknown): unknown => {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (value instanceof Uint8Array) {
    return [...value];
  }

  return value;
};

/**
 * Formats auxiliary data metadata blob as a human-readable JSON string.
 * Converts Cardano metadatum types to JSON and handles BigInt/Uint8Array serialization.
 *
 * @param auxiliaryData - The Cardano auxiliary data containing the metadata blob
 * @returns A formatted JSON string with 2-space indentation, or null if no blob exists
 */
export const formatMetadataForDisplay = (
  auxiliaryData: Cardano.AuxiliaryData,
): string | null => {
  if (!auxiliaryData.blob) {
    return null;
  }

  const metadatumJson: unknown = metadatum.metadatumToJson(auxiliaryData.blob);

  return JSON.stringify(metadatumJson, jsonReplacer, JSON_STRINGIFY_INDENT);
};
