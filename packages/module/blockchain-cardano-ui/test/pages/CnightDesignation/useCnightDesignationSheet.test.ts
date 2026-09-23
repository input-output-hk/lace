/**
 * @vitest-environment jsdom
 */
import { dustAddressToCoinPubkeyHex } from '@lace-lib/cnight-dust-designation';
import { bech32m } from '@scure/base';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@lace-lib/navigation', () => ({
  NavigationControls: { closeSheet: vi.fn() },
}));

vi.mock('../../../src/hooks', () => ({
  useLaceSelector: vi.fn(),
  useDispatchLaceAction: vi.fn(),
}));

vi.mock('@lace-contract/i18n', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    useTranslation: () => ({ t: (key: string) => key }),
  };
});

import * as hooksModule from '../../../src/hooks';
import { useCnightDesignationSheet } from '../../../src/pages/CnightDesignation/useCnightDesignationSheet';

import type { NightDesignationIndexEntry } from '@lace-contract/cardano-context';

// A valid mainnet Midnight dust address (from the integration stories). On the
// mainnet network it decodes, so the external-target path resolves a coin
// pubkey and the "Change target" CTA has a real target to gate.
const MAINNET_DUST_ADDRESS =
  'mn_dust1wdvvhux7luy22g5w6qsr3qerf49h0curwzfa2fv7acx9x258gmpzzgdspqv';
const SELECTED_TARGET_HEX =
  dustAddressToCoinPubkeyHex(MAINNET_DUST_ADDRESS).coinPubkeyHex;

// A second, distinct valid mainnet dust address so two wallet targets resolve
// to different coin pubkeys (for the current-target pre-selection test).
// Hand-built to satisfy the decoder's canonical-SCALE rule: the `0x73`
// big-integer header declares 32 little-endian scalar bytes, whose top byte is
// nonzero (minimal) and whose value stays under the BLS12-381 field order.
const SECOND_DUST_PAYLOAD = new Uint8Array(33).fill(0x02);
SECOND_DUST_PAYLOAD[0] = 0x73;
const SECOND_MAINNET_DUST_ADDRESS = bech32m.encode(
  'mn_dust',
  bech32m.toWords(SECOND_DUST_PAYLOAD),
  1024,
);
const SECOND_TARGET_HEX = dustAddressToCoinPubkeyHex(
  SECOND_MAINNET_DUST_ADDRESS,
).coinPubkeyHex;

// A testnet dust address (`mn_dust_undeployed…` HRP) — decodes to the testnet
// dust network, so on the mainnet wallet these tests use it must be dropped by
// the wallet-target network guard. Sourced from the integration stories' sample.
const TESTNET_DUST_ADDRESS =
  'mn_dust_undeployed1wdvvhux7luy22g5w6qsr3qerf49h0curwzfa2fv7acx9x258gmpzz2mtpt2';

// Props only need route.params.accountId.
const props = {
  route: { params: { accountId: 'acc-1' } },
} as unknown as Parameters<typeof useCnightDesignationSheet>[0];

const mockUseLaceSelector = vi.mocked(hooksModule.useLaceSelector);
const mockUseDispatchLaceAction = vi.mocked(hooksModule.useDispatchLaceAction);

const notDesignated: NightDesignationIndexEntry = {
  refreshing: false,
  failed: false,
  snapshot: { scriptStakeCredentialRegistered: true },
};

const detecting: NightDesignationIndexEntry = {
  refreshing: true,
  failed: false,
};

const detectionFailed: NightDesignationIndexEntry = {
  refreshing: false,
  failed: true,
};

const designated = (
  scriptStakeCredentialRegistered: boolean | undefined,
  dustPubkeyHex = 'aa'.repeat(32),
): NightDesignationIndexEntry => ({
  refreshing: false,
  failed: false,
  snapshot: {
    scriptStakeCredentialRegistered,
    registration: { txId: '99'.repeat(32), outputIndex: 0, dustPubkeyHex },
  },
});

const indexFor = (entry: NightDesignationIndexEntry) => ({ 'acc-1': entry });

const setup = (entry: NightDesignationIndexEntry) => {
  mockUseLaceSelector.mockImplementation(
    (selector: string, ..._args: unknown[]) => {
      switch (selector) {
        case 'nightDesignationFlow.selectState':
          return { status: 'Idle' };
        case 'network.selectNetworkType':
          return 'mainnet';
        case 'nightDesignationIndex.selectIndexByAccount':
          return indexFor(entry);
        case 'tokenPricing.selectCurrencyPreference':
          return { name: 'US Dollar' };
        case 'features.selectLoadedFeatures':
          return { featureFlags: [] };
        // No sibling accounts/addresses → external-only target path.
        case 'wallets.selectActiveNetworkAccounts':
        case 'addresses.selectAllAddresses':
          return [];
        default:
          return undefined;
      }
    },
  );
  return renderHook(() => useCnightDesignationSheet(props));
};

// Two Midnight siblings resolving distinct dust targets, so the picker's
// pre-selection is observable. mid-0 -> address A, mid-1 -> address B.
const setupWithWalletTargets = (entry: NightDesignationIndexEntry) => {
  const cardanoAccount = {
    accountId: 'acc-1',
    blockchainName: 'Cardano',
    networkType: 'mainnet',
    walletId: 'w1',
  };
  const midnight0 = {
    accountId: 'mid-0',
    blockchainName: 'Midnight',
    networkType: 'mainnet',
    metadata: { name: 'Midnight #0' },
  };
  const midnight1 = {
    accountId: 'mid-1',
    blockchainName: 'Midnight',
    networkType: 'mainnet',
    metadata: { name: 'Midnight #1' },
  };
  mockUseLaceSelector.mockImplementation(
    (selector: string, ..._args: unknown[]) => {
      switch (selector) {
        case 'nightDesignationFlow.selectState':
          return { status: 'Idle' };
        case 'network.selectNetworkType':
          return 'mainnet';
        case 'nightDesignationIndex.selectIndexByAccount':
          return indexFor(entry);
        case 'tokenPricing.selectCurrencyPreference':
          return { name: 'US Dollar' };
        case 'features.selectLoadedFeatures':
          return { featureFlags: [] };
        case 'wallets.selectActiveNetworkAccounts':
          return [cardanoAccount];
        case 'wallets.selectWalletById':
          return { accounts: [cardanoAccount, midnight0, midnight1] };
        case 'addresses.selectAllAddresses':
          return [
            { accountId: 'mid-0', address: MAINNET_DUST_ADDRESS },
            { accountId: 'mid-1', address: SECOND_MAINNET_DUST_ADDRESS },
          ];
        default:
          return undefined;
      }
    },
  );
  return renderHook(() => useCnightDesignationSheet(props));
};

