import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { applySidePanelBehavior } from '../src/util';

const stubSidePanel = (setPanelBehavior?: (...args: unknown[]) => unknown) => {
  (globalThis as { chrome?: unknown }).chrome = setPanelBehavior
    ? { sidePanel: { setPanelBehavior } }
    : {};
};

const clearChrome = () => {
  delete (globalThis as { chrome?: unknown }).chrome;
};

describe('applySidePanelBehavior', () => {
  beforeEach(() => {
    clearChrome();
  });
  afterEach(() => {
    clearChrome();
  });

  it('calls chrome.sidePanel.setPanelBehavior with openPanelOnActionClick=true for sidePanel mode', async () => {
    const setPanelBehavior = vi.fn(async () => {});
    stubSidePanel(setPanelBehavior);
    await applySidePanelBehavior('sidePanel');
    expect(setPanelBehavior).toHaveBeenCalledWith({
      openPanelOnActionClick: true,
    });
  });

  it('calls chrome.sidePanel.setPanelBehavior with openPanelOnActionClick=false for tab mode', async () => {
    const setPanelBehavior = vi.fn(async () => {});
    stubSidePanel(setPanelBehavior);
    await applySidePanelBehavior('tab');
    expect(setPanelBehavior).toHaveBeenCalledWith({
      openPanelOnActionClick: false,
    });
  });

  it('returns the in-flight Promise from setPanelBehavior so callers can attach error handlers', async () => {
    const promise = Promise.resolve();
    const setPanelBehavior = vi.fn(async () => promise);
    stubSidePanel(setPanelBehavior);
    expect(applySidePanelBehavior('sidePanel')).toBeInstanceOf(Promise);
    await applySidePanelBehavior('sidePanel');
  });

  it('returns undefined and skips the call on hosts without chrome.sidePanel (e.g. Yandex)', () => {
    stubSidePanel();
    expect(applySidePanelBehavior('sidePanel')).toBeUndefined();
  });

  it('returns undefined when chrome itself is not defined (mobile)', () => {
    expect(applySidePanelBehavior('sidePanel')).toBeUndefined();
  });
});
