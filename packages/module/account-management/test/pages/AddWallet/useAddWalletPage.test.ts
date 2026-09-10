/**
 * @vitest-environment jsdom
 */
import { clearRestoreWalletSecrets } from '@lace-contract/account-management';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requestCreateWalletCeremony: vi.fn(),
  requestImportWalletCeremony: vi.fn(),
  // `useLoadModules` returns undefined until the addon promise lands, then an
  // array with one entry per implementer.
  vaultCapabilities: undefined as unknown,
  hasHardwareOnboardingOption: false,
  pendingCeremony: null as { ceremony: string; walletId?: string } | null,
  entryOptionPressed: vi.fn(),
  entryCustomisations: [] as unknown[],
  trackEvent: vi.fn(),
}));

vi.mock('@lace-contract/account-management', () => ({
  clearRestoreWalletSecrets: vi.fn(),
}));

vi.mock('@lace-contract/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@lace-contract/app', () => ({
  useUICustomisation: () => mocks.entryCustomisations,
}));

vi.mock('@lace-contract/analytics', () => ({
  useAnalytics: () => ({ trackEvent: mocks.trackEvent }),
}));

vi.mock('@lace-contract/onboarding-v2', () => ({
  isHardwareOption: () => mocks.hasHardwareOnboardingOption,
}));

vi.mock('@lace-lib/navigation', () => ({
  NavigationControls: { navigate: vi.fn() },
  SheetRoutes: { AddWalletHardware: 'AddWalletHardware' },
}));

vi.mock('../../../src/hooks', () => ({
  useDispatchLaceAction: (action: string) =>
    action === 'vault.createWalletCeremonyRequested'
      ? mocks.requestCreateWalletCeremony
      : mocks.requestImportWalletCeremony,
  useLaceSelector: () => mocks.pendingCeremony,
  useLoadModules: () => mocks.vaultCapabilities,
  useLoadedOnboardingOptions: () =>
    mocks.hasHardwareOnboardingOption ? [[{ isHwDevice: true }]] : undefined,
}));

import { useAddWalletPage } from '../../../src/pages/AddWallet/useAddWalletPage';

import type { StackRoutes, StackScreenProps } from '@lace-lib/navigation';

const vaultCapabilities = (over: Record<string, boolean> = {}) => [
  {
    create: false,
    import: false,
    connectHardware: false,
    addAccount: false,
    renameAccount: false,
    ...over,
  },
];

beforeEach(() => {
  mocks.vaultCapabilities = vaultCapabilities({ create: true, import: true });
  mocks.hasHardwareOnboardingOption = false;
  mocks.pendingCeremony = null;
  mocks.entryCustomisations = [];
});

/** What migrate-wallet contributes through the onboarding entry addon. */
const migrateEntry = {
  EntryOptions: [
    {
      id: 'migrate-wallet',
      icon: 'ArrowLeftRight',
      titleKey: 'migrate-wallet.entry.card-title',
      descriptionKey: 'migrate-wallet.entry.card-description',
      onPress: mocks.entryOptionPressed,
    },
  ],
};

const props = {
  navigation: { goBack: vi.fn() },
} as unknown as StackScreenProps<StackRoutes.AddWallet>;

const pressAction = (
  result: { current: ReturnType<typeof useAddWalletPage> },
  testID: string,
) => {
  const action = result.current.actions.find(item => item.testID === testID);
  if (!action) throw new Error(`action ${testID} not found`);
  act(() => {
    action.onPress?.();
  });
};

// The buffer is a module singleton in the UI process; the ceremony side effect
// answering these intents can run in another one, so only the hook can clear it.
describe('useAddWalletPage staged secrets', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('discards the staged restore phrase before requesting the import ceremony', () => {
    const { result } = renderHook(() => useAddWalletPage(props));

    pressAction(result, 'add-wallet-import-action');

    expect(clearRestoreWalletSecrets).toHaveBeenCalledTimes(1);
    expect(mocks.requestImportWalletCeremony).toHaveBeenCalledWith({
      origin: 'management',
    });
  });

  it('leaves the staged restore phrase alone for the create ceremony, which never reads it', () => {
    const { result } = renderHook(() => useAddWalletPage(props));

    pressAction(result, 'add-wallet-create-action');

    expect(clearRestoreWalletSecrets).not.toHaveBeenCalled();
    expect(mocks.requestCreateWalletCeremony).toHaveBeenCalledWith({
      origin: 'management',
    });
  });
});