describe('useCnightDesignationSheet — wallet-target pre-selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDispatchLaceAction.mockReturnValue(
      vi.fn() as unknown as ReturnType<
        typeof hooksModule.useDispatchLaceAction
      >,
    );
  });
  afterEach(() => vi.restoreAllMocks());

  it('pre-selects the current recipient (not the first) when designated to a wallet target', () => {
    // Designated to mid-1's coin pubkey → the picker opens on mid-1, not mid-0.
    const { result } = setupWithWalletTargets(
      designated(true, SECOND_TARGET_HEX),
    );
    expect(result.current.selectedTargetId).toBe('mid-1');
  });

  it('falls back to the first wallet target for a fresh (not-designated) account', () => {
    const { result } = setupWithWalletTargets(notDesignated);
    expect(result.current.selectedTargetId).toBe('mid-0');
  });

  it('marks the designated sibling as the current wallet target', () => {
    const { result } = setupWithWalletTargets(
      designated(true, SECOND_TARGET_HEX),
    );
    expect(result.current.currentWalletTargetId).toBe('mid-1');
    expect(result.current.isSameAsCurrentTarget).toBe(true);
  });

  it('exposes no current wallet target for a fresh (not-designated) account', () => {
    const { result } = setupWithWalletTargets(notDesignated);
    expect(result.current.currentWalletTargetId).toBeUndefined();
    expect(result.current.isSameAsCurrentTarget).toBe(false);
  });

  it('clears the same-target flag once a different sibling is selected', () => {
    const { result } = setupWithWalletTargets(
      designated(true, SECOND_TARGET_HEX),
    );
    expect(result.current.isSameAsCurrentTarget).toBe(true);

    act(() => {
      result.current.setSelectedTargetId('mid-0');
    });

    expect(result.current.isSameAsCurrentTarget).toBe(false);
  });
});

// Two Midnight siblings (mid-0, mid-1) on a mainnet wallet, each mapped to a
// caller-supplied dust address, so the wallet-target network guard's
// include/exclude decision is observable independently of the account filter
// (both siblings pass it — the account networkType is mainnet).
const setupWithSiblingAddresses = (
  addresses: Array<{ accountId: string; address: string }>,
) => {
  const cardanoAccount = {
    accountId: 'acc-1',
    blockchainName: 'Cardano',
    networkType: 'mainnet',
    walletId: 'w1',
  };
  const midnight0 = {
    accountId: 'mid-0',
    blockchainName: 'Midnight',
    networkType: 'mainnet',
    metadata: { name: 'Midnight #0' },
  };
  const midnight1 = {
    accountId: 'mid-1',
    blockchainName: 'Midnight',
    networkType: 'mainnet',
    metadata: { name: 'Midnight #1' },
  };
  mockUseLaceSelector.mockImplementation((selector: string) => {
    switch (selector) {
      case 'nightDesignationFlow.selectState':
        return { status: 'Idle' };
      case 'network.selectNetworkType':
        return 'mainnet';
      case 'nightDesignationIndex.selectIndexByAccount':
        return indexFor(notDesignated);
      case 'tokenPricing.selectCurrencyPreference':
        return { name: 'US Dollar' };
      case 'features.selectLoadedFeatures':
        return { featureFlags: [] };
      case 'wallets.selectActiveNetworkAccounts':
        return [cardanoAccount];
      case 'wallets.selectWalletById':
        return { accounts: [cardanoAccount, midnight0, midnight1] };
      case 'addresses.selectAllAddresses':
        return addresses;
      default:
        return undefined;
    }
  });
  return renderHook(() => useCnightDesignationSheet(props));
};

describe('useCnightDesignationSheet — wallet-target network guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDispatchLaceAction.mockReturnValue(
      vi.fn() as unknown as ReturnType<
        typeof hooksModule.useDispatchLaceAction
      >,
    );
  });
  afterEach(() => vi.restoreAllMocks());

  it('excludes a sibling whose dust address is for a different network', () => {
    // Mainnet wallet + a sibling holding a testnet dust address: the account
    // filter passes (networkType is mainnet) so only the decode-network guard
    // can reject it. targetMode falls back to external once no target survives.
    const { result } = setupWithSiblingAddresses([
      { accountId: 'mid-0', address: TESTNET_DUST_ADDRESS },
    ]);

    expect(result.current.walletTargets).toEqual([]);
    expect(result.current.isWalletTargetAvailable).toBe(false);
    expect(result.current.targetMode).toBe('external');
  });

  it('keeps only the same-network sibling when a wallet mixes networks', () => {
    const { result } = setupWithSiblingAddresses([
      { accountId: 'mid-0', address: MAINNET_DUST_ADDRESS },
      { accountId: 'mid-1', address: TESTNET_DUST_ADDRESS },
    ]);

    expect(
      result.current.walletTargets.map(target => target.accountId),
    ).toEqual(['mid-0']);
    expect(result.current.isWalletTargetAvailable).toBe(true);
  });
});

describe('useCnightDesignationSheet — late sibling address hydration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDispatchLaceAction.mockReturnValue(
      vi.fn() as unknown as ReturnType<
        typeof hooksModule.useDispatchLaceAction
      >,
    );
  });
  afterEach(() => vi.restoreAllMocks());

  // Address discovery is async, so the sheet can open before the sibling
  // Midnight account has an address: walletTargets is empty and the form falls
  // back to the external tab. The sibling then arrives while the form is open.
  const setupWithHydratingSibling = () => {
    const cardanoAccount = {
      accountId: 'acc-1',
      blockchainName: 'Cardano',
      networkType: 'mainnet',
      walletId: 'w1',
    };
    const midnight0 = {
      accountId: 'mid-0',
      blockchainName: 'Midnight',
      networkType: 'mainnet',
      metadata: { name: 'Midnight #0' },
    };
    let siblingAddresses: { accountId: string; address: string }[] = [];
    mockUseLaceSelector.mockImplementation((selector: string) => {
      switch (selector) {
        case 'nightDesignationFlow.selectState':
          return { status: 'Idle' };
        case 'network.selectNetworkType':
          return 'mainnet';
        case 'nightDesignationIndex.selectIndexByAccount':
          return indexFor(notDesignated);
        case 'tokenPricing.selectCurrencyPreference':
          return { name: 'US Dollar' };
        case 'features.selectLoadedFeatures':
          return { featureFlags: [] };
        case 'wallets.selectActiveNetworkAccounts':
          return [cardanoAccount];
        case 'wallets.selectWalletById':
          return { accounts: [cardanoAccount, midnight0] };
        case 'addresses.selectAllAddresses':
          return siblingAddresses;
        default:
          return undefined;
      }
    });
    const rendered = renderHook(() => useCnightDesignationSheet(props));
    return {
      ...rendered,
      hydrateSibling: () => {
        // A different address from the one typed below, so a silent swap of the
        // recipient is visible in reviewTarget rather than hidden by equality.
        siblingAddresses = [
          { accountId: 'mid-0', address: SECOND_MAINNET_DUST_ADDRESS },
        ];
        rendered.rerender();
      },
    };
  };

  it('keeps the typed external recipient when the sibling arrives', () => {
    const { result, hydrateSibling } = setupWithHydratingSibling();
    expect(result.current.targetMode).toBe('external');

    act(() => {
      result.current.setExternalAddress(MAINNET_DUST_ADDRESS);
    });
    act(() => {
      hydrateSibling();
    });

    expect(result.current.isWalletTargetAvailable).toBe(true);
    expect(result.current.targetMode).toBe('external');
    expect(result.current.reviewTarget.isOwn).toBe(false);
    expect(result.current.reviewTarget.address).toBe(MAINNET_DUST_ADDRESS);
    expect(result.current.canContinue).toBe(true);
  });

  it('adopts the wallet default when nothing was typed into the fallback', () => {
    const { result, hydrateSibling } = setupWithHydratingSibling();
    expect(result.current.targetMode).toBe('external');

    act(() => {
      hydrateSibling();
    });

    expect(result.current.targetMode).toBe('wallet');
    expect(result.current.reviewTarget.isOwn).toBe(true);
  });
});

