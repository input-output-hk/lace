import type { Token, TokenMetadataValue } from '@lace-contract/tokens';

type MetadataItem = {
  label: string;
  value: TokenMetadataValue;
  testID: string;
};

const EXCLUDED_METADATA_KEYS = new Set([
  'image',
  'name',
  'isNft',
  'decimals',
  'displayDecimalPlaces',
  'ticker',
  'tokenId',
  'mediaType',
  'version',
]);

const EXCLUDED_FILE_METADATA_KEYS = new Set(['mediaType', 'src']);

const toWords = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();

const toDisplayLabel = (parts: string[]) =>
  parts
    .map((part, index) => {
      const words = toWords(part);

      return index === 0
        ? words.charAt(0).toUpperCase() + words.slice(1)
        : words;
    })
    .join(' ');

const trimDashes = (s: string): string => {
  let start = 0;
  let end = s.length;
  while (start < end && s[start] === '-') start++;
  while (end > start && s[end - 1] === '-') end--;
  return s.slice(start, end);
};

const toTestId = (parts: string[]) =>
  trimDashes(parts.map(part => toWords(part).replace(/\s+/g, '-')).join('-'));

const toMetadataItem = (
  labelParts: string[],
  value: TokenMetadataValue,
): MetadataItem => ({
  label: toDisplayLabel(labelParts),
  value,
  testID: toTestId(labelParts),
});

const flattenFileMetadataValue = (
  labelParts: string[],
  value: TokenMetadataValue,
): MetadataItem[] => {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [toMetadataItem(labelParts, '[]')];
    }

    return value.flatMap((item, index) =>
      flattenFileMetadataValue(
        value.length > 1 ? [...labelParts, String(index + 1)] : labelParts,
        item,
      ),
    );
  }

  if (value && typeof value === 'object') {
    if (labelParts[labelParts.length - 1] === 'additionalProperties') {
      if (Object.keys(value).length === 0) {
        return [];
      }

      return [toMetadataItem(labelParts, value)];
    }

    const entries = Object.entries(value);

    if (entries.length === 0) {
      return [toMetadataItem(labelParts, '{}')];
    }

    return entries.flatMap(([nestedLabel, nestedValue]) =>
      EXCLUDED_FILE_METADATA_KEYS.has(nestedLabel)
        ? []
        : flattenFileMetadataValue([...labelParts, nestedLabel], nestedValue),
    );
  }

  return [toMetadataItem(labelParts, value)];
};

const isVisibleMetadataKey = (key: string) => !EXCLUDED_METADATA_KEYS.has(key);

export const getNftMetadataItems = (
  metadata?: Token['metadata'],
): MetadataItem[] => {
  if (!metadata) {
    return [];
  }

  const {
    additionalProperties = {},
    blockchainSpecific,
    ...restMetadata
  } = metadata;
  const {
    files,
    policyId: _policyId,
    updatedAt: _updatedAt,
  } = (blockchainSpecific as {
    files?: TokenMetadataValue;
    policyId?: string;
    updatedAt?: number;
  }) ?? {};

  const metadataEntries = {
    ...Object.fromEntries(
      Object.entries(restMetadata).filter(([key]) => isVisibleMetadataKey(key)),
    ),
    ...additionalProperties,
  };

  return [
    ...Object.entries(metadataEntries)
      .filter(([label]) => isVisibleMetadataKey(label))
      .map(([label, value]) => toMetadataItem([label], value)),
    ...(files ? flattenFileMetadataValue(['files'], files) : []),
  ];
};
