/**
 * @vitest-environment jsdom
 */
import { createTxInspector } from '@cardano-sdk/core';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as storeHooks from '../src/common/hooks/storeHooks';
import { useDappTxInspection } from '../src/common/hooks/useDappTxInspection';

import type * as CardanoSdk from '@cardano-sdk/core';

vi.mock('../src/common/hooks/storeHooks', () => ({
  useLaceSelector: vi.fn(),
  useDispatchLaceAction: vi.fn(),
}));

vi.mock('@cardano-sdk/core', async importOriginal => {
  const actual = await importOriginal<typeof CardanoSdk>();
  return {
    ...actual,
    Serialization: {
      ...actual.Serialization,
      TxCBOR: vi.fn((s: string) => s),
      Transaction: {
        fromCbor: vi.fn().mockImplementation((cbor: string) => {
          // 'not-valid-cbor' mirrors the test string used in the parse error test
          if (cbor === 'not-valid-cbor') throw new Error('parse failed');
          return { toCore: () => ({}) };
        }),
      },
    },
    createTxInspector: vi.fn(),
    tokenTransferInspector: vi.fn().mockReturnValue({}),
    transactionSummaryInspector: vi.fn().mockReturnValue({}),
  };
});

vi.mock('../src/common/utils/create-dapp-asset-provider', () => ({
  createDappAssetProvider: vi.fn().mockReturnValue({
    healthCheck: async () => ({ ok: true }),
    getAsset: vi.fn(),
    getAssets: vi.fn(),
  }),
}));

vi.mock('../src/common/utils/create-dapp-input-resolver', () => ({
  createDappInputResolver: vi.fn().mockReturnValue({}),
}));

const VALID_TX_HEX = 'valid-tx-hex';

type PaymentAddress = CardanoSdk.Cardano.PaymentAddress;
const FOREIGN_ADDR = 'addr1_foreign' as unknown as PaymentAddress;
const OWN_ADDR = 'addr1_own' as unknown as PaymentAddress;

// Stable object references — same identity across renders so memoized deps don't change
const stableAccountUtxos = {};
const stableProtocolParams = {
  poolDeposit: 500_000_000n,
  stakeKeyDeposit: 2_000_000n,
};
const stableResolvedInputs = { isResolving: false, foreignResolvedInputs: [] };
const stableAllAddresses: never[] = [];
const stableDispatch = vi.fn();

const mockUseLaceSelector = vi.mocked(storeHooks.useLaceSelector);
const mockUseDispatchLaceAction = vi.mocked(storeHooks.useDispatchLaceAction);
const mockCreateTxInspector = vi.mocked(createTxInspector);

const setupSelectors = (overrides: Record<string, unknown> = {}) => {
  mockUseLaceSelector.mockImplementation((selector: string) => {
    const defaults: Record<string, unknown> = {
      'cardanoContext.selectAccountUtxos': stableAccountUtxos,
      'cardanoContext.selectProtocolParameters': stableProtocolParams,
      'cardanoDappConnector.selectResolvedTransactionInputs':
        stableResolvedInputs,
      'tokens.selectTokensMetadata': {},
      'addresses.selectActiveNetworkAccountAddresses': stableAllAddresses,
    };
    return selector in overrides ? overrides[selector] : defaults[selector];
  });
};

const sdkEntry = (coins: bigint) => ({ coins, assets: new Map() });

const makeInspectorFunction = (
  fromAddress: Map<unknown, unknown>,
  toAddress: Map<unknown, unknown>,
) =>
  vi.fn().mockResolvedValue({
    tokenTransfer: { fromAddress, toAddress },
    summary: null,
  });

