import { Cardano } from '@cardano-sdk/core';
import { LOVELACE_TOKEN_ID } from '@lace-contract/cardano-context';
import { Milliseconds } from '@lace-lib/util';
import {
  measureRequestsUnderRetry,
  PERMANENT_STATUS,
  RETRIABLE_STATUS,
} from '@lace-lib/util-dev';
import {
  HttpClientError,
  PROVIDER_REQUEST_RETRY_CONFIG,
} from '@lace-lib/util-provider';
import { firstValueFrom } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Declaration side effects: `store/dependencies.ts` reads keys augmented onto
// the platform types (ADR 04), and nothing else in this suite imports either.
import '@lace-contract/crypto';

import '../../src/augmentations';
import { initializeDependencies } from '../../src/store/dependencies';

import type { CardanoProviderContext } from '@lace-contract/cardano-context';
import type { ModuleInitProps } from '@lace-contract/module';
import type { TokenId } from '@lace-contract/tokens';
import type * as CardanoProviderCore from '@lace-lib/cardano-provider-core';
import type { BlockfrostConfig } from '@lace-lib/cardano-provider-core';

const transport = vi.hoisted(() => ({
  issued: [] as string[],
  respond: async (_endpoint: string): Promise<{ data: unknown }> => ({
    data: {},
  }),
}));

// Only the client is faked, so the real provider, config assertion and
// memoization stay in the path. It must be one FIXED client: the provider is
// memoized on the config identifier, so a per-test client would be discarded.
vi.mock('@lace-lib/cardano-provider-core', async importActual => {
  const actual = await importActual<typeof CardanoProviderCore>();
  return {
    ...actual,
    getBlockfrostClient: () => ({
      request: async (endpoint: string) => {
        transport.issued.push(endpoint);
        return transport.respond(endpoint);
      },
    }),
  };
});

const PREPROD = Cardano.ChainIds.Preprod;

const blockfrostConfig: BlockfrostConfig = {
  clientConfig: {
    baseUrl: 'https://blockfrost.test',
    apiVersion: 'v0',
    projectId: 'test-project-id',
  },
  rateLimiterConfig: {
    size: 1,
    increaseAmount: 1,
    increaseInterval: Milliseconds(1000),
  },
};

const context: CardanoProviderContext = { chainId: PREPROD };

const txIn = {
  txId: Cardano.TransactionId(
    '4444444444444444444444444444444444444444444444444444444444444444',
  ),
  index: 0,
};
const ENDPOINT = `txs/${txIn.txId}/utxos`;

const PROTOCOL_PARAMETERS_ENDPOINT = 'epochs/latest/parameters';
const GENESIS_ENDPOINT = 'genesis';
const ERAS_ENDPOINT = 'network/eras';
/** `eraSummaries()` reads the system start first, and nothing caches it. */
const ERA_SUMMARIES_ATTEMPT = [GENESIS_ENDPOINT, ERAS_ENDPOINT];

/** A 28-byte policy id followed by the asset name `test`. */
const TOKEN_ID = `${'a'.repeat(56)}74657374` as TokenId;
const TOKEN_ENDPOINT = `assets/${TOKEN_ID}`;

/** `rho`/`a0`/`tau` are stringified by the SDK mapper — omit them and it throws. */
const PROTOCOL_PARAMETERS_RESPONSE = {
  data: { min_fee_a: 44, min_fee_b: 155_381, rho: 0.003, a0: 0.3, tau: 0.2 },
};

const GENESIS_RESPONSE = {
  data: {
    active_slots_coefficient: 0.05,
    epoch_length: 432_000,
    max_kes_evolutions: 62,
    max_lovelace_supply: '45000000000000000',
    network_magic: PREPROD.networkMagic,
    security_param: 2160,
    slot_length: 1,
    slots_per_kes_period: 129_600,
    system_start: 1_506_203_091,
    update_quorum: 5,
  },
};

const ERAS_RESPONSE = {
  data: [
    {
      start: { time: 0, slot: 0, epoch: 0 },
      end: { time: 89_856_000, slot: 4_492_800, epoch: 208 },
      parameters: { epoch_length: 21_600, slot_length: 20, safe_zone: 4320 },
    },
  ],
};

const TOKEN_RESPONSE = {
  data: {
    asset: TOKEN_ID,
    policy_id: 'a'.repeat(56),
    asset_name: '74657374',
    fingerprint: 'asset1384n874tzkcgkp2uanujjew8evjfvwevqfddap',
    quantity: '1000',
    initial_mint_tx_hash: 'a'.repeat(64),
    mint_or_burn_count: 1,
    onchain_metadata: null,
    metadata: { name: 'Tok', ticker: 'TOK', decimals: 6 },
  },
};

/**
 * The eras leg is downstream of the genesis leg, so a transport that fails
 * everything never reaches it and measures the wrong request.
 */
const genesisOkThen = (status: number) => async (endpoint: string) => {
  if (endpoint === GENESIS_ENDPOINT) return GENESIS_RESPONSE;
  throw new HttpClientError(status, 'injected');
};

