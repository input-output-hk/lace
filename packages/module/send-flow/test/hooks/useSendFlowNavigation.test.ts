/**
 * @vitest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { useSendFlowNavigation as UseSendFlowNavigation } from '../../src/hooks/useSendFlowNavigation';
import type { SheetRoutes } from '@lace-lib/navigation';

const {
  mockDispatchClosed,
  mockResetSendFlow,
  mockIsReady,
  mockGetRootState,
  mockAddListener,
  mockGetCurrentContainer,
  mockNavigate,
} = vi.hoisted(() => ({
  mockDispatchClosed: vi.fn(),
  mockResetSendFlow: vi.fn(),
  mockIsReady: vi.fn(),
  mockGetRootState: vi.fn(),
  mockAddListener: vi.fn(),
  mockGetCurrentContainer: vi.fn(),
  mockNavigate: vi.fn(),
}));

vi.mock('../../src/hooks', () => ({
  useDispatchLaceAction: () => mockDispatchClosed,
}));

vi.mock('@lace-contract/send-flow', () => ({
  useSendFlow: () => ({ resetSendFlow: mockResetSendFlow }),
}));

vi.mock('@lace-lib/navigation', () => ({
  navigationRef: {
    isReady: mockIsReady,
    getRootState: mockGetRootState,
    addListener: mockAddListener,
    // The watcher re-attaches when this instance changes (container remount).
    get current(): object | null {
      return mockGetCurrentContainer() as object | null;
    },
  },
  NavigationControls: { navigate: mockNavigate },
  SheetRoutes: {
    Send: 'Send',
    ReviewTransaction: 'ReviewTransaction',
    SendResult: 'SendResult',
    AddAssets: 'AddAssets',
    AddressBook: 'AddressBook',
    QrScanner: 'QrScanner',
  },
}));

const rootStateWith = (...sheetNames: string[]) => ({
  index: sheetNames.length,
  routes: [{ name: 'RootStack' }, ...sheetNames.map(name => ({ name }))],
});

/** Fire the `state` listener the hook registered with the navigation container. */
const emitNavigationState = (): void => {
  const listener = mockAddListener.mock.calls.at(-1)?.[1] as
    | (() => void)
    | undefined;
  listener?.();
};

// Re-imported per test so the module-level singleton stack watcher starts fresh.
// eslint-disable-next-line functional/no-let
let useSendFlowNavigation: typeof UseSendFlowNavigation;