describe('useCnightDesignationSheet — manage-view gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDispatchLaceAction.mockReturnValue(
      vi.fn() as unknown as ReturnType<
        typeof hooksModule.useDispatchLaceAction
      >,
    );
  });

  afterEach(() => vi.restoreAllMocks());

  it('allows change-target when designated + reward account registered + a valid distinct target', () => {
    const { result } = setup(designated(true));
    expect(result.current.isDesignated).toBe(true);

    act(() => {
      result.current.setExternalAddress(MAINNET_DUST_ADDRESS);
    });

    expect(result.current.isUpdateBlocked).toBe(false);
    expect(result.current.isSameAsCurrentTarget).toBe(false);
    expect(result.current.canContinue).toBe(true);
    expect(result.current.canStop).toBe(true);
  });

  it('blocks change-target when the reward account is unregistered (stop still allowed)', () => {
    const { result } = setup(designated(false));

    // Even with a valid, distinct target selected, the gate disables continue.
    act(() => {
      result.current.setExternalAddress(MAINNET_DUST_ADDRESS);
    });

    expect(result.current.isUpdateBlocked).toBe(true);
    expect(result.current.canContinue).toBe(false);
    expect(result.current.canStop).toBe(true);
  });

  it('blocks change-target when the reward probe could not answer', () => {
    // UNKNOWN, not "unregistered" — the gate must close on both.
    const { result } = setup(designated(undefined));

    act(() => {
      result.current.setExternalAddress(MAINNET_DUST_ADDRESS);
    });

    expect(result.current.isUpdateBlocked).toBe(true);
    expect(result.current.canContinue).toBe(false);
    expect(result.current.canStop).toBe(true);
  });

  it('disables change-target when the selected target equals the current one', () => {
    // Current target = the coin pubkey of the address we then select → no-op.
    const { result } = setup(designated(true, SELECTED_TARGET_HEX));

    act(() => {
      result.current.setExternalAddress(MAINNET_DUST_ADDRESS);
    });

    expect(result.current.isUpdateBlocked).toBe(false);
    expect(result.current.isSameAsCurrentTarget).toBe(true);
    expect(result.current.canContinue).toBe(false);
  });
});

describe('useCnightDesignationSheet — unresolved index entry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDispatchLaceAction.mockReturnValue(
      vi.fn() as unknown as ReturnType<
        typeof hooksModule.useDispatchLaceAction
      >,
    );
  });

  afterEach(() => vi.restoreAllMocks());

  it('holds the loader while a re-read runs over an already-resolved snapshot', () => {
    const { result } = setup({ ...designated(true), refreshing: true });

    expect(result.current.isDetecting).toBe(true);
    expect(result.current.isDesignated).toBe(false);
  });

  it('holds the loader while a submitted designation has not settled', () => {
    // The snapshot predates the submitted tx, so surfacing it would offer the
    // manage view for a designation the wallet has already changed or stopped.
    const { result } = setup({
      ...designated(true),
      settling: { txId: 'tx-1' },
    });

    expect(result.current.isDetecting).toBe(true);
    expect(result.current.isDesignated).toBe(false);
    expect(result.current.currentTargetHex).toBeUndefined();
  });

  it('holds the loader rather than the retryable error when a settling entry also failed', () => {
    const { result } = setup({
      ...designated(true),
      failed: true,
      settling: { txId: 'tx-1' },
    });

    expect(result.current.isDetectionFailed).toBe(false);
    expect(result.current.isDetecting).toBe(true);
  });

  // The index's own settling side-effect owns the post-transaction re-read, and
  // a scan started here would race it — see the guard in the hook.
  const setupWithRefreshSpy = (
    flowState: Record<string, unknown>,
    index: Partial<Record<string, NightDesignationIndexEntry>>,
  ) => {
    const refreshRequested = vi.fn();
    mockUseDispatchLaceAction.mockImplementation(
      (key: string) =>
        (key === 'nightDesignationIndex.refreshRequested'
          ? refreshRequested
          : vi.fn()) as unknown as ReturnType<
          typeof hooksModule.useDispatchLaceAction
        >,
    );
    mockUseLaceSelector.mockImplementation((selector: string) => {
      switch (selector) {
        case 'nightDesignationFlow.selectState':
          return flowState;
        case 'network.selectNetworkType':
          return 'mainnet';
        case 'nightDesignationIndex.selectIndexByAccount':
          return index;
        case 'tokenPricing.selectCurrencyPreference':
          return { name: 'US Dollar' };
        case 'features.selectLoadedFeatures':
          return { featureFlags: [] };
        case 'wallets.selectActiveNetworkAccounts':
        case 'addresses.selectAllAddresses':
          return [];
        default:
          return undefined;
      }
    });
    return {
      ...renderHook(() => useCnightDesignationSheet(props)),
      refreshRequested,
    };
  };

  it('requests no re-read on open while the account is settling its own designation', () => {
    const { refreshRequested } = setupWithRefreshSpy(
      { status: 'Idle' },
      {
        'acc-1': { ...designated(true), settling: { txId: 'tx-1' } },
      },
    );

    expect(refreshRequested).not.toHaveBeenCalled();
  });

  it('requests the re-read once the settling entry is released', () => {
    const index: Partial<Record<string, NightDesignationIndexEntry>> = {
      'acc-1': { ...designated(true), settling: { txId: 'tx-1' } },
    };
    const { rerender, refreshRequested } = setupWithRefreshSpy(
      { status: 'Idle' },
      index,
    );

    index['acc-1'] = designated(true);
    rerender();

    expect(refreshRequested).toHaveBeenCalledWith({ accountId: 'acc-1' });
  });

  it('keeps reporting the success step while the submitted designation settles', () => {
    // The success screen carries the txId, so it has to outlive the settling
    // window the same read model re-opens the moment the flow succeeds.
    const { result } = setupWithRefreshSpy(
      {
        status: 'Success',
        accountId: 'acc-1',
        action: 'designate',
        txId: 'tx-1',
      },
      { 'acc-1': { ...designated(true), settling: { txId: 'tx-1' } } },
    );

    expect(result.current.isDetecting).toBe(true);
    expect(result.current.step).toBe('success');
    expect(result.current.txId).toBe('tx-1');
  });
});

