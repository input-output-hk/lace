import { Err, Ok } from '@lace-lib/util';
import { testSideEffect } from '@lace-lib/util-dev';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { FEATURE_FLAG_REALFI } from '../../src/const';
import { CARDANO_NETWORK_MAGIC } from '../../src/realfi-network-config';
import { makeYieldInfo } from '../../src/store/side-effects';
import { realfiStakingActions } from '../../src/store/slice';

import type {
  RealFiExchangeRateAndApy,
  RealFiProviderError,
} from '../../src/provider-types';
import type { Percent } from '@cardano-sdk/util';
import type { BlockchainNetworkId } from '@lace-contract/network';
import type { Milliseconds } from '@lace-lib/util';

const previewNetworkId =
  `cardano-${CARDANO_NETWORK_MAGIC.preview}` as BlockchainNetworkId;

const realfiFlag = {
  key: FEATURE_FLAG_REALFI,
  payload: { preview: {} },
};

const yieldInfo: RealFiExchangeRateAndApy = {
  apy: 0.082 as Percent,
  exchangeRate: 1.05,
  fetchedAt: 1_700_000_000_000 as Milliseconds,
};

const actions = realfiStakingActions;

const runYieldInfo = (
  getExchangeRateAndApy: ReturnType<typeof vi.fn>,
  assert: (emissions: unknown[]) => void,
  {
    featureFlags = [realfiFlag],
    persistedYieldInfoByNetwork = {},
  }: {
    featureFlags?: (typeof realfiFlag)[];
    persistedYieldInfoByNetwork?: Record<string, RealFiExchangeRateAndApy>;
  } = {},
) => {
  const provider = { getExchangeRateAndApy } as never;
  testSideEffect(makeYieldInfo, ({ hot, flush }) => ({
    actionObservables: {
      realfiPosition: {
        yieldInfoRequested$: hot('-a', {
          a: actions.realfiPosition.yieldInfoRequested(),
        }),
      },
    },
    stateObservables: {
      realfiPosition: {
        selectYieldInfoByNetwork$: of(persistedYieldInfoByNetwork),
      },
      network: {
        selectActiveNetworkId$: of(() => previewNetworkId),
      },
      features: {
        selectLoadedFeatures$: of({ featureFlags, modules: [] }),
      },
    },
    dependencies: { actions, realfiProviders: [provider] },
    assertion: sideEffect$ => {
      const emissions: unknown[] = [];
      sideEffect$.subscribe(action => emissions.push(action));
      flush();
      assert(emissions);
    },
  }));
};

describe('makeYieldInfo', () => {
  it('reads the exchange rate + APY and stores it under the active RealFi network', () => {
    const read = vi.fn(() => of(Ok(yieldInfo)));
    runYieldInfo(read, emissions => {
      expect(read).toHaveBeenCalledTimes(1);
      const request = (read.mock.calls[0] as unknown[])[0] as {
        config: { realfiNetwork: string };
      };
      expect(request.config.realfiNetwork).toBe('preview');
      expect(emissions).toEqual([
        actions.realfiPosition.yieldInfoReceived({
          realfiNetwork: 'preview',
          yieldInfo,
        }),
      ]);
    });
  });

  it('serves a fresh persisted value without fetching (the boot prime re-fires every start)', () => {
    const read = vi.fn(() => of(Ok(yieldInfo)));
    runYieldInfo(
      read,
      emissions => {
        expect(read).not.toHaveBeenCalled();
        expect(emissions).toEqual([]);
      },
      {
        persistedYieldInfoByNetwork: {
          preview: { ...yieldInfo, fetchedAt: Date.now() as Milliseconds },
        },
      },
    );
  });

  it('refetches when the persisted value is older than the refresh TTL', () => {
    const read = vi.fn(() => of(Ok(yieldInfo)));
    runYieldInfo(
      read,
      emissions => {
        expect(read).toHaveBeenCalledTimes(1);
        expect(emissions).toHaveLength(1);
      },
      {
        persistedYieldInfoByNetwork: {
          preview: {
            ...yieldInfo,
            fetchedAt: (Date.now() - 6 * 60_000) as Milliseconds,
          },
        },
      },
    );
  });

  it('keeps the previous value when the provider reports an error result', () => {
    const read = vi.fn(() =>
      of(
        Err<RealFiProviderError>({
          code: 'PROVIDER_UNAVAILABLE',
          message: 'nope',
        }),
      ),
    );
    runYieldInfo(read, emissions => {
      expect(emissions).toEqual([]);
    });
  });

  it('keeps the previous value when the provider pipeline throws', () => {
    const read = vi.fn(() => throwError(() => new Error('boom')));
    runYieldInfo(read, emissions => {
      expect(emissions).toEqual([]);
    });
  });

  it('does nothing when no RealFi config resolves for the active network', () => {
    const read = vi.fn(() => of(Ok(yieldInfo)));
    runYieldInfo(
      read,
      emissions => {
        expect(read).not.toHaveBeenCalled();
        expect(emissions).toEqual([]);
      },
      { featureFlags: [] },
    );
  });
});