const failWith = (status: number) => async () => {
  throw new HttpClientError(status, 'injected');
};

const init = async () =>
  initializeDependencies(
    {
      runtime: {
        config: {
          cardanoProvider: {
            blockfrostConfigs: { [PREPROD.networkMagic]: blockfrostConfig },
          },
        },
      },
      // The crypto addons are untouched by the provider leaves under test.
      loadModules: vi.fn().mockResolvedValue([{}]),
    } as unknown as ModuleInitProps,
    { logger: dummyLogger },
  );

describe('cardano-provider-blockfrost dependencies', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    transport.issued.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('resolveInput', () => {
    it('re-issues its request on every retry attempt', async () => {
      transport.respond = async () => {
        throw new HttpClientError(RETRIABLE_STATUS, 'unhealthy');
      };
      const { cardanoProvider } = await init();

      const attempts = await measureRequestsUnderRetry({
        call: () => cardanoProvider.resolveInput(txIn, context),
        requests: () => transport.issued,
        retry: PROVIDER_REQUEST_RETRY_CONFIG,
      });

      expect(attempts).toEqual(Array.from({ length: 4 }, () => ENDPOINT));
    });

    it('issues one request when the failure is permanent', async () => {
      transport.respond = async () => {
        throw new HttpClientError(PERMANENT_STATUS, 'forbidden');
      };
      const { cardanoProvider } = await init();

      const attempts = await measureRequestsUnderRetry({
        call: () => cardanoProvider.resolveInput(txIn, context),
        requests: () => transport.issued,
        retry: PROVIDER_REQUEST_RETRY_CONFIG,
      });

      expect(attempts).toEqual([ENDPOINT]);
    });

    it('issues one request and resolves the input when the provider answers', async () => {
      transport.respond = async () => ({
        data: {
          outputs: [
            {
              output_index: txIn.index,
              address:
                'addr_test1qrr7pflnkppvp49sl2hjs9v255ydycp8zxuxzfjw03vev9ns6cdlwymh7v9kr8cd8cy5vx8l7h6v9da84ml2cjd90fusnjsh8d',
              amount: [{ unit: 'lovelace', quantity: '2000000' }],
            },
          ],
        },
      });
      const { cardanoProvider } = await init();

      const result = await firstValueFrom(
        cardanoProvider.resolveInput(txIn, context),
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value?.value.coins).toBe(2_000_000n);
      }
      expect(transport.issued).toEqual([ENDPOINT]);
    });

    it('throws for an unconfigured network instead of deferring a retriable failure', async () => {
      const { cardanoProvider } = await init();

      expect(() =>
        cardanoProvider.resolveInput(txIn, {
          chainId: Cardano.ChainIds.Mainnet,
        }),
      ).toThrow('no blockfrost config found');
      expect(transport.issued).toEqual([]);
    });

    it('issues no request until something subscribes', async () => {
      transport.respond = async () => {
        throw new HttpClientError(RETRIABLE_STATUS, 'unhealthy');
      };
      const { cardanoProvider } = await init();

      cardanoProvider.resolveInput(txIn, context);
      await vi.advanceTimersByTimeAsync(0);

      expect(transport.issued).toEqual([]);
    });
  });

  describe('getProtocolParameters', () => {
    it('re-issues its request on every retry attempt', async () => {
      transport.respond = failWith(RETRIABLE_STATUS);
      const { cardanoProvider } = await init();

      const attempts = await measureRequestsUnderRetry({
        call: () => cardanoProvider.getProtocolParameters(context),
        requests: () => transport.issued,
        retry: PROVIDER_REQUEST_RETRY_CONFIG,
      });

      expect(attempts).toEqual(
        Array.from({ length: 4 }, () => PROTOCOL_PARAMETERS_ENDPOINT),
      );
    });

    it('issues one request when the failure is permanent', async () => {
      transport.respond = failWith(PERMANENT_STATUS);
      const { cardanoProvider } = await init();

      const attempts = await measureRequestsUnderRetry({
        call: () => cardanoProvider.getProtocolParameters(context),
        requests: () => transport.issued,
        retry: PROVIDER_REQUEST_RETRY_CONFIG,
      });

      expect(attempts).toEqual([PROTOCOL_PARAMETERS_ENDPOINT]);
    });

    it('issues one request and maps the parameters when the provider answers', async () => {
      transport.respond = async () => PROTOCOL_PARAMETERS_RESPONSE;
      const { cardanoProvider } = await init();

      const result = await firstValueFrom(
        cardanoProvider.getProtocolParameters(context),
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) expect(result.value.minFeeCoefficient).toBe(44);
      expect(transport.issued).toEqual([PROTOCOL_PARAMETERS_ENDPOINT]);
    });

    it('issues no request until something subscribes', async () => {
      transport.respond = failWith(RETRIABLE_STATUS);
      const { cardanoProvider } = await init();

      cardanoProvider.getProtocolParameters(context);
      await vi.advanceTimersByTimeAsync(0);

      expect(transport.issued).toEqual([]);
    });
  });

  describe('getEraSummaries', () => {
    it('re-issues both of its requests on every retry attempt', async () => {
      transport.respond = genesisOkThen(RETRIABLE_STATUS);
      const { cardanoProvider } = await init();

      const attempts = await measureRequestsUnderRetry({
        call: () => cardanoProvider.getEraSummaries(context),
        requests: () => transport.issued,
        retry: PROVIDER_REQUEST_RETRY_CONFIG,
      });

      expect(attempts).toEqual(
        Array.from({ length: 4 }, () => ERA_SUMMARIES_ATTEMPT).flat(),
      );
    });

    it('stops at the genesis leg when that is the leg that fails', async () => {
      transport.respond = failWith(RETRIABLE_STATUS);
      const { cardanoProvider } = await init();

      const attempts = await measureRequestsUnderRetry({
        call: () => cardanoProvider.getEraSummaries(context),
        requests: () => transport.issued,
        retry: PROVIDER_REQUEST_RETRY_CONFIG,
      });

      expect(attempts).toEqual(
        Array.from({ length: 4 }, () => GENESIS_ENDPOINT),
      );
    });

    it('issues one attempt when the failure is permanent', async () => {
      transport.respond = genesisOkThen(PERMANENT_STATUS);
      const { cardanoProvider } = await init();

      const attempts = await measureRequestsUnderRetry({
        call: () => cardanoProvider.getEraSummaries(context),
        requests: () => transport.issued,
        retry: PROVIDER_REQUEST_RETRY_CONFIG,
      });

      expect(attempts).toEqual(ERA_SUMMARIES_ATTEMPT);
    });

    it('issues one attempt and parses the summaries when the provider answers', async () => {
      transport.respond = async endpoint =>
        endpoint === GENESIS_ENDPOINT ? GENESIS_RESPONSE : ERAS_RESPONSE;
      const { cardanoProvider } = await init();

      const result = await firstValueFrom(
        cardanoProvider.getEraSummaries(context),
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].parameters.epochLength).toBe(21_600);
      }
      expect(transport.issued).toEqual(ERA_SUMMARIES_ATTEMPT);
    });

    it('issues no request until something subscribes', async () => {
      transport.respond = genesisOkThen(RETRIABLE_STATUS);
      const { cardanoProvider } = await init();

      cardanoProvider.getEraSummaries(context);
      await vi.advanceTimersByTimeAsync(0);

      expect(transport.issued).toEqual([]);
    });
  });

  describe('getTokenMetadata', () => {
    it('re-issues its request on every retry attempt', async () => {
      transport.respond = failWith(RETRIABLE_STATUS);
      const { cardanoProvider } = await init();

      const attempts = await measureRequestsUnderRetry({
        call: () =>
          cardanoProvider.getTokenMetadata({ tokenId: TOKEN_ID }, context),
        requests: () => transport.issued,
        retry: PROVIDER_REQUEST_RETRY_CONFIG,
      });

      expect(attempts).toEqual(Array.from({ length: 4 }, () => TOKEN_ENDPOINT));
    });

    it('issues one request when the failure is permanent', async () => {
      transport.respond = failWith(PERMANENT_STATUS);
      const { cardanoProvider } = await init();

      const attempts = await measureRequestsUnderRetry({
        call: () =>
          cardanoProvider.getTokenMetadata({ tokenId: TOKEN_ID }, context),
        requests: () => transport.issued,
        retry: PROVIDER_REQUEST_RETRY_CONFIG,
      });

      expect(attempts).toEqual([TOKEN_ENDPOINT]);
    });

    it('issues one request and maps the metadata when the provider answers', async () => {
      transport.respond = async () => TOKEN_RESPONSE;
      const { cardanoProvider } = await init();

      const result = await firstValueFrom(
        cardanoProvider.getTokenMetadata({ tokenId: TOKEN_ID }, context),
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) expect(result.value.ticker).toBe('TOK');
      expect(transport.issued).toEqual([TOKEN_ENDPOINT]);
    });

    it('throws for a malformed token id instead of deferring a retriable failure', async () => {
      const { cardanoProvider } = await init();

      expect(() =>
        cardanoProvider.getTokenMetadata(
          { tokenId: 'not-hex' as TokenId },
          context,
        ),
      ).toThrow('expected hex string');
      expect(transport.issued).toEqual([]);
    });

    it('serves lovelace without reaching the transport', async () => {
      const { cardanoProvider } = await init();

      const result = await firstValueFrom(
        cardanoProvider.getTokenMetadata(
          { tokenId: LOVELACE_TOKEN_ID },
          context,
        ),
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) expect(result.value.ticker).toBe('tADA');
      expect(transport.issued).toEqual([]);
    });

    it('issues no request until something subscribes', async () => {
      transport.respond = failWith(RETRIABLE_STATUS);
      const { cardanoProvider } = await init();

      cardanoProvider.getTokenMetadata({ tokenId: TOKEN_ID }, context);
      await vi.advanceTimersByTimeAsync(0);

      expect(transport.issued).toEqual([]);
    });
  });
});