describe('useCnightDesignationSheet — detection failure', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  // Mutable entry plus a real refresh spy: the retry is observable and its
  // outcome is simulated by flipping what the selector returns.
  const setupDetection = (initial: NightDesignationIndexEntry) => {
    let entry = initial;
    const detectionRequested = vi.fn();
    mockUseDispatchLaceAction.mockImplementation(
      (key: string) =>
        (key === 'nightDesignationIndex.refreshRequested'
          ? detectionRequested
          : vi.fn()) as unknown as ReturnType<
          typeof hooksModule.useDispatchLaceAction
        >,
    );
    mockUseLaceSelector.mockImplementation((selector: string) => {
      switch (selector) {
        case 'nightDesignationFlow.selectState':
          return { status: 'Idle' };
        case 'network.selectNetworkType':
          return 'mainnet';
        case 'nightDesignationIndex.selectIndexByAccount':
          return indexFor(entry);
        case 'tokenPricing.selectCurrencyPreference':
          return { name: 'US Dollar' };
        case 'features.selectLoadedFeatures':
          return { featureFlags: [] };
        case 'wallets.selectActiveNetworkAccounts':
        case 'addresses.selectAllAddresses':
          return [];
        default:
          return undefined;
      }
    });
    return {
      ...renderHook(() => useCnightDesignationSheet(props)),
      detectionRequested,
      resolveDetection: (next: NightDesignationIndexEntry) => {
        entry = next;
      },
    };
  };

  it('drops the previous snapshot when the scan failed', () => {
    // The index keeps the last snapshot through a failure; the sheet must not
    // seed its target picker off a designation it is refusing to act on.
    const { result } = setupDetection({ ...designated(true), failed: true });

    expect(result.current.isDetectionFailed).toBe(true);
    expect(result.current.isDesignated).toBe(false);
    expect(result.current.currentTargetHex).toBeUndefined();
  });

  it('blocks both designate and stop when the scan failed', () => {
    const { result } = setupDetection(detectionFailed);

    // A valid target is selected, so only the detection term can block continue.
    act(() => {
      result.current.setExternalAddress(MAINNET_DUST_ADDRESS);
    });

    expect(result.current.isDetectionFailed).toBe(true);
    expect(result.current.isDetecting).toBe(false);
    expect(result.current.isDesignated).toBe(false);
    expect(result.current.canContinue).toBe(false);
    expect(result.current.canStop).toBe(false);
  });

  it('dispatches one re-scan per failure and disables retry until it resolves', () => {
    const { result, rerender, detectionRequested, resolveDetection } =
      setupDetection(detectionFailed);
    const callsAfterMount = detectionRequested.mock.calls.length;
    expect(result.current.canRetryDetection).toBe(true);

    act(() => {
      result.current.retryDetection();
    });

    expect(detectionRequested.mock.calls.length).toBe(callsAfterMount + 1);
    expect(detectionRequested).toHaveBeenLastCalledWith({
      accountId: 'acc-1',
    });
    expect(result.current.canRetryDetection).toBe(false);

    act(() => {
      result.current.retryDetection();
    });
    expect(detectionRequested.mock.calls.length).toBe(callsAfterMount + 1);

    resolveDetection(detecting);
    rerender();
    resolveDetection(detectionFailed);
    rerender();

    expect(result.current.canRetryDetection).toBe(true);
  });

  it('reaches the manage view when the retried scan resolves designated', () => {
    const { result, rerender, resolveDetection, detectionRequested } =
      setupDetection(detectionFailed);
    const requestsBeforeRetry = detectionRequested.mock.calls.length;

    act(() => {
      result.current.retryDetection();
    });
    expect(detectionRequested.mock.calls.length).toBe(requestsBeforeRetry + 1);

    resolveDetection(designated(true));
    rerender();

    expect(result.current.isDetectionFailed).toBe(false);
    expect(result.current.isDesignated).toBe(true);
    expect(result.current.step).toBe('form');
    expect(result.current.canStop).toBe(true);
  });
});

