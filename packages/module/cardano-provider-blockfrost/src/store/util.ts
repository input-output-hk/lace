import { CARDANO_TOKEN_METADATA_SCHEMA_VERSION } from '@lace-contract/cardano-context';
import { Blockchains } from '@lace-lib/ui-toolkit/src/design-system/atoms/icons/urls';
import { Timestamp } from '@lace-sdk/util';

import type { Asset, Cardano } from '@cardano-sdk/core';
import type {
  CardanoTokenMetadata,
  CardanoTokenMetadataFile,
} from '@lace-contract/cardano-context';
import type { TokenMetadata, TokenMetadataValue } from '@lace-contract/tokens';

type SerializeMetadatum = {
  (value: Cardano.Metadatum, stringifyComposite: true): string;
  (value: Cardano.Metadatum, stringifyComposite?: false): TokenMetadataValue;
};

const serializeMetadatum = ((value, stringifyComposite = false) => {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (Array.isArray(value)) {
    const serializedItems = value.map(item => serializeMetadatum(item));
    return stringifyComposite
      ? JSON.stringify(serializedItems)
      : serializedItems;
  }

  if (value instanceof Map) {
    const serializedEntries = Object.fromEntries(
      [...value.entries()].map(([key, nestedValue]) => [
        metadatumKeyToString(key),
        serializeMetadatum(nestedValue),
      ]),
    );
    return stringifyComposite
      ? JSON.stringify(serializedEntries)
      : serializedEntries;
  }

  if (value instanceof Uint8Array) {
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(value);
    } catch {
      return `[Invalid UTF-8: ${value.length} bytes]`;
    }
  }

  return String(value);
}) as SerializeMetadatum;

const metadatumKeyToString = (value: Cardano.Metadatum): string =>
  serializeMetadatum(value, true);

const metadatumToSerializableValue = (
  value: Cardano.Metadatum,
): TokenMetadataValue => serializeMetadatum(value);

const mapToRecord = (
  map?: Map<string, Cardano.Metadatum>,
): Record<string, TokenMetadataValue> | undefined =>
  [...(map?.entries() || [])]
    .map(([key, value]): [string, TokenMetadataValue] => [
      key,
      metadatumToSerializableValue(value),
    ])
    .reduce((result, [key, value]) => {
      result[key] = value;
      return result;
    }, {} as Record<string, TokenMetadataValue>);

const mergeDefinedProperties = (
  properties: Array<[string, TokenMetadataValue | undefined]>,
): Record<string, TokenMetadataValue> | undefined => {
  const definedProperties = properties.filter(
    (property): property is [string, TokenMetadataValue] =>
      // Tuple index 1 is the property value. Filters out tuples whose value slot is undefined
      property[1] !== undefined,
  );

  if (definedProperties.length === 0) {
    return undefined;
  }

  return Object.fromEntries(definedProperties);
};

export const toContractTokenMetadata = (
  assetInfo: Asset.AssetInfo,
): TokenMetadata<CardanoTokenMetadata> => ({
  blockchainSpecific: {
    metadataSchemaVersion: CARDANO_TOKEN_METADATA_SCHEMA_VERSION,
    updatedAt: Timestamp.now(),
    policyId: assetInfo.policyId.toString(),
    files: assetInfo.nftMetadata?.files?.map(
      (file): CardanoTokenMetadataFile => ({
        mediaType: file.mediaType,
        src: file.src,
        name: file.name,
        additionalProperties: mapToRecord(file.otherProperties),
      }),
    ),
  },
  decimals: assetInfo.tokenMetadata?.decimals || 0,
  additionalProperties: mergeDefinedProperties([
    ['description', assetInfo.nftMetadata?.description],
    ...Object.entries(
      mapToRecord(assetInfo.nftMetadata?.otherProperties) ?? {},
    ),
  ]),
  image: assetInfo.nftMetadata?.image || assetInfo.tokenMetadata?.icon,
  isNft: assetInfo.supply === 1n,
  name:
    assetInfo.nftMetadata?.name ||
    assetInfo.tokenMetadata?.name ||
    assetInfo.fingerprint,
  ticker: assetInfo.tokenMetadata?.ticker,
});

/** Base lovelace metadata; ticker is overridden per-network in Blockfrost dependencies. */
export const LOVELACE_METADATA: TokenMetadata<CardanoTokenMetadata> = {
  decimals: 6,
  name: 'Cardano',
  ticker: 'ADA',
  image: Blockchains.Cardano,
  blockchainSpecific: {
    metadataSchemaVersion: CARDANO_TOKEN_METADATA_SCHEMA_VERSION,
    updatedAt: Timestamp.now(),
  },
};
