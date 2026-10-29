import { createOffscreenManager } from '@lace-lib/extension-offscreen';
import { createProverClient } from '@lace-lib/midnight-prover';
// This subpath must stay synchronous so install listeners register immediately.
// eslint-disable-next-line @nx/enforce-module-boundaries
import { configureWasmProver } from '@lace-lib/vendor/wasm-proof-backend';

import { sendProofMessage as send } from './prover-message';

import type { ProverReply } from '@lace-lib/midnight-prover';

const manager = createOffscreenManager<'prover'>({
  offscreen: {
    hasDocument: async () =>
      (
        await chrome.runtime.getContexts({
          contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
        })
      ).length > 0,
    createDocument: async options =>
      chrome.offscreen.createDocument({
        ...options,
        reasons: [chrome.offscreen.Reason.WORKERS],
      }),
    closeDocument: async () => chrome.offscreen.closeDocument(),
  },
  url: 'offscreen.html',
  reasons: ['WORKERS'],
  justification: 'Generate Midnight proofs in a dedicated worker.',
  probeActive: async () =>
    (await send<{ active: boolean }>({ target: 'lace:offscreen-status' }))
      .active,
});
// Concurrent wallet and dApp requests share one document role.
// eslint-disable-next-line functional/no-let
let callers = 0;
const client = createProverClient({
  ensure: async () => {
    callers += 1;
    const result = await manager.acquireRole('prover');
    if (!result.ok) {
      callers -= 1;
      throw new Error(result.error);
    }
  },
  send: async command => send<ProverReply>(command),
  release: async () => {
    callers -= 1;
    if (!callers) await manager.releaseRole('prover');
  },
});
configureWasmProver((onProgress, onJobChange) =>
  client.provider(
    event => {
      if (event.phase === 'proof-material')
        onProgress?.({ type: 'phase', ...event });
    },
    undefined,
    onJobChange,
  ),
);

chrome.runtime.onMessage.addListener((message: unknown, sender) => {
  if (
    sender.id === chrome.runtime.id &&
    sender.url === chrome.runtime.getURL('offscreen.html') &&
    !sender.tab &&
    message &&
    typeof message === 'object' &&
    'target' in message &&
    message.target === 'lace:offscreen-idle' &&
    callers === 0
  ) {
    void manager.releaseRole('prover');
  }
  return false;
});
