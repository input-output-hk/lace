import { Err, Ok } from '@lace-lib/util';
import { testSideEffect } from '@lace-lib/util-dev';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { FEATURE_FLAG_REALFI } from '../../src/const';
import { CARDANO_NETWORK_MAGIC } from '../../src/realfi-network-config';
import { makeStakeInputAssets } from '../../src/store/side-effects';
import { realfiStakingActions } from '../../src/store/slice';

import type { RealFiProviderError } from '../../src/provider-types';
import type { BlockchainNetworkId } from '@lace-contract/network';

const previewNetworkId =
  `cardano-${CARDANO_NETWORK_MAGIC.preview}` as BlockchainNetworkId;

const realfiFlag = {
  key: FEATURE_FLAG_REALFI,
  payload: { preview: {} },
};

const assets = ['ada.lovelace', 'deadbeef.55534443'];

const actions = realfiStakingActions;

const runStakeInputAssets = (
  getStakeInputAssets: ReturnType<typeof vi.fn>,
  assert: (emissions: unknown[]) => void,
  featureFlags: (typeof realfiFlag)[] = [realfiFlag],
) => {
  const provider = { getStakeInputAssets } as never;
  testSideEffect(makeStakeInputAssets, ({ hot, flush }) => ({
    actionObservables: {
      realfiPosition: {
        stakeInputAssetsRequested$: hot('-a', {
          a: actions.realfiPosition.stakeInputAssetsRequested({
            realfiNetwork: 'preview',
          }),
        }),
      },
    },
    stateObservables: {
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

describe('makeStakeInputAssets', () => {
  it('reads the verified stake-input list and stores it under the active RealFi network', () => {
    const read = vi.fn(() => of(Ok(assets)));
    runStakeInputAssets(read, emissions => {
      expect(read).toHaveBeenCalledTimes(1);
      const request = (read.mock.calls[0] as unknown[])[0] as {
        config: { realfiNetwork: string };
      };
      expect(request.config.realfiNetwork).toBe('preview');
      expect(emissions).toEqual([
        actions.realfiPosition.stakeInputAssetsReceived({
          realfiNetwork: 'preview',
          assets,
        }),
      ]);
    });
  });

  it('keeps the previous list when the provider reports an error result', () => {
    const read = vi.fn(() =>
      of(
        Err<RealFiProviderError>({
          code: 'PROVIDER_UNAVAILABLE',
          message: 'nope',
        }),
      ),
    );
    runStakeInputAssets(read, emissions => {
      expect(emissions).toEqual([]);
    });
  });

  it('keeps the previous list when the provider pipeline throws', () => {
    const read = vi.fn(() => throwError(() => new Error('boom')));
    runStakeInputAssets(read, emissions => {
      expect(emissions).toEqual([]);
    });
  });

  it('does nothing when no RealFi config resolves for the active network', () => {
    const read = vi.fn(() => of(Ok(assets)));
    runStakeInputAssets(
      read,
      emissions => {
        expect(read).not.toHaveBeenCalled();
        expect(emissions).toEqual([]);
      },
      [],
    );
  });
});
