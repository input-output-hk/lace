import { beforeEach, describe, expect, it, vi } from 'vitest';

import { switchDefaultOpenMode } from '../../src/pages/switch-default-open-mode';

import type { SwitchDefaultOpenModeDeps } from '../../src/pages/switch-default-open-mode';

const noopLogger = { error: vi.fn() };

const createDeps = (
  overrides: Partial<SwitchDefaultOpenModeDeps> = {},
): SwitchDefaultOpenModeDeps => ({
  openSidePanel: vi.fn(),
  openTab: vi.fn(),
  windowId: 42,
  persistMode: vi.fn(),
  logger: noopLogger,
  ...overrides,
});

describe('switchDefaultOpenMode', () => {
  beforeEach(() => {
    noopLogger.error.mockClear();
  });

  it('opens the side panel synchronously, persists, and signals success', () => {
    const deps = createDeps();
    const callOrder: string[] = [];
    (deps.openSidePanel as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callOrder.push('openSidePanel');
    });
    (deps.persistMode as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callOrder.push('persistMode');
    });

    const didSwitch = switchDefaultOpenMode(deps, 'sidePanel');

    expect(didSwitch).toBe(true);
    expect(deps.openSidePanel).toHaveBeenCalledWith(42);
    expect(deps.persistMode).toHaveBeenCalledWith('sidePanel');
    expect(deps.openTab).not.toHaveBeenCalled();
    // openSidePanel must run before persistMode so the user-gesture window
    // is not consumed by an earlier observable hop.
    expect(callOrder).toEqual(['openSidePanel', 'persistMode']);
  });

  it('opens a tab, persists, and signals success', () => {
    const deps = createDeps();

    const didSwitch = switchDefaultOpenMode(deps, 'tab');

    expect(didSwitch).toBe(true);
    expect(deps.openTab).toHaveBeenCalledTimes(1);
    expect(deps.persistMode).toHaveBeenCalledWith('tab');
    expect(deps.openSidePanel).not.toHaveBeenCalled();
  });

  it('aborts the side-panel switch when the window ID is unknown', () => {
    const deps = createDeps({ windowId: undefined });

    const didSwitch = switchDefaultOpenMode(deps, 'sidePanel');

    expect(didSwitch).toBe(false);
    expect(deps.openSidePanel).not.toHaveBeenCalled();
    expect(deps.persistMode).not.toHaveBeenCalled();
    expect(noopLogger.error).toHaveBeenCalled();
  });

  it('does not require windowId when switching to tab', () => {
    const deps = createDeps({ windowId: undefined });

    const didSwitch = switchDefaultOpenMode(deps, 'tab');

    expect(didSwitch).toBe(true);
    expect(deps.openTab).toHaveBeenCalledTimes(1);
    expect(deps.persistMode).toHaveBeenCalledWith('tab');
  });
});
