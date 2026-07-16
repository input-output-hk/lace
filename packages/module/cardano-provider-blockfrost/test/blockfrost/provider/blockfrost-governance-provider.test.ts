import { Cardano } from '@cardano-sdk/core';
import { Hash28ByteBase16 } from '@cardano-sdk/crypto';
import { firstValueFrom } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BlockfrostGovernanceProvider } from '../../../src/blockfrost';

import type { HttpClient } from '@lace-lib/util-provider';

// Valid bech32 DRep IDs (checksum-verified)
const mockDRepId = Cardano.DRepID(
  'drep1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqua9udh',
);
const mockDRepId2 = Cardano.DRepID(
  'drep1qyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqsz69txu6',
);
const SECOND_DREP_ID = mockDRepId2 as string;

// Blockfrost hex is CIP-129 encoded: 1 header byte + 28-byte hash (58 hex chars).
// Header 0x22 = key hash DRep, 0x23 = script hash DRep.
const makeListItem = (
  overrides: Partial<{
    drep_id: string;
    hex: string;
    amount: string;
    has_script: boolean;
    retired: boolean;
    expired: boolean;
    last_active_epoch: number | null;
    metadata: unknown;
  }> = {},
) => ({
  drep_id: mockDRepId as string,
  hex: '22aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111',
  amount: '1000000',
  has_script: false,
  retired: false,
  expired: false,
  last_active_epoch: 500,
  metadata: null,
  ...overrides,
});

const listItem2 = makeListItem({
  drep_id: mockDRepId2 as string,
  hex: '23bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222',
  amount: '2500000',
  has_script: true,
  expired: true,
});