describe('useCnightDesignationSheet — reopen detection gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDispatchLaceAction.mockReturnValue(
      vi.fn() as unknown as ReturnType<
        typeof hooksModule.useDispatchLaceAction
      >,
    );
  });
  afterEach(() => vi.restoreAllMocks());

  it('detects (loader) on the first render even when a prior scan already resolved', () => {
    // Reopen scenario: the store already holds this account's resolved status
    // (designated). Record isDetecting per render — [0] is the first, pre-effect
    // frame. Without the gate that frame reads `designated` straight from the
    // store (isDetecting false: the stale-view flash); with it, the frame stays
    // the loader until the post-paint re-scan is requested.
    const entry = designated(true);
    mockUseLaceSelector.mockImplementation((selector: string) => {
      switch (selector) {
        case 'nightDesignationFlow.selectState':
          return { status: 'Idle' };
        case 'network.selectNetworkType':
          return 'mainnet';
        case 'nightDesignationIndex.selectIndexByAccount':
          return indexFor(entry);
        case 'tokenPricing.selectCurrencyPreference':
          return { name: 'US Dollar' };
        case 'features.selectLoadedFeatures':
          return { featureFlags: [] };
        case 'wallets.selectActiveNetworkAccounts':
        case 'addresses.selectAllAddresses':
          return [];
        default:
          return undefined;
      }
    });

    const isDetectingByRender: boolean[] = [];
    const { result } = renderHook(() => {
      const value = useCnightDesignationSheet(props);
      isDetectingByRender.push(value.isDetecting);
      return value;
    });

    expect(isDetectingByRender[0]).toBe(true);
    // Once the effect requests the scan for this account, the store's resolved
    // status shows through.
    expect(result.current.isDetecting).toBe(false);
    expect(result.current.isDesignated).toBe(true);
  });

  it('re-gates to the loader when the account param changes on a reused screen', () => {
    // Screen reused with a new accountId (no remount). Both accounts already
    // hold a resolved status in the store, so the gate — not the raw status — is
    // what must force the loader on the first post-change frame. Keyed by
    // accountId, so it re-closes until the new account's re-scan is requested; a
    // bare-boolean gate (latched on mount) would pass the test above yet leak the
    // new account's stale status here.
    mockUseLaceSelector.mockImplementation((selector: string) => {
      switch (selector) {
        case 'nightDesignationFlow.selectState':
          return { status: 'Idle' };
        case 'network.selectNetworkType':
          return 'mainnet';
        case 'nightDesignationIndex.selectIndexByAccount':
          return { 'acc-1': designated(true), 'acc-2': designated(true) };
        case 'tokenPricing.selectCurrencyPreference':
          return { name: 'US Dollar' };
        case 'features.selectLoadedFeatures':
          return { featureFlags: [] };
        case 'wallets.selectActiveNetworkAccounts':
        case 'addresses.selectAllAddresses':
          return [];
        default:
          return undefined;
      }
    });

    const propsForAccount = (accountId: string) =>
      ({ route: { params: { accountId } } } as unknown as Parameters<
        typeof useCnightDesignationSheet
      >[0]);

    const isDetectingByRender: boolean[] = [];
    const { rerender } = renderHook(
      renderProps => {
        const value = useCnightDesignationSheet(renderProps);
        isDetectingByRender.push(value.isDetecting);
        return value;
      },
      { initialProps: propsForAccount('acc-1') },
    );

    // Settled on the first account before the param change.
    expect(isDetectingByRender.at(-1)).toBe(false);

    isDetectingByRender.length = 0;
    rerender(propsForAccount('acc-2'));

    expect(isDetectingByRender[0]).toBe(true);
    expect(isDetectingByRender.at(-1)).toBe(false);
  });
});

// The flow slice is a singleton the build side-effect drives asynchronously, so
// exercise the review/lock behaviour by advancing the mocked status by hand.
type MockFlowState = Record<string, unknown> & { status: string };

const setupWithFlow = (entry: NightDesignationIndexEntry) => {
  let flowState: MockFlowState = { status: 'Idle' };
  const setFlowState = (next: MockFlowState) => {
    flowState = next;
  };
  mockUseLaceSelector.mockImplementation((selector: string) => {
    switch (selector) {
      case 'nightDesignationFlow.selectState':
        return flowState;
      case 'network.selectNetworkType':
        return 'mainnet';
      case 'nightDesignationIndex.selectIndexByAccount':
        return indexFor(entry);
      case 'tokenPricing.selectCurrencyPreference':
        return { name: 'US Dollar' };
      case 'features.selectLoadedFeatures':
        return { featureFlags: [] };
      // No sibling accounts/addresses → external-only target path.
      case 'wallets.selectActiveNetworkAccounts':
      case 'addresses.selectAllAddresses':
        return [];
      default:
        return undefined;
    }
  });
  return {
    ...renderHook(() => useCnightDesignationSheet(props)),
    setFlowState,
  };
};

const building: MockFlowState = {
  status: 'Building',
  accountId: 'acc-1',
  action: 'designate',
  dustPubkeyHex: SELECTED_TARGET_HEX,
};
const summary: MockFlowState = {
  status: 'Summary',
  accountId: 'acc-1',
  action: 'designate',
  dustPubkeyHex: SELECTED_TARGET_HEX,
  fees: [],
  serializedTx: 'aa',
};
const summarySecond: MockFlowState = {
  ...summary,
  dustPubkeyHex: SECOND_TARGET_HEX,
  serializedTx: 'bb',
};

// Wallet-target variant of setupWithFlow: two Midnight siblings resolving
// distinct dust targets, so a mid-build selection change is observable.
const setupWithWalletFlow = (entry: NightDesignationIndexEntry) => {
  let flowState: MockFlowState = { status: 'Idle' };
  const setFlowState = (next: MockFlowState) => {
    flowState = next;
  };
  const cardanoAccount = {
    accountId: 'acc-1',
    blockchainName: 'Cardano',
    networkType: 'mainnet',
    walletId: 'w1',
  };
  const midnight0 = {
    accountId: 'mid-0',
    blockchainName: 'Midnight',
    networkType: 'mainnet',
    metadata: { name: 'Midnight #0' },
  };
  const midnight1 = {
    accountId: 'mid-1',
    blockchainName: 'Midnight',
    networkType: 'mainnet',
    metadata: { name: 'Midnight #1' },
  };
  mockUseLaceSelector.mockImplementation((selector: string) => {
    switch (selector) {
      case 'nightDesignationFlow.selectState':
        return flowState;
      case 'network.selectNetworkType':
        return 'mainnet';
      case 'nightDesignationIndex.selectIndexByAccount':
        return indexFor(entry);
      case 'tokenPricing.selectCurrencyPreference':
        return { name: 'US Dollar' };
      case 'features.selectLoadedFeatures':
        return { featureFlags: [] };
      case 'wallets.selectActiveNetworkAccounts':
        return [cardanoAccount];
      case 'wallets.selectWalletById':
        return { accounts: [cardanoAccount, midnight0, midnight1] };
      case 'addresses.selectAllAddresses':
        return [
          { accountId: 'mid-0', address: MAINNET_DUST_ADDRESS },
          { accountId: 'mid-1', address: SECOND_MAINNET_DUST_ADDRESS },
        ];
      default:
        return undefined;
    }
  });
  return {
    ...renderHook(() => useCnightDesignationSheet(props)),
    setFlowState,
  };
};

