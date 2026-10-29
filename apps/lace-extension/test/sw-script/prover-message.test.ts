import { afterEach, describe, expect, it, vi } from 'vitest';

import { sendProofMessage } from '../../src/sw-script/prover-message';

const command = { target: 'lace:prover', operation: 'poll' };
const setup = () => {
  const sendMessage = vi.fn().mockResolvedValue(undefined);
  const getContexts = vi.fn().mockResolvedValue([]);
  vi.stubGlobal('chrome', {
    runtime: {
      sendMessage,
      getContexts,
      ContextType: { OFFSCREEN_DOCUMENT: 'OFFSCREEN_DOCUMENT' },
    },
  });
  return { sendMessage, getContexts };
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe('proof message failure diagnostics', () => {
  it.each([
    ['present', [{}]],
    ['missing', []],
  ])(
    'reports a %s document without replaying the request',
    async (state, contexts) => {
      const { sendMessage, getContexts } = setup();
      getContexts.mockResolvedValue(contexts);
      await expect(sendProofMessage(command)).rejects.toThrow(
        `request: poll; offscreen document: ${state}`,
      );
      expect(sendMessage).toHaveBeenCalledTimes(1);
    },
  );
  it('retains the missing-reply error if metadata is unavailable', async () => {
    const { getContexts } = setup();
    getContexts.mockRejectedValue(new Error('Context lookup failed'));
    await expect(sendProofMessage(command)).rejects.toThrow(
      'offscreen document: unknown',
    );
  });
  it('returns received replies without querying document metadata', async () => {
    const { sendMessage, getContexts } = setup();
    sendMessage.mockResolvedValue({ ok: true });
    await expect(sendProofMessage(command)).resolves.toEqual({ ok: true });
    expect(getContexts).not.toHaveBeenCalled();
  });
  it('preserves rejected transport errors', async () => {
    const { sendMessage } = setup();
    sendMessage.mockRejectedValue(new Error('Disconnected'));
    await expect(sendProofMessage(command)).rejects.toThrow('Disconnected');
  });
  it('bounds a stalled diagnostic lookup with the original request deadline', async () => {
    vi.useFakeTimers();
    const { getContexts } = setup();
    getContexts.mockReturnValue(new Promise(() => {}));
    const rejected = expect(sendProofMessage(command)).rejects.toThrow(
      'did not respond (poll)',
    );
    await vi.advanceTimersByTimeAsync(10_000);
    await rejected;
  });
});
