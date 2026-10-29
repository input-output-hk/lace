import { describe, expect, it, vi } from 'vitest';

import { createOffscreenManager } from '../src';

const setup = (isPresent = false) => {
  const api = {
    hasDocument: async () => isPresent,
    createDocument: vi.fn(async () => {
      isPresent = true;
    }),
    closeDocument: vi.fn(async () => {
      isPresent = false;
    }),
  };
  const probeActive = vi.fn(async (): Promise<boolean | null> => false);
  const manager = createOffscreenManager({
    offscreen: api,
    probeActive,
    url: 'offscreen.html',
    reasons: ['WORKERS'],
    justification: 'Proving',
  });
  return { api, manager, probeActive };
};

describe('shared offscreen ownership', () => {
  it('serializes simultaneous acquisitions and closes only after every service releases', async () => {
    const { api, manager } = setup();
    await Promise.all([
      manager.acquireRole('prover'),
      manager.acquireRole('engine'),
    ]);
    expect(api.createDocument).toHaveBeenCalledTimes(1);
    await manager.releaseRole('prover');
    expect(api.closeDocument).not.toHaveBeenCalled();
    await manager.releaseRole('engine');
    expect(api.closeDocument).toHaveBeenCalledTimes(1);
  });
  it.each([true, null])(
    'preserves inherited work when liveness is %s',
    async isActive => {
      const { api, manager, probeActive } = setup(true);
      probeActive.mockResolvedValue(isActive);
      await manager.acquireRole('prover');
      await manager.releaseRole('prover');
      expect(api.createDocument).not.toHaveBeenCalled();
      expect(api.closeDocument).not.toHaveBeenCalled();
    },
  );
  it('rechecks physical existence after the document disappears', async () => {
    const { api, manager } = setup();
    await manager.acquireRole('prover');
    await api.closeDocument();
    await manager.acquireRole('prover');
    expect(api.createDocument).toHaveBeenCalledTimes(2);
  });
  it('does not retain a failed acquisition and permits a later retry', async () => {
    const { api, manager } = setup();
    api.createDocument.mockRejectedValueOnce(new Error('creation failed'));
    expect(await manager.acquireRole('prover')).toEqual({
      ok: false,
      error: 'creation failed',
    });
    expect(manager.activeRoles()).toEqual([]);
    expect(await manager.acquireRole('prover')).toEqual({ ok: true });
  });
  it('preserves the page if the liveness probe throws', async () => {
    const { api, manager, probeActive } = setup(true);
    probeActive.mockRejectedValue(new Error('disconnected'));
    await manager.releaseRole('prover');
    expect(api.closeDocument).not.toHaveBeenCalled();
  });
});
