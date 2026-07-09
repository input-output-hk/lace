import { describe, expect, it } from 'vitest';

import { getNftMetadataItems } from '../../src/pages/assetDetailBottomSheet/getNftMetadataItems';

import type { Token, TokenMetadataValue } from '@lace-contract/tokens';

type MetadataOverrides = Partial<NonNullable<Token['metadata']>> & {
  [key: string]: TokenMetadataValue | undefined;
};

const createMetadata = (
  overrides: MetadataOverrides = {},
): NonNullable<Token['metadata']> =>
  ({
    decimals: 0,
    blockchainSpecific: {},
    ...overrides,
  } as NonNullable<Token['metadata']>);

describe('getNftMetadataItems', () => {
  it('formats single-file metadata without numeric file indexes', () => {
    const items = getNftMetadataItems(
      createMetadata({
        blockchainSpecific: {
          files: [
            {
              displayName: 'coverImage',
              src: 'ipfs://ignored',
              mediaType: 'image/png',
            },
          ],
        },
      }),
    );

    expect(items).toEqual([
      {
        label: 'Files display name',
        value: 'coverImage',
        testID: 'files-display-name',
      },
    ]);
  });

  it('formats multi-file metadata with file indexes and kebab-cased test ids', () => {
    const items = getNftMetadataItems(
      createMetadata({
        blockchainSpecific: {
          files: [
            { displayName: 'coverImage' },
            { display_name: 'preview-image' },
          ],
        },
      }),
    );

    expect(items).toEqual([
      {
        label: 'Files 1 display name',
        value: 'coverImage',
        testID: 'files-1-display-name',
      },
      {
        label: 'Files 2 display name',
        value: 'preview-image',
        testID: 'files-2-display-name',
      },
    ]);
  });

  it('uses placeholders for empty objects and arrays and flattens deeply nested file metadata', () => {
    const items = getNftMetadataItems(
      createMetadata({
        blockchainSpecific: {
          files: [
            {
              attributes: {},
              tags: [],
              details: {
                authorProfile: {
                  fullName: 'Ana',
                },
              },
            },
          ],
        },
      }),
    );

    expect(items).toEqual([
      {
        label: 'Files attributes',
        value: '{}',
        testID: 'files-attributes',
      },
      {
        label: 'Files tags',
        value: '[]',
        testID: 'files-tags',
      },
      {
        label: 'Files details author profile full name',
        value: 'Ana',
        testID: 'files-details-author-profile-full-name',
      },
    ]);
  });

  it('preserves top-level structured values and filters excluded keys', () => {
    const items = getNftMetadataItems(
      createMetadata({
        name: 'Ignored NFT name',
        image: 'ignored-image',
        isNft: true,
        displayDecimalPlaces: 0,
        ticker: 'IGNORED',
        someCamelCase: { nestedValue: 1 },
        extra_flag: 'yes',
        additionalProperties: {
          customObject: { nested: true },
          customArray: [1, 'two'],
        },
        blockchainSpecific: {
          policyId: 'ignored-policy-id',
          updatedAt: 123,
          files: [
            {
              keepMe: 'ok',
              src: 'ipfs://ignored',
              mediaType: 'image/png',
            },
          ],
        },
      }),
    );

    expect(items).toEqual([
      {
        label: 'Some camel case',
        value: { nestedValue: 1 },
        testID: 'some-camel-case',
      },
      {
        label: 'Extra flag',
        value: 'yes',
        testID: 'extra-flag',
      },
      {
        label: 'Custom object',
        value: { nested: true },
        testID: 'custom-object',
      },
      {
        label: 'Custom array',
        value: [1, 'two'],
        testID: 'custom-array',
      },
      {
        label: 'Files keep me',
        value: 'ok',
        testID: 'files-keep-me',
      },
    ]);
  });
});