describe('useSendFlowNavigation', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    mockIsReady.mockReturnValue(true);
    // Stable container identity by default, so the watcher subscribes once.
    mockGetCurrentContainer.mockReturnValue({});
    ({ useSendFlowNavigation } = await import(
      '../../src/hooks/useSendFlowNavigation'
    ));
  });

  it('subscribes a single navigation state listener across all mounted screens', () => {
    mockGetRootState.mockReturnValue(rootStateWith('Send'));

    renderHook(() => useSendFlowNavigation());
    renderHook(() => useSendFlowNavigation());

    expect(mockAddListener).toHaveBeenCalledOnce();
    expect(mockAddListener).toHaveBeenCalledWith('state', expect.any(Function));
  });

  it('resets the flow when the send-flow sheet stack empties', () => {
    mockGetRootState.mockReturnValue(rootStateWith('Send'));
    renderHook(() => useSendFlowNavigation());

    // Stack collapses to the base route → open→closed transition.
    mockGetRootState.mockReturnValue(rootStateWith());
    emitNavigationState();

    expect(mockDispatchClosed).toHaveBeenCalledOnce();
    expect(mockResetSendFlow).toHaveBeenCalledOnce();
  });

  it('does not reset while a send-flow sheet remains in the stack', () => {
    mockGetRootState.mockReturnValue(rootStateWith('Send', 'AddAssets'));
    renderHook(() => useSendFlowNavigation());

    // Top sheet popped, but Send is still present — still inside the flow.
    mockGetRootState.mockReturnValue(rootStateWith('Send'));
    emitNavigationState();

    expect(mockDispatchClosed).not.toHaveBeenCalled();
    expect(mockResetSendFlow).not.toHaveBeenCalled();
  });

  it('resets only once on the open→closed edge, not on subsequent empty states', () => {
    mockGetRootState.mockReturnValue(rootStateWith('Send'));
    renderHook(() => useSendFlowNavigation());

    mockGetRootState.mockReturnValue(rootStateWith());
    emitNavigationState();
    emitNavigationState();

    expect(mockDispatchClosed).toHaveBeenCalledOnce();
    expect(mockResetSendFlow).toHaveBeenCalledOnce();
  });

  it('resets after the screen unmounts while its route still lingers', () => {
    // Regression for the whole-stack interactive dismiss: the screen unmounts
    // while its route (and lower send-flow routes) still linger in state, so an
    // unmount-time snapshot would skip the reset. The reset must still fire when
    // the native cascade finally empties the stack — after the screens are gone.
    mockGetRootState.mockReturnValue(
      rootStateWith('Send', 'ReviewTransaction', 'SendResult'),
    );
    const { unmount } = renderHook(() => useSendFlowNavigation());

    unmount();
    expect(mockDispatchClosed).not.toHaveBeenCalled();
    expect(mockResetSendFlow).not.toHaveBeenCalled();

    // Cascade completes: routes shrink back to the base route.
    mockGetRootState.mockReturnValue(rootStateWith());
    emitNavigationState();

    expect(mockDispatchClosed).toHaveBeenCalledOnce();
    expect(mockResetSendFlow).toHaveBeenCalledOnce();
  });

  it('re-subscribes after the navigation container remounts', () => {
    // A listener added while the container is ready binds to that container
    // instance, so a `<NavigationContainer>` remount drops it. The send-flow
    // screens remount inside the new container, which must re-arm the watcher —
    // otherwise the flow would never reset again for the rest of the session.
    const containerA = {};
    const containerB = {};
    mockGetCurrentContainer.mockReturnValue(containerA);
    mockGetRootState.mockReturnValue(rootStateWith('Send'));

    const { unmount } = renderHook(() => useSendFlowNavigation());
    expect(mockAddListener).toHaveBeenCalledOnce();
    unmount();

    // Container remounts; a send-flow screen mounts inside the new instance.
    mockGetCurrentContainer.mockReturnValue(containerB);
    renderHook(() => useSendFlowNavigation());
    expect(mockAddListener).toHaveBeenCalledTimes(2);

    // The freshly attached listener still detects the close on the new container.
    mockGetRootState.mockReturnValue(rootStateWith());
    emitNavigationState();
    expect(mockDispatchClosed).toHaveBeenCalledOnce();
    expect(mockResetSendFlow).toHaveBeenCalledOnce();
  });

  it('resets again on a second close after re-entering the flow (same container)', () => {
    // Re-entry without a container remount: ensureSendFlowStackWatcher
    // early-returns (no re-subscribe, no re-seed), so the single state listener
    // alone must flip isSendFlowStackOpen back to open on reopen and still detect
    // the next close.
    mockGetRootState.mockReturnValue(rootStateWith('Send'));
    renderHook(() => useSendFlowNavigation());

    // First close → reset.
    mockGetRootState.mockReturnValue(rootStateWith());
    emitNavigationState();
    expect(mockDispatchClosed).toHaveBeenCalledOnce();
    expect(mockResetSendFlow).toHaveBeenCalledOnce();

    // Reopen the flow; a fresh Send screen mounts on the same container.
    mockGetRootState.mockReturnValue(rootStateWith('Send'));
    renderHook(() => useSendFlowNavigation());
    emitNavigationState();
    expect(mockAddListener).toHaveBeenCalledOnce(); // still a single subscription
    expect(mockDispatchClosed).toHaveBeenCalledOnce(); // reopen is not a close

    // Second close → reset again.
    mockGetRootState.mockReturnValue(rootStateWith());
    emitNavigationState();
    expect(mockDispatchClosed).toHaveBeenCalledTimes(2);
    expect(mockResetSendFlow).toHaveBeenCalledTimes(2);
  });

  it('delegates navigate to NavigationControls', () => {
    mockGetRootState.mockReturnValue(rootStateWith('Send'));
    const { result } = renderHook(() => useSendFlowNavigation());

    result.current.navigate('AddAssets' as SheetRoutes);

    expect(mockNavigate).toHaveBeenCalledWith('AddAssets');
  });

  it('does not subscribe a watcher when navigation is not ready', () => {
    mockIsReady.mockReturnValue(false);

    renderHook(() => useSendFlowNavigation());

    expect(mockAddListener).not.toHaveBeenCalled();
  });
});