describe('useCnightDesignationSheet — review target vs built tx', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDispatchLaceAction.mockReturnValue(
      vi.fn() as unknown as ReturnType<
        typeof hooksModule.useDispatchLaceAction
      >,
    );
  });

  afterEach(() => vi.restoreAllMocks());

  it('shows the recipient submitted for build, not a later live-form edit', () => {
    const { result, rerender, setFlowState } = setupWithFlow(notDesignated);

    act(() => {
      result.current.setExternalAddress(MAINNET_DUST_ADDRESS);
    });
    act(() => {
      result.current.handleContinue();
    });

    // Build in flight; the still-mounted form is edited to another recipient.
    act(() => {
      setFlowState(building);
    });
    rerender();
    act(() => {
      result.current.setExternalAddress(SECOND_MAINNET_DUST_ADDRESS);
    });
    // Reaching the review screen must still show the built target.
    act(() => {
      setFlowState(summary);
    });
    rerender();

    expect(result.current.step).toBe('review');
    expect(result.current.reviewTarget.address).toBe(MAINNET_DUST_ADDRESS);
  });

  it('tracks the live form again after returning to the form', () => {
    const { result, rerender, setFlowState } = setupWithFlow(notDesignated);

    act(() => {
      result.current.setExternalAddress(MAINNET_DUST_ADDRESS);
    });
    act(() => {
      result.current.handleContinue();
    });
    act(() => {
      setFlowState(summary);
    });
    rerender();

    // "Back" resets the flow to Idle → the review target unfreezes.
    act(() => {
      setFlowState({ status: 'Idle' });
    });
    rerender();
    act(() => {
      result.current.setExternalAddress(SECOND_MAINNET_DUST_ADDRESS);
    });

    expect(result.current.reviewTarget.address).toBe(
      SECOND_MAINNET_DUST_ADDRESS,
    );
  });

  it('re-commits the newly chosen target on a second designation', () => {
    const { result, rerender, setFlowState } = setupWithFlow(notDesignated);

    // First designation: commit + review address A.
    act(() => {
      result.current.setExternalAddress(MAINNET_DUST_ADDRESS);
    });
    act(() => {
      result.current.handleContinue();
    });
    act(() => {
      setFlowState(summary);
    });
    rerender();
    expect(result.current.reviewTarget.address).toBe(MAINNET_DUST_ADDRESS);

    // "Back", choose a different target, designate again — the snapshot must
    // update to B; a set-once snapshot would keep showing the stale A.
    act(() => {
      setFlowState({ status: 'Idle' });
    });
    rerender();
    act(() => {
      result.current.setExternalAddress(SECOND_MAINNET_DUST_ADDRESS);
    });
    act(() => {
      result.current.handleContinue();
    });
    act(() => {
      setFlowState(summarySecond);
    });
    rerender();

    expect(result.current.reviewTarget.address).toBe(
      SECOND_MAINNET_DUST_ADDRESS,
    );
  });

  it('freezes an in-wallet recipient across a mid-build selection change', () => {
    const { result, rerender, setFlowState } =
      setupWithWalletFlow(notDesignated);

    // A fresh account auto-selects the first wallet target (Midnight #0).
    expect(result.current.selectedTargetId).toBe('mid-0');
    act(() => {
      result.current.handleContinue();
    });

    // Switch the selection mid-build; Review must still show the committed one.
    act(() => {
      setFlowState(building);
    });
    rerender();
    act(() => {
      result.current.setSelectedTargetId('mid-1');
    });
    act(() => {
      setFlowState(summary);
    });
    rerender();

    expect(result.current.reviewTarget.isOwn).toBe(true);
    expect(result.current.reviewTarget.accountName).toBe('Midnight #0');
    expect(result.current.reviewTarget.address).toBe(MAINNET_DUST_ADDRESS);
  });

  it('locks the form inputs while the tx builds', () => {
    const { result, rerender, setFlowState } = setupWithFlow(notDesignated);

    expect(result.current.isFormLocked).toBe(false);

    act(() => {
      setFlowState(building);
    });
    rerender();

    expect(result.current.isFormLocked).toBe(true);
  });
});

