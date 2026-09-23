import { uiActions } from '@lace-contract/app';
import { AccountId, WalletId } from '@lace-contract/wallet-repo';
import { Err, Ok } from '@lace-lib/util';
import { testSideEffect } from '@lace-lib/util-dev';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FEATURE_FLAG_REALFI } from '../../src/const';
import { CARDANO_NETWORK_MAGIC } from '../../src/realfi-network-config';
import { makeCancel } from '../../src/store/side-effects';
import { realfiStakingActions } from '../../src/store/slice';

import type {
  RealFiCancelRequest,
  RealFiProviderError,
} from '../../src/provider-types';
import type { BlockchainNetworkId } from '@lace-contract/network';
import type { AnyWallet } from '@lace-contract/wallet-repo';

type TxEntryPoint = (
  params: unknown,
  mapResult: (result: unknown) => unknown,
) => unknown;

const { confirmTxMock, submitTxMock } = vi.hoisted(() => ({
  confirmTxMock: vi.fn(),
  submitTxMock: vi.fn(),
}));

vi.mock('@lace-contract/tx-executor', async importOriginal => ({
  ...(await importOriginal<object>()),
  makeConfirmTx: () => confirmTxMock,
  makeSubmitTx: () => submitTxMock,
}));

const confirmTx = confirmTxMock as unknown as ReturnType<
  typeof vi.fn<TxEntryPoint>
>;
const submitTx = submitTxMock as unknown as ReturnType<
  typeof vi.fn<TxEntryPoint>
>;

const accountId = AccountId('acct-1');
const previewNetworkId =
  `cardano-${CARDANO_NETWORK_MAGIC.preview}` as BlockchainNetworkId;

const testWallet = {
  walletId: WalletId('wallet-1'),
  accounts: [{ accountId, blockchainName: 'Cardano' }],
} as unknown as AnyWallet;

const realfiFlag = {
  key: FEATURE_FLAG_REALFI,
  payload: { preview: {} },
};

const actions = { ...realfiStakingActions, ...uiActions };

const cancelFailedToast = actions.ui.showToast({
  text: 'realfi.toast.cancel-failed.title',
  subtitle: 'realfi.toast.cancel-failed.subtitle',
  color: 'negative',
  leftIcon: { name: 'Cancel', size: 20 },
});

const cancelRequested = actions.realfiPosition.cancelRequested({
  accountId,
  orderId: 'order-tx#0',
  stage: 'swap',
});

const stateObservables = {
  wallets: { selectAll$: of([testWallet]) },
  addresses: {
    selectByAccountId$: of(() => [{ address: 'addr_test1xyz' }] as never),
  },
  network: {
    selectActiveNetworkId$: of(() => previewNetworkId),
  },
  features: {
    selectLoadedFeatures$: of({ featureFlags: [realfiFlag], modules: [] }),
  },
};

const runCancel = (
  buildCancelTx: ReturnType<typeof vi.fn>,
  assert: (emissions: unknown[]) => void,
) => {
  const provider = { buildCancelTx } as never;
  testSideEffect(makeCancel, ({ hot, flush }) => ({
    actionObservables: {
      realfiPosition: {
        cancelRequested$: hot('-a', { a: cancelRequested }),
      },
    },
    stateObservables,
    dependencies: { actions, realfiProviders: [provider] },
    assertion: sideEffect$ => {
      const emissions: unknown[] = [];
      sideEffect$.subscribe(action => emissions.push(action));
      flush();
      assert(emissions);
    },
  }));
};

describe('makeCancel', () => {
  beforeEach(() => {
    confirmTx.mockReset();
    submitTx.mockReset();
  });

  it('builds, signs, and submits the cancel, then toasts and refreshes activities', () => {
    const buildCancelTx = vi
      .fn()
      .mockReturnValue(of(Ok({ unsignedTxCbor: 'cancel-cbor' })));
    confirmTx.mockImplementation((_params, mapResult) =>
      of(mapResult({ success: true, serializedTx: 'signed-cancel' })),
    );
    submitTx.mockImplementation((_params, mapResult) =>
      of(mapResult({ success: true, txId: 'tx-1' })),
    );

    runCancel(buildCancelTx, emissions => {
      const request = buildCancelTx.mock.calls[0][0] as RealFiCancelRequest;
      expect(request.orderId).toBe('order-tx#0');
      expect(request.stage).toBe('swap');
      expect(submitTx).toHaveBeenCalledWith(
        expect.objectContaining({ serializedTx: 'signed-cancel' }),
        expect.any(Function),
      );
      expect(emissions).toEqual([
        actions.ui.showToast({
          text: 'realfi.cancel.canceled',
          color: 'positive',
          leftIcon: { name: 'Checkmark', size: 20 },
        }),
        actions.realfiPosition.stakeActivitiesRequested({ accountId }),
      ]);
    });
  });

  it('toasts a cancel failure when the build fails', () => {
    const buildCancelTx = vi
      .fn()
      .mockReturnValue(
        of(Err<RealFiProviderError>({ code: 'VALIDATION', message: 'nope' })),
      );

    runCancel(buildCancelTx, emissions => {
      expect(confirmTx).not.toHaveBeenCalled();
      expect(emissions).toEqual([cancelFailedToast]);
    });
  });

  it('stays silent when the signing prompt is declined', () => {
    const buildCancelTx = vi
      .fn()
      .mockReturnValue(of(Ok({ unsignedTxCbor: 'cancel-cbor' })));
    confirmTx.mockImplementation((_params, mapResult) =>
      of(mapResult({ success: false, error: new Error('declined') })),
    );

    runCancel(buildCancelTx, emissions => {
      expect(submitTx).not.toHaveBeenCalled();
      expect(emissions).toEqual([]);
    });
  });

  it('toasts a cancel failure when submission fails', () => {
    const buildCancelTx = vi
      .fn()
      .mockReturnValue(of(Ok({ unsignedTxCbor: 'cancel-cbor' })));
    confirmTx.mockImplementation((_params, mapResult) =>
      of(mapResult({ success: true, serializedTx: 'signed-cancel' })),
    );
    submitTx.mockImplementation((_params, mapResult) =>
      of(mapResult({ success: false, error: new Error('submit failed') })),
    );

    runCancel(buildCancelTx, emissions => {
      expect(emissions).toEqual([cancelFailedToast]);
    });
  });

  it('toasts a cancel failure when the pipeline throws', () => {
    const buildCancelTx = vi
      .fn()
      .mockReturnValue(throwError(() => new Error('boom')));

    runCancel(buildCancelTx, emissions => {
      expect(emissions).toEqual([cancelFailedToast]);
    });
  });
});