describe('useAddWalletPage vault-capability gating', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const testIDs = (result: {
    current: ReturnType<typeof useAddWalletPage>;
  }): (string | undefined)[] => result.current.actions.map(item => item.testID);

  it('hides the create and import actions while the capabilities promise is unresolved', () => {
    mocks.vaultCapabilities = undefined;

    const { result } = renderHook(() => useAddWalletPage(props));

    expect(testIDs(result)).toEqual([]);
  });

  it('hides the create and import actions when the host advertises neither ceremony', () => {
    mocks.vaultCapabilities = vaultCapabilities();

    const { result } = renderHook(() => useAddWalletPage(props));

    expect(testIDs(result)).toEqual([]);
  });

  it('gates each action on its own capability', () => {
    mocks.vaultCapabilities = vaultCapabilities({ create: true });

    const { result } = renderHook(() => useAddWalletPage(props));

    expect(testIDs(result)).toEqual(['add-wallet-create-action']);
  });

  it('shows the hardware action when the arm can pair AND advertises a device', () => {
    mocks.vaultCapabilities = vaultCapabilities({ connectHardware: true });
    mocks.hasHardwareOnboardingOption = true;

    const { result } = renderHook(() => useAddWalletPage(props));

    expect(testIDs(result)).toEqual(['add-wallet-hardware-action']);
  });

  it('hides the hardware action when the arm cannot run a pairing ceremony', () => {
    mocks.vaultCapabilities = vaultCapabilities({ connectHardware: false });
    mocks.hasHardwareOnboardingOption = true;

    const { result } = renderHook(() => useAddWalletPage(props));

    expect(testIDs(result)).toEqual([]);
  });

  it('hides the hardware action when no device tile is registered to navigate to', () => {
    mocks.vaultCapabilities = vaultCapabilities({ connectHardware: true });
    mocks.hasHardwareOnboardingOption = false;

    const { result } = renderHook(() => useAddWalletPage(props));

    expect(testIDs(result)).toEqual([]);
  });
});

describe('useAddWalletPage launch-pending state', () => {
  const action = (
    result: { current: ReturnType<typeof useAddWalletPage> },
    testID: string,
  ) => result.current.actions.find(item => item.testID === testID);

  it('leaves every action pressable while nothing is launching', () => {
    const { result } = renderHook(() => useAddWalletPage(props));

    expect(action(result, 'add-wallet-create-action')).toMatchObject({
      disabled: false,
      loading: false,
    });
  });

  it('spins the launching action and locks the rest', () => {
    mocks.pendingCeremony = { ceremony: 'create' };

    const { result } = renderHook(() => useAddWalletPage(props));

    expect(action(result, 'add-wallet-create-action')).toMatchObject({
      disabled: true,
      loading: true,
    });
    expect(action(result, 'add-wallet-import-action')).toMatchObject({
      disabled: true,
      loading: false,
    });
  });

  it('locks the hardware entry too, without spinning it — it navigates rather than launches', () => {
    mocks.vaultCapabilities = vaultCapabilities({ connectHardware: true });
    mocks.hasHardwareOnboardingOption = true;
    mocks.pendingCeremony = { ceremony: 'import' };

    const { result } = renderHook(() => useAddWalletPage(props));

    expect(action(result, 'add-wallet-hardware-action')).toMatchObject({
      disabled: true,
    });
    expect(action(result, 'add-wallet-hardware-action')).not.toHaveProperty(
      'loading',
    );
  });
});