describe('useDappTxInspection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDispatchLaceAction.mockReturnValue(
      stableDispatch as unknown as ReturnType<
        typeof storeHooks.useDispatchLaceAction
      >,
    );
    setupSelectors();
  });

  // ─── Loading states ───────────────────────────────────────────────────────

  describe('loading states', () => {
    it('returns empty state with isLoading false when txHex is empty', () => {
      const { result } = renderHook(() => useDappTxInspection({ txHex: '' }));
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.summary).toBeNull();
    });

    it('returns parse error when txHex is not valid CBOR', async () => {
      const { result } = renderHook(() =>
        useDappTxInspection({ txHex: 'not-valid-cbor' }),
      );
      await act(async () => {});
      expect(result.current.error).toBe('Failed to parse transaction');
      expect(result.current.isLoading).toBe(false);
    });

    it('stays loading when protocolParameters are not ready', async () => {
      setupSelectors({ 'cardanoContext.selectProtocolParameters': null });
      const { result } = renderHook(() =>
        useDappTxInspection({ txHex: VALID_TX_HEX }),
      );
      await act(async () => {});
      expect(result.current.isLoading).toBe(true);
      expect(mockCreateTxInspector).not.toHaveBeenCalled();
    });

    it('stays loading while resolved transaction inputs are still resolving', async () => {
      setupSelectors({
        'cardanoDappConnector.selectResolvedTransactionInputs': {
          isResolving: true,
          foreignResolvedInputs: [],
        },
      });
      const { result } = renderHook(() =>
        useDappTxInspection({ txHex: VALID_TX_HEX }),
      );
      await act(async () => {});
      expect(result.current.isLoading).toBe(true);
      expect(mockCreateTxInspector).not.toHaveBeenCalled();
    });
  });

  // ─── Address net flows ────────────────────────────────────────────────────

  describe('address net flows', () => {
    it('passes foreign addresses through to from/to maps unchanged', async () => {
      mockCreateTxInspector.mockReturnValue(
        makeInspectorFunction(
          new Map([[FOREIGN_ADDR, sdkEntry(2_000_000n)]]),
          new Map([[FOREIGN_ADDR, sdkEntry(1_000_000n)]]),
        ),
      );

      const { result } = renderHook(() =>
        useDappTxInspection({ txHex: VALID_TX_HEX }),
      );
      await act(async () => {});

      expect(result.current.fromAddresses.get(FOREIGN_ADDR)?.coins).toBe(
        2_000_000n,
      );
      expect(result.current.toAddresses.get(FOREIGN_ADDR)?.coins).toBe(
        1_000_000n,
      );
    });

    it('collapses own-address round-trip to a single net entry', async () => {
      setupSelectors({
        'addresses.selectActiveNetworkAccountAddresses': [
          { address: OWN_ADDR },
        ],
      });
      // SDK tokenTransferInspector uses signed values: fromAddress entries carry
      // negative coins (net outflow), toAddress entries carry positive coins (net inflow).
      mockCreateTxInspector.mockReturnValue(
        makeInspectorFunction(
          new Map([[OWN_ADDR, sdkEntry(-2_000_000n)]]),
          new Map([[OWN_ADDR, sdkEntry(1_800_000n)]]),
        ),
      );

      const { result } = renderHook(() =>
        useDappTxInspection({ txHex: VALID_TX_HEX }),
      );
      await act(async () => {});

      // −2_000_000n spent + 1_800_000n change = −200_000n net (negative = outflow)
      expect(result.current.fromAddresses.get(OWN_ADDR)?.coins).toBe(-200_000n);
      expect(result.current.toAddresses.size).toBe(0);
    });
  });

  // ─── tokensMetadata ref ───────────────────────────────────────────────────

  describe('tokensMetadata ref', () => {
    it('does not re-run the inspector when tokensMetadata changes', async () => {
      const inspectorFunction = makeInspectorFunction(new Map(), new Map());
      mockCreateTxInspector.mockReturnValue(inspectorFunction);

      const { rerender } = renderHook(() =>
        useDappTxInspection({ txHex: VALID_TX_HEX }),
      );
      await act(async () => {});
      expect(inspectorFunction).toHaveBeenCalledTimes(1);

      setupSelectors({
        'tokens.selectTokensMetadata': {
          someToken: { name: 'Token', ticker: 'TKN' },
        },
      });
      rerender();
      await act(async () => {});

      expect(inspectorFunction).toHaveBeenCalledTimes(1);
    });
  });
});