describe('BlockfrostGovernanceProvider', () => {
  let provider: BlockfrostGovernanceProvider;
  let mockClient: HttpClient;

  beforeEach(() => {
    mockClient = {
      request: vi.fn(),
    } as unknown as HttpClient;

    provider = new BlockfrostGovernanceProvider(mockClient, dummyLogger);
  });

  describe('getDReps', () => {
    const mockList = (items: unknown[]) => {
      vi.mocked(mockClient.request).mockResolvedValueOnce({
        data: items,
        status: 200,
      });
    };

    it('maps list items to summaries including retired/expired and derived isActive', async () => {
      vi.mocked(mockClient.request).mockResolvedValueOnce({
        data: [makeListItem(), listItem2],
        status: 200,
      });

      const result = await firstValueFrom(provider.getDReps());

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([
          {
            drepId: mockDRepId,
            cip105DrepId: Cardano.DRepID.cip105FromCredential({
              hash: Hash28ByteBase16(
                '22aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111'.slice(
                  2,
                ),
              ),
              type: Cardano.CredentialType.KeyHash,
            }),
            hex: '22aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111',
            isActive: true,
            retired: false,
            expired: false,
            amount: '1000000',
            hasScript: false,
            name: undefined,
          },
          {
            drepId: mockDRepId2,
            cip105DrepId: Cardano.DRepID.cip105FromCredential({
              hash: Hash28ByteBase16(
                '23bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222'.slice(
                  2,
                ),
              ),
              type: Cardano.CredentialType.ScriptHash,
            }),
            hex: '23bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222',
            isActive: false,
            retired: false,
            expired: true,
            amount: '2500000',
            hasScript: true,
            name: undefined,
          },
        ]);
      }
      expect(mockClient.request).toHaveBeenCalledTimes(1);
      expect(mockClient.request).toHaveBeenCalledWith(
        'governance/dreps?page=1&count=100',
        undefined,
      );
    });

    it('loops pages until a page returns fewer than 100 items', async () => {
      const fullPage = Array.from({ length: 100 }, () => makeListItem());
      vi.mocked(mockClient.request)
        .mockResolvedValueOnce({ data: fullPage, status: 200 })
        .mockResolvedValueOnce({ data: fullPage, status: 200 })
        .mockResolvedValueOnce({ data: [makeListItem()], status: 200 });

      const result = await firstValueFrom(provider.getDReps());

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(201);
      }
      expect(mockClient.request).toHaveBeenCalledTimes(3);
      expect(mockClient.request).toHaveBeenNthCalledWith(
        2,
        'governance/dreps?page=2&count=100',
        undefined,
      );
      expect(mockClient.request).toHaveBeenNthCalledWith(
        3,
        'governance/dreps?page=3&count=100',
        undefined,
      );
    });

    it('stops after a page of exactly 100 followed by an empty page', async () => {
      const fullPage = Array.from({ length: 100 }, () => makeListItem());
      vi.mocked(mockClient.request)
        .mockResolvedValueOnce({ data: fullPage, status: 200 })
        .mockResolvedValueOnce({ data: [], status: 200 });

      const result = await firstValueFrom(provider.getDReps());

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(100);
      }
      expect(mockClient.request).toHaveBeenCalledTimes(2);
    });

    it('extracts name from inline metadata (plain string)', async () => {
      vi.mocked(mockClient.request).mockResolvedValueOnce({
        data: [
          makeListItem({
            metadata: {
              url: 'https://x.y/drep.json',
              hash: 'h',
              json_metadata: { body: { givenName: 'My DRep' } },
              bytes: null,
            },
          }),
        ],
        status: 200,
      });

      const result = await firstValueFrom(provider.getDReps());

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value[0].name).toBe('My DRep');
      }
    });

    it('extracts name from JSONLD @value format', async () => {
      vi.mocked(mockClient.request).mockResolvedValueOnce({
        data: [
          makeListItem({
            metadata: {
              url: 'https://x.y/drep.json',
              hash: 'h',
              json_metadata: {
                body: { givenName: { '@value': 'My JSONLD DRep' } },
              },
              bytes: null,
            },
          }),
        ],
        status: 200,
      });

      const result = await firstValueFrom(provider.getDReps());

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value[0].name).toBe('My JSONLD DRep');
      }
    });

    it('returns undefined name for null metadata or non-object json_metadata', async () => {
      vi.mocked(mockClient.request).mockResolvedValueOnce({
        data: [
          makeListItem({ metadata: null }),
          makeListItem({
            drep_id: mockDRepId2 as string,
            hex: '23bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222',
            metadata: {
              url: 'https://x.y/drep.json',
              hash: 'h',
              json_metadata: 'not-cip119',
              bytes: null,
            },
          }),
        ],
        status: 200,
      });

      const result = await firstValueFrom(provider.getDReps());

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value[0].name).toBeUndefined();
        expect(result.value[1].name).toBeUndefined();
      }
    });

    it('extracts full CIP-119 metadata into DRepSummary.metadata', async () => {
      const item = makeListItem({
        metadata: {
          url: 'https://info.hazelpool.com/drep.json',
          hash: '81c5',
          bytes: null,
          json_metadata: {
            body: {
              bio: { '@value': 'Software engineer of 20 years.' },
              email: { '@value': 'nils@example.com' },
              image: {
                '@type': 'ImageObject',
                sha256: 'd953a8',
                contentUrl: 'https://ipfs.io/ipfs/QmQuACD',
              },
              givenName: { '@value': 'Nils Codes' },
              objectives: { '@value': 'Keep the treasury safe.' },
              motivations: { '@value': 'Transparency.' },
              qualifications: { '@value': 'SPO since 2021.' },
              paymentAddress: { '@value': 'addr1q8gugy4w' },
              references: [
                {
                  '@type': 'Other',
                  label: { '@value': 'twitter' },
                  uri: { '@value': 'https://x.com/NilsCodes' },
                },
                {
                  '@type': 'Other',
                  label: 'stakepool',
                  uri: 'https://www.hazelpool.com',
                },
              ],
            },
          },
        },
      });
      mockList([item]);

      const result = await firstValueFrom(provider.getDReps());

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value[0].name).toBe('Nils Codes');
        expect(result.value[0].metadata).toEqual({
          metadataUrl: 'https://info.hazelpool.com/drep.json',
          metadataHash: '81c5',
          imageUrl: 'https://ipfs.io/ipfs/QmQuACD',
          bio: 'Software engineer of 20 years.',
          email: 'nils@example.com',
          objectives: 'Keep the treasury safe.',
          motivations: 'Transparency.',
          qualifications: 'SPO since 2021.',
          paymentAddress: 'addr1q8gugy4w',
          references: [
            { label: 'twitter', uri: 'https://x.com/NilsCodes' },
            { label: 'stakepool', uri: 'https://www.hazelpool.com' },
          ],
        });
      }
    });

    it('omits metadata when absent; keeps the anchor url/hash when the body is malformed', async () => {
      mockList([
        makeListItem({ metadata: null }),
        makeListItem({
          drep_id: SECOND_DREP_ID,
          metadata: {
            url: 'x',
            hash: 'y',
            bytes: null,
            json_metadata: 'garbage',
          },
        }),
      ]);

      const result = await firstValueFrom(provider.getDReps());

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value[0].metadata).toBeUndefined();
        expect(result.value[1].metadata).toEqual({
          metadataUrl: 'x',
          metadataHash: 'y',
        });
      }
    });

    it('drops malformed references and omits empty results', async () => {
      const item = makeListItem({
        metadata: {
          url: 'x',
          hash: 'y',
          bytes: null,
          json_metadata: {
            body: {
              givenName: 'Solo',
              references: [
                'not-an-object',
                { label: { '@value': 'no-uri' } },
                { uri: { '@value': 42 } },
              ],
            },
          },
        },
      });
      mockList([item]);

      const result = await firstValueFrom(provider.getDReps());

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value[0].name).toBe('Solo');
        expect(result.value[0].metadata).toEqual({
          metadataUrl: 'x',
          metadataHash: 'y',
        });
      }
    });

    it('filters out entries whose drep_id does not start with drep1', async () => {
      vi.mocked(mockClient.request).mockResolvedValueOnce({
        data: [makeListItem(), makeListItem({ drep_id: 'drep_script1abcdef' })],
        status: 200,
      });

      const result = await firstValueFrom(provider.getDReps());

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
      }
    });

    it('returns empty array when the first page is empty', async () => {
      vi.mocked(mockClient.request).mockResolvedValueOnce({
        data: [],
        status: 200,
      });

      const result = await firstValueFrom(provider.getDReps());

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(0);
      }
    });

    it('returns Err on API error (including mid-pagination)', async () => {
      const fullPage = Array.from({ length: 100 }, () => makeListItem());
      vi.mocked(mockClient.request)
        .mockResolvedValueOnce({ data: fullPage, status: 200 })
        .mockRejectedValueOnce(new Error('Network error'));

      const result = await firstValueFrom(provider.getDReps());

      expect(result.isErr()).toBe(true);
    });
  });
});