// FR-1 requires the migration flow from onboarding AND add wallet. It shipped
// with only the onboarding half, so these pin the second door.
// Mirrors onboarding's option-press events under this surface's prefix, so
// the two funnels compare like for like. Without these, add-wallet's
// create/import/hardware choices leave no trace and the migrate share has no
// denominator.
describe('useAddWalletPage analytics', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ['add-wallet-create-action', 'account management | new wallet | press'],
    ['add-wallet-import-action', 'account management | restore wallet | press'],
  ] as const)('%s press fires %s', (testID, eventName) => {
    const { result } = renderHook(() => useAddWalletPage(props));

    pressAction(result, testID);

    expect(mocks.trackEvent).toHaveBeenCalledWith(eventName);
  });

  it('hardware press fires its connect event', () => {
    mocks.vaultCapabilities = vaultCapabilities({ connectHardware: true });
    mocks.hasHardwareOnboardingOption = true;

    const { result } = renderHook(() => useAddWalletPage(props));
    pressAction(result, 'add-wallet-hardware-action');

    expect(mocks.trackEvent).toHaveBeenCalledWith(
      'account management | hardware wallet | connect | press',
    );
  });

  // The migrate card's press dispatches wizardOpened, whose intro-view event
  // already carries origin 'add-wallet' — an event here would double-count.
  it('does not event the contributed entry press', () => {
    mocks.entryCustomisations = [migrateEntry];

    const { result } = renderHook(() => useAddWalletPage(props));
    pressAction(result, 'add-wallet-migrate-wallet-action');

    expect(mocks.trackEvent).not.toHaveBeenCalled();
  });
});

describe('useAddWalletPage module-contributed entries', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  type Rendered = { current: ReturnType<typeof useAddWalletPage> };
  const entryAction = (result: Rendered, testID: string) =>
    result.current.actions.find(item => item.testID === testID);
  const entryTestIDs = (result: Rendered) =>
    result.current.actions.map(item => item.testID);

  it('offers a contributed entry alongside create and import', () => {
    mocks.entryCustomisations = [migrateEntry];

    const { result } = renderHook(() => useAddWalletPage(props));

    expect(
      entryAction(result, 'add-wallet-migrate-wallet-action'),
    ).toMatchObject({ title: 'migrate-wallet.entry.card-title' });
  });

  // Same position as onboarding: an alternative to restoring, so next to it
  // rather than after hardware.
  it('places it between import and hardware', () => {
    mocks.vaultCapabilities = vaultCapabilities({
      create: true,
      import: true,
      connectHardware: true,
    });
    mocks.hasHardwareOnboardingOption = true;
    mocks.entryCustomisations = [migrateEntry];

    const { result } = renderHook(() => useAddWalletPage(props));

    expect(entryTestIDs(result)).toEqual([
      'add-wallet-create-action',
      'add-wallet-import-action',
      'add-wallet-migrate-wallet-action',
      'add-wallet-hardware-action',
    ]);
  });

  // The contributed flow reports its own funnel, so it has to be told which of
  // the two lists the user actually pressed.
  it('tells the entry it was pressed from add wallet, not onboarding', () => {
    mocks.entryCustomisations = [migrateEntry];

    const { result } = renderHook(() => useAddWalletPage(props));
    pressAction(result, 'add-wallet-migrate-wallet-action');

    expect(mocks.entryOptionPressed).toHaveBeenCalledWith('add-wallet');
  });

  it('locks the contributed entry mid-ceremony, like every other tile', () => {
    mocks.entryCustomisations = [migrateEntry];
    mocks.pendingCeremony = { ceremony: 'create' };

    const { result } = renderHook(() => useAddWalletPage(props));

    expect(
      entryAction(result, 'add-wallet-migrate-wallet-action'),
    ).toMatchObject({ disabled: true });
  });

  it('renders nothing extra when no module contributes one', () => {
    const { result } = renderHook(() => useAddWalletPage(props));

    expect(entryTestIDs(result)).not.toContain(
      'add-wallet-migrate-wallet-action',
    );
  });
});