describe('useCnightDesignationSheet — account-change reset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());

  const propsForAccount = (accountId: string) =>
    ({ route: { params: { accountId } } } as unknown as Parameters<
      typeof useCnightDesignationSheet
    >[0]);

  // Two Cardano accounts in one wallet share the same Midnight siblings
  // (mid-0 → address A, mid-1 → address B), so a stale pick from one account
  // stays a valid id under the next — the shape where only the render-time
  // reset or a genuine re-seed can change the selection.
  const mockSharedWalletSelectors = (
    index: Partial<Record<string, NightDesignationIndexEntry>>,
  ) => {
    const account = (accountId: string) => ({
      accountId,
      blockchainName: 'Cardano',
      networkType: 'mainnet',
      walletId: 'w1',
    });
    const midnightSibling = (accountId: string, name: string) => ({
      accountId,
      blockchainName: 'Midnight',
      networkType: 'mainnet',
      metadata: { name },
    });
    mockUseDispatchLaceAction.mockReturnValue(
      vi.fn() as unknown as ReturnType<
        typeof hooksModule.useDispatchLaceAction
      >,
    );
    mockUseLaceSelector.mockImplementation(
      (selector: string, ..._args: unknown[]) => {
        switch (selector) {
          case 'nightDesignationFlow.selectState':
            return { status: 'Idle' };
          case 'network.selectNetworkType':
            return 'mainnet';
          case 'nightDesignationIndex.selectIndexByAccount':
            return index;
          case 'tokenPricing.selectCurrencyPreference':
            return { name: 'US Dollar' };
          case 'features.selectLoadedFeatures':
            return { featureFlags: [] };
          case 'wallets.selectActiveNetworkAccounts':
            return [account('acc-1'), account('acc-2')];
          case 'wallets.selectWalletById':
            return {
              accounts: [
                account('acc-1'),
                midnightSibling('mid-0', 'Midnight #0'),
                midnightSibling('mid-1', 'Midnight #1'),
              ],
            };
          case 'addresses.selectAllAddresses':
            return [
              { accountId: 'mid-0', address: MAINNET_DUST_ADDRESS },
              { accountId: 'mid-1', address: SECOND_MAINNET_DUST_ADDRESS },
            ];
          default:
            return undefined;
        }
      },
    );
  };

  it('resets the flow and re-gates the step to the form when the account param changes on a reused screen', () => {
    // Model the singleton flow slice so `reset` actually clears it to Idle.
    // Detection is not-designated throughout, so the form is the resolved view —
    // a Success step can only appear if a prior account's terminal state leaks.
    let flowState: MockFlowState = { status: 'Idle' };
    const resetMock = vi.fn(() => {
      flowState = { status: 'Idle' };
    });
    mockUseDispatchLaceAction.mockImplementation(
      (key: string) =>
        (key === 'nightDesignationFlow.reset'
          ? resetMock
          : vi.fn()) as unknown as ReturnType<
          typeof hooksModule.useDispatchLaceAction
        >,
    );
    mockUseLaceSelector.mockImplementation((selector: string) => {
      switch (selector) {
        case 'nightDesignationFlow.selectState':
          return flowState;
        case 'network.selectNetworkType':
          return 'mainnet';
        case 'nightDesignationIndex.selectIndexByAccount':
          return indexFor(notDesignated);
        case 'tokenPricing.selectCurrencyPreference':
          return { name: 'US Dollar' };
        case 'features.selectLoadedFeatures':
          return { featureFlags: [] };
        case 'wallets.selectActiveNetworkAccounts':
        case 'addresses.selectAllAddresses':
          return [];
        default:
          return undefined;
      }
    });

    const stepByRender: string[] = [];
    const { result, rerender } = renderHook(
      renderProps => {
        const value = useCnightDesignationSheet(renderProps);
        stepByRender.push(value.step);
        return value;
      },
      { initialProps: propsForAccount('acc-1') },
    );

    // Every non-Idle flow state carries accountId in production and the step gate
    // keys on it, so the fixture must include it to be representative.
    act(() => {
      flowState = {
        status: 'Success',
        accountId: 'acc-1',
        action: 'designate',
        txId: 'tx-1',
      };
    });
    rerender(propsForAccount('acc-1'));
    expect(result.current.step).toBe('success');

    const resetCallsBeforeChange = resetMock.mock.calls.length;
    stepByRender.length = 0;
    rerender(propsForAccount('acc-2'));

    // The first post-change frame is gated to the form (resetFor still holds
    // acc-1) even though the singleton still reads acc-1's Success...
    expect(stepByRender[0]).toBe('form');
    // ...and reset re-fires for acc-2, clearing the leaked Success so the
    // settled step is the form, not the previous account's success screen.
    expect(resetMock.mock.calls.length).toBeGreaterThan(resetCallsBeforeChange);
    expect(result.current.step).toBe('form');
  });

  it('re-seeds the wallet target to the new account current designation when the param changes on a reused screen', () => {
    // acc-2 is designated to mid-1 while the cleared-selection fallback is
    // walletTargets[0] (mid-0), so only a genuine re-seed produces the
    // asserted value — the fallback alone cannot make this pass.
    mockSharedWalletSelectors({
      'acc-1': notDesignated,
      'acc-2': designated(true, SECOND_TARGET_HEX),
    });

    const { result, rerender } = renderHook(
      renderProps => useCnightDesignationSheet(renderProps),
      { initialProps: propsForAccount('acc-1') },
    );

    expect(result.current.selectedTargetId).toBe('mid-0');

    rerender(propsForAccount('acc-2'));

    expect(result.current.selectedTargetId).toBe('mid-1');
  });

  it('clears the prior account manual target pick for a new account stuck detecting', () => {
    // acc-2 never resolves detection, so its seeding effect cannot mask a
    // leaked pick: only the render-time reset keeps mid-1 from surviving.
    mockSharedWalletSelectors({
      'acc-1': notDesignated,
      'acc-2': detecting,
    });

    const { result, rerender } = renderHook(
      renderProps => useCnightDesignationSheet(renderProps),
      { initialProps: propsForAccount('acc-1') },
    );

    act(() => {
      result.current.setSelectedTargetId('mid-1');
    });
    expect(result.current.selectedTargetId).toBe('mid-1');

    rerender(propsForAccount('acc-2'));

    expect(result.current.isDetecting).toBe(true);
    expect(result.current.selectedTargetId).toBe('mid-0');
  });

  it('re-seeds the wallet target on return from an account that never resolved detection', () => {
    // acc-2 stays detecting for its whole stint, so its own seeding never runs.
    // Returning to acc-1 (designated to mid-1, so a re-seed is distinguishable
    // from the mid-0 fallback) must still re-seed: the seed guard has to be
    // cleared by the account change itself, not only by a successful seed.
    mockSharedWalletSelectors({
      'acc-1': designated(true, SECOND_TARGET_HEX),
      'acc-2': detecting,
    });

    const { result, rerender } = renderHook(
      renderProps => useCnightDesignationSheet(renderProps),
      { initialProps: propsForAccount('acc-1') },
    );

    expect(result.current.selectedTargetId).toBe('mid-1');
    act(() => {
      result.current.setSelectedTargetId('mid-0');
    });
    expect(result.current.selectedTargetId).toBe('mid-0');

    rerender(propsForAccount('acc-2'));
    expect(result.current.isDetecting).toBe(true);

    rerender(propsForAccount('acc-1'));

    expect(result.current.selectedTargetId).toBe('mid-1');
  });

  it('clears a pasted external target so it cannot drive Continue for the new account', () => {
    // External-only path (no wallet siblings): the pasted address is the sole target.
    mockUseDispatchLaceAction.mockReturnValue(
      vi.fn() as unknown as ReturnType<
        typeof hooksModule.useDispatchLaceAction
      >,
    );
    mockUseLaceSelector.mockImplementation((selector: string) => {
      switch (selector) {
        case 'nightDesignationFlow.selectState':
          return { status: 'Idle' };
        case 'network.selectNetworkType':
          return 'mainnet';
        case 'nightDesignationIndex.selectIndexByAccount':
          return indexFor(notDesignated);
        case 'tokenPricing.selectCurrencyPreference':
          return { name: 'US Dollar' };
        case 'features.selectLoadedFeatures':
          return { featureFlags: [] };
        case 'wallets.selectActiveNetworkAccounts':
        case 'addresses.selectAllAddresses':
          return [];
        default:
          return undefined;
      }
    });

    const { result, rerender } = renderHook(
      renderProps => useCnightDesignationSheet(renderProps),
      { initialProps: propsForAccount('acc-1') },
    );

    act(() => {
      result.current.setExternalAddress(MAINNET_DUST_ADDRESS);
    });
    expect(result.current.canContinue).toBe(true);

    rerender(propsForAccount('acc-2'));

    expect(result.current.externalAddress).toBe('');
    expect(result.current.canContinue).toBe(false);
  });

  it('resets the target tab to the wallet default when the param changes on a reused screen', () => {
    // A wallet sibling makes the "My wallet" tab selectable, so the switch to
    // "external" sticks — otherwise targetMode is forced to external.
    const account = (accountId: string) => ({
      accountId,
      blockchainName: 'Cardano',
      networkType: 'mainnet',
      walletId: 'w1',
    });
    const midnight0 = {
      accountId: 'mid-0',
      blockchainName: 'Midnight',
      networkType: 'mainnet',
      metadata: { name: 'Midnight #0' },
    };
    mockUseDispatchLaceAction.mockReturnValue(
      vi.fn() as unknown as ReturnType<
        typeof hooksModule.useDispatchLaceAction
      >,
    );
    mockUseLaceSelector.mockImplementation((selector: string) => {
      switch (selector) {
        case 'nightDesignationFlow.selectState':
          return { status: 'Idle' };
        case 'network.selectNetworkType':
          return 'mainnet';
        case 'nightDesignationIndex.selectIndexByAccount':
          return indexFor(notDesignated);
        case 'tokenPricing.selectCurrencyPreference':
          return { name: 'US Dollar' };
        case 'features.selectLoadedFeatures':
          return { featureFlags: [] };
        case 'wallets.selectActiveNetworkAccounts':
          return [account('acc-1'), account('acc-2')];
        case 'wallets.selectWalletById':
          return { accounts: [account('acc-1'), midnight0] };
        case 'addresses.selectAllAddresses':
          return [{ accountId: 'mid-0', address: MAINNET_DUST_ADDRESS }];
        default:
          return undefined;
      }
    });

    const { result, rerender } = renderHook(
      renderProps => useCnightDesignationSheet(renderProps),
      { initialProps: propsForAccount('acc-1') },
    );

    expect(result.current.targetMode).toBe('wallet');
    act(() => {
      result.current.setTargetMode('external');
    });
    expect(result.current.targetMode).toBe('external');

    rerender(propsForAccount('acc-2'));

    expect(result.current.targetMode).toBe('wallet');
  });

  it('does not surface the prior account built tx as review after switching accounts', () => {
    // No-op reset models the race window: the singleton still holds acc-1's
    // built Summary while the screen is re-pointed at acc-2 (reset not landed).
    let flowState: MockFlowState = { status: 'Idle' };
    mockUseDispatchLaceAction.mockReturnValue(
      vi.fn() as unknown as ReturnType<
        typeof hooksModule.useDispatchLaceAction
      >,
    );
    mockUseLaceSelector.mockImplementation((selector: string) => {
      switch (selector) {
        case 'nightDesignationFlow.selectState':
          return flowState;
        case 'network.selectNetworkType':
          return 'mainnet';
        case 'nightDesignationIndex.selectIndexByAccount':
          return indexFor(notDesignated);
        case 'tokenPricing.selectCurrencyPreference':
          return { name: 'US Dollar' };
        case 'features.selectLoadedFeatures':
          return { featureFlags: [] };
        case 'wallets.selectActiveNetworkAccounts':
        case 'addresses.selectAllAddresses':
          return [];
        default:
          return undefined;
      }
    });

    const { result, rerender } = renderHook(
      renderProps => useCnightDesignationSheet(renderProps),
      { initialProps: propsForAccount('acc-1') },
    );

    act(() => {
      flowState = summary;
    });
    rerender(propsForAccount('acc-1'));
    expect(result.current.step).toBe('review');

    rerender(propsForAccount('acc-2'));

    expect(result.current.step).toBe('form');
  });
});

