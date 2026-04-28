import { Cardano } from '@cardano-sdk/core';
import { logger } from '@cardano-sdk/util-dev';
import { CardanoPaymentAddress } from '@lace-contract/cardano-context';
import { TokenId } from '@lace-contract/tokens';
import { AccountId } from '@lace-contract/wallet-repo';
import { HttpClientError } from '@lace-lib/util-provider';
import { BigNumber } from '@lace-sdk/util';
import { firstValueFrom } from 'rxjs';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { BlockfrostTokensProvider } from '../../../src/blockfrost';
import { mockResponses } from '../util';

import type { Responses } from '@blockfrost/blockfrost-js';
import type { RawTokenWithoutContext } from '@lace-contract/tokens';
import type { HttpClient } from '@lace-lib/util-provider';
import type { Mock } from 'vitest';

describe('BlockfrostTokensProvider', () => {
  let request: Mock;
  let provider: BlockfrostTokensProvider;

  beforeEach(() => {
    request = vi.fn();
    const client = { request } as unknown as HttpClient;
    provider = new BlockfrostTokensProvider(client, logger);
  });

  describe('getTokens', () => {
    const accountId = AccountId('acc');
    const assetId = Cardano.AssetId(
      'b0d07d45fe9514f80213f4020e5a61241458be626841cde717cb38a76e7574636f696e',
    );
    const address = CardanoPaymentAddress(
      'addr_test1qzrljm7nskakjydxlr450ktsj08zuw6aktvgfkmmyw9semrkrezryq3ydtmkg0e7e2jvzg443h0ffzfwd09wpcxy2fuql9tk0g',
    );
    const responseBody: Responses['address_content'] = {
      address,
      amount: [
        { unit: 'lovelace', quantity: '12345678' },
        { unit: assetId, quantity: '123' },
      ],
      script: false,
      stake_address: null,
      type: 'shelley',
    };

    test('maps successful response', async () => {
      mockResponses(request, [
        [`addresses/${address}`, { data: responseBody }],
      ]);

      const result = await firstValueFrom(
        provider.getTokens({
          accountId,
          address,
        }),
      );

      expect(result.unwrap()).toEqual<RawTokenWithoutContext[]>(
        responseBody.amount.map(({ quantity, unit }) => ({
          available: quantity as BigNumber,
          pending: BigNumber(0n),
          tokenId: TokenId(unit),
        })),
      );
    });

    test('maps 404 into []', async () => {
      mockResponses(request, [
        [`addresses/${address}`, new HttpClientError(404)],
      ]);

      const result = await firstValueFrom(
        provider.getTokens({
          accountId,
          address,
        }),
      );

      expect(result.unwrap()).toEqual([]);
    });
  });
});
