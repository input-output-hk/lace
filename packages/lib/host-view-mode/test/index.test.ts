import { hasLaceCapability, request } from '@lace-lib/extension-shell-client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  canSetViewMode,
  getViewMode,
  setViewMode,
  VIEW_MODE_LABEL_KEYS,
} from '../src';

import type {
  GetViewModeResult,
  ViewMode,
} from '@lace-lib/extension-shell-api';
import type { Mock } from 'vitest';

vi.mock('@lace-lib/extension-shell-client', () => ({
  hasLaceCapability: vi.fn(),
  request: vi.fn(),
}));

const mockHasLaceCapability = hasLaceCapability as Mock;
const mockRequest = request as Mock;

const HOST_RECORD: GetViewModeResult = {
  selected: 'tab',
  supported: ['sidePanel', 'tab'],
  effective: 'tab',
};

describe('canSetViewMode', () => {
  afterEach(() => {
    mockHasLaceCapability.mockReset();
  });

  it('follows the host handshake for the write capability', () => {
    mockHasLaceCapability.mockReturnValue(true);
    expect(canSetViewMode()).toBe(true);
    expect(mockHasLaceCapability).toHaveBeenCalledWith('settings.setViewMode');

    mockHasLaceCapability.mockReturnValue(false);
    expect(canSetViewMode()).toBe(false);
  });
});

describe('VIEW_MODE_LABEL_KEYS', () => {
  it('names every mode the host can declare', () => {
    const modes: ViewMode[] = ['sidePanel', 'tab'];

    expect(Object.keys(VIEW_MODE_LABEL_KEYS).sort()).toEqual(modes.sort());
  });
});

describe('getViewMode', () => {
  afterEach(() => {
    mockRequest.mockReset();
  });

  it('answers the host record', async () => {
    mockRequest.mockResolvedValue({ ok: true, value: HOST_RECORD });

    expect(await getViewMode()).toEqual(HOST_RECORD);
    expect(mockRequest).toHaveBeenCalledWith('settings.getViewMode');
  });

  it('answers undefined when the read did not land', async () => {
    mockRequest.mockResolvedValue({
      ok: false,
      error: { code: 'unavailable', message: 'window.lace is not injected' },
    });

    expect(await getViewMode()).toBeUndefined();
  });
});

describe('setViewMode', () => {
  afterEach(() => {
    mockRequest.mockReset();
  });

  it('records the chosen mode with the host', async () => {
    mockRequest.mockResolvedValue({ ok: true, value: { recorded: true } });

    expect(await setViewMode('sidePanel')).toBe(true);
    expect(mockRequest).toHaveBeenCalledWith('settings.setViewMode', {
      mode: 'sidePanel',
    });
  });

  it('reports a host that accepted the call but recorded nothing', async () => {
    mockRequest.mockResolvedValue({ ok: true, value: { recorded: false } });

    expect(await setViewMode('tab')).toBe(false);
  });

  it('reports a refused write', async () => {
    mockRequest.mockResolvedValue({
      ok: false,
      error: { code: 'unsupported', message: 'no such mode' },
    });

    expect(await setViewMode('tab')).toBe(false);
  });
});