describe('useCnightDesignationSheet — stale terminal flow guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());

  const propsForAccount = (accountId: string) =>
    ({ route: { params: { accountId } } } as unknown as Parameters<
      typeof useCnightDesignationSheet
    >[0]);

  // Models the singleton flow slice with a working `reset` so the guard's own
  // dispatch is observable both by call count and by the state it clears.
  const setupSingletonFlow = () => {
    let flowState: MockFlowState = { status: 'Idle' };
    const resetMock = vi.fn(() => {
      flowState = { status: 'Idle' };
    });
    mockUseDispatchLaceAction.mockImplementation(
      (key: string) =>
        (key === 'nightDesignationFlow.reset'
          ? resetMock
          : vi.fn()) as unknown as ReturnType<
          typeof hooksModule.useDispatchLaceAction
        >,
    );
    mockUseLaceSelector.mockImplementation((selector: string) => {
      switch (selector) {
        case 'nightDesignationFlow.selectState':
          return flowState;
        case 'network.selectNetworkType':
          return 'mainnet';
        case 'nightDesignationIndex.selectIndexByAccount':
          return indexFor(notDesignated);
        case 'tokenPricing.selectCurrencyPreference':
          return { name: 'US Dollar' };
        case 'features.selectLoadedFeatures':
          return { featureFlags: [] };
        case 'wallets.selectActiveNetworkAccounts':
        case 'addresses.selectAllAddresses':
          return [];
        default:
          return undefined;
      }
    });
    return {
      resetMock,
      setFlowState: (next: MockFlowState) => {
        flowState = next;
      },
    };
  };

  const successFor = (accountId: string): MockFlowState => ({
    status: 'Success',
    accountId,
    action: 'designate',
    txId: 'tx-1',
  });

  it('clears a terminal flow left behind by a background completion on reopen (mount reset, not the guard)', () => {
    const { resetMock, setFlowState } = setupSingletonFlow();
    setFlowState(successFor('acc-1'));

    const { result } = renderHook(
      renderProps => useCnightDesignationSheet(renderProps),
      { initialProps: propsForAccount('acc-1') },
    );

    expect(resetMock).toHaveBeenCalled();
    expect(result.current.step).toBe('form');
    expect(result.current.canStop).toBe(true);
  });

  it('leaves a foreign in-flight flow untouched and keeps the CTAs disabled', () => {
    const { resetMock, setFlowState } = setupSingletonFlow();
    const { result, rerender } = renderHook(
      renderProps => useCnightDesignationSheet(renderProps),
      { initialProps: propsForAccount('acc-2') },
    );
    const resetCallsAfterMount = resetMock.mock.calls.length;

    act(() => {
      setFlowState({
        status: 'AwaitingConfirmation',
        accountId: 'acc-1',
        action: 'designate',
        fees: [],
        serializedTx: 'cbor',
      });
    });
    rerender(propsForAccount('acc-2'));

    // The guard must not reset a run that is still signing or submitting; the
    // cost, pinned here, is that this sheet's CTAs stay disabled meanwhile.
    expect(resetMock.mock.calls.length).toBe(resetCallsAfterMount);
    expect(result.current.step).toBe('form');
    expect(result.current.canContinue).toBe(false);
    expect(result.current.canStop).toBe(false);
  });

  it('clears a flow that turns terminal for another account while this sheet is open', () => {
    const { resetMock, setFlowState } = setupSingletonFlow();
    const { result, rerender } = renderHook(
      renderProps => useCnightDesignationSheet(renderProps),
      { initialProps: propsForAccount('acc-2') },
    );
    const resetCallsAfterMount = resetMock.mock.calls.length;
    expect(result.current.canStop).toBe(true);

    act(() => {
      setFlowState(successFor('acc-1'));
    });
    rerender(propsForAccount('acc-2'));

    expect(resetMock.mock.calls.length).toBeGreaterThan(resetCallsAfterMount);
    // The guard already cleared the singleton; this render reads it back.
    rerender(propsForAccount('acc-2'));
    expect(result.current.canStop).toBe(true);
  });

  it('keeps a terminal flow that belongs to this sheet account', () => {
    const { resetMock, setFlowState } = setupSingletonFlow();
    const { result, rerender } = renderHook(
      renderProps => useCnightDesignationSheet(renderProps),
      { initialProps: propsForAccount('acc-1') },
    );
    const resetCallsAfterMount = resetMock.mock.calls.length;

    act(() => {
      setFlowState(successFor('acc-1'));
    });
    rerender(propsForAccount('acc-1'));

    expect(resetMock.mock.calls.length).toBe(resetCallsAfterMount);
    expect(result.current.step).toBe('success');
  });
});
