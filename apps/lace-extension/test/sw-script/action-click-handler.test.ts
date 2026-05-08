import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handleActionClick } from '../../src/sw-script/action-click-handler';

import type { ActionClickHandlerDeps } from '../../src/sw-script/action-click-handler';

const noopLogger = { error: vi.fn() };

const createDeps = (
  overrides: Partial<ActionClickHandlerDeps> = {},
): ActionClickHandlerDeps => ({
  isSidePanelApiAvailable: () => true,
  getStoredDefaultOpenMode: () => 'sidePanel',
  openLaceTab: vi.fn(async () => {}),
  openSidePanel: vi.fn(async () => {}),
  logger: noopLogger,
  ...overrides,
});

describe('handleActionClick', () => {
  beforeEach(() => {
    noopLogger.error.mockClear();
  });

  it('opens a tab when the host does not ship chrome.sidePanel (e.g. Yandex)', async () => {
    const openLaceTab = vi.fn(async () => {});
    const openSidePanel = vi.fn(async () => {});
    const deps = createDeps({
      isSidePanelApiAvailable: () => false,
      // Even if stored mode is 'sidePanel' (the default), no API → tab.
      getStoredDefaultOpenMode: () => 'sidePanel',
      openLaceTab,
      openSidePanel,
    });

    await handleActionClick(deps, { windowId: 1 });

    expect(openLaceTab).toHaveBeenCalledTimes(1);
    expect(openSidePanel).not.toHaveBeenCalled();
  });

  it("opens a tab when the user has chosen 'tab' mode", async () => {
    const openLaceTab = vi.fn(async () => {});
    const openSidePanel = vi.fn(async () => {});
    const deps = createDeps({
      isSidePanelApiAvailable: () => true,
      getStoredDefaultOpenMode: () => 'tab',
      openLaceTab,
      openSidePanel,
    });

    await handleActionClick(deps, { windowId: 2 });

    expect(openLaceTab).toHaveBeenCalledTimes(1);
    expect(openSidePanel).not.toHaveBeenCalled();
  });

  it('opens the side panel imperatively when API is available, mode is sidePanel, and a windowId is provided', async () => {
    const openLaceTab = vi.fn(async () => {});
    const openSidePanel = vi.fn(async () => {});
    const deps = createDeps({
      isSidePanelApiAvailable: () => true,
      getStoredDefaultOpenMode: () => 'sidePanel',
      openLaceTab,
      openSidePanel,
    });

    await handleActionClick(deps, { windowId: 7 });

    expect(openSidePanel).toHaveBeenCalledWith(7);
    expect(openLaceTab).not.toHaveBeenCalled();
  });

  it('falls back to a tab when openSidePanel throws', async () => {
    const openLaceTab = vi.fn(async () => {});
    const openSidePanel = vi.fn(async () => {
      throw new Error('boom');
    });
    const deps = createDeps({
      isSidePanelApiAvailable: () => true,
      getStoredDefaultOpenMode: () => 'sidePanel',
      openLaceTab,
      openSidePanel,
    });

    await handleActionClick(deps, { windowId: 7 });

    expect(openSidePanel).toHaveBeenCalledWith(7);
    expect(openLaceTab).toHaveBeenCalledTimes(1);
    expect(noopLogger.error).toHaveBeenCalled();
  });

  it('falls back to a tab when no windowId is available', async () => {
    const openLaceTab = vi.fn(async () => {});
    const openSidePanel = vi.fn(async () => {});
    const deps = createDeps({
      isSidePanelApiAvailable: () => true,
      getStoredDefaultOpenMode: () => 'sidePanel',
      openLaceTab,
      openSidePanel,
    });

    await handleActionClick(deps, { windowId: undefined });

    expect(openSidePanel).not.toHaveBeenCalled();
    expect(openLaceTab).toHaveBeenCalledTimes(1);
  });
});
