import { AccountId } from '@lace-contract/wallet-repo';
import { Err, Ok } from '@lace-lib/util';
import { testSideEffect } from '@lace-lib/util-dev';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { FEATURE_FLAG_REALFI } from '../../src/const';
import { CARDANO_NETWORK_MAGIC } from '../../src/realfi-network-config';
import { makeWithdrawables } from '../../src/store/side-effects';
import { realfiStakingActions } from '../../src/store/slice';

import type {
  RealFiCoolingDownUnstake,
  RealFiProviderError,
  RealFiWithdrawableUnstake,
} from '../../src/provider-types';
import type { BlockchainNetworkId } from '@lace-contract/network';

const accountId = AccountId('acct-1');
const previewNetworkId =
  `cardano-${CARDANO_NETWORK_MAGIC.preview}` as BlockchainNetworkId;

const realfiFlag = {
  key: FEATURE_FLAG_REALFI,
  payload: { preview: {} },
};

const withdrawable: RealFiWithdrawableUnstake = {
  timelockUtxo: { txHash: 'tl-tx', index: 0 },
  unlockSlot: 123,
  usdrAmount: '1500000',
};

const coolingDown: RealFiCoolingDownUnstake = {
  unlockSlot: 456,
  claimableAtMs: 1_756_000_100_000,
  usdrAmount: '2500000',
};

const actions = realfiStakingActions;

const providerError = Err<RealFiProviderError>({
  code: 'VALIDATION',
  message: 'nope',
});

const stateObservables = ({
  accounts = [{ accountId }],
  address = 'addr_test1xyz' as string | null,
} = {}) => ({
  wallets: {
    selectActiveNetworkAccountsByBlockchainName$: of(() => accounts as never),
  },
  addresses: {
    selectByAccountId$: of(() => (address ? [{ address }] : []) as never),
  },
  network: {
    selectActiveNetworkId$: of(() => previewNetworkId),
  },
  features: {
    selectLoadedFeatures$: of({ featureFlags: [realfiFlag], modules: [] }),
  },
});

const runWithdrawables = (
  provider: {
    getWithdrawableUnstakes: ReturnType<typeof vi.fn>;
    getCoolingDownUnstakes: ReturnType<typeof vi.fn>;
  },
  assert: (emissions: unknown[]) => void,
  state: ReturnType<typeof stateObservables> = stateObservables(),
) => {
  testSideEffect(makeWithdrawables, ({ hot, flush }) => ({
    actionObservables: {
      realfiPosition: {
        withdrawablesRequested$: hot('-a', {
          a: actions.realfiPosition.withdrawablesRequested(),
        }),
      },
    },
    stateObservables: state,
    dependencies: { actions, realfiProviders: [provider as never] },
    assertion: sideEffect$ => {
      const emissions: unknown[] = [];
      sideEffect$.subscribe(action => emissions.push(action));
      flush();
      assert(emissions);
    },
  }));
};

describe('makeWithdrawables', () => {
  it('emits withdrawableReceived and coolingDownReceived per account', () => {
    const provider = {
      getWithdrawableUnstakes: vi.fn().mockReturnValue(of(Ok([withdrawable]))),
      getCoolingDownUnstakes: vi.fn().mockReturnValue(of(Ok([coolingDown]))),
    };

    runWithdrawables(provider, emissions => {
      expect(provider.getWithdrawableUnstakes).toHaveBeenCalledWith(
        expect.objectContaining({ accountId, userAddress: 'addr_test1xyz' }),
      );
      expect(emissions).toEqual([
        actions.realfiPosition.withdrawableReceived({
          accountId,
          unstakes: [withdrawable],
        }),
        actions.realfiPosition.coolingDownReceived({
          accountId,
          unstakes: [coolingDown],
        }),
      ]);
    });
  });

  it('keeps the previous data when both reads return error results', () => {
    const provider = {
      getWithdrawableUnstakes: vi.fn().mockReturnValue(of(providerError)),
      getCoolingDownUnstakes: vi.fn().mockReturnValue(of(providerError)),
    };

    runWithdrawables(provider, emissions => {
      expect(emissions).toEqual([]);
    });
  });

  it('keeps the previous data when both read pipelines throw', () => {
    const provider = {
      getWithdrawableUnstakes: vi
        .fn()
        .mockReturnValue(throwError(() => new Error('boom'))),
      getCoolingDownUnstakes: vi
        .fn()
        .mockReturnValue(throwError(() => new Error('boom'))),
    };

    runWithdrawables(provider, emissions => {
      expect(emissions).toEqual([]);
    });
  });

  it('does not call the provider when there are no Cardano accounts', () => {
    const provider = {
      getWithdrawableUnstakes: vi.fn().mockReturnValue(of(Ok([withdrawable]))),
      getCoolingDownUnstakes: vi.fn().mockReturnValue(of(Ok([coolingDown]))),
    };

    runWithdrawables(
      provider,
      emissions => {
        expect(provider.getWithdrawableUnstakes).not.toHaveBeenCalled();
        expect(provider.getCoolingDownUnstakes).not.toHaveBeenCalled();
        expect(emissions).toEqual([]);
      },
      stateObservables({ accounts: [] }),
    );
  });

  it('skips accounts without an address', () => {
    const provider = {
      getWithdrawableUnstakes: vi.fn().mockReturnValue(of(Ok([withdrawable]))),
      getCoolingDownUnstakes: vi.fn().mockReturnValue(of(Ok([coolingDown]))),
    };

    runWithdrawables(
      provider,
      emissions => {
        expect(provider.getWithdrawableUnstakes).not.toHaveBeenCalled();
        expect(emissions).toEqual([]);
      },
      stateObservables({ address: null }),
    );
  });
});
