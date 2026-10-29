import { createOffscreenManager } from '@lace-lib/extension-offscreen';
import { createProofJobs } from '@lace-lib/midnight-prover';
// Use the same acquisition, messaging deadlines and release behavior as the wallet.
import '../../src/sw-script/prover';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { createConfiguredWasmProver } from '@lace-lib/vendor/wasm-proof-backend';

const manager = createOffscreenManager({
  offscreen: {
    hasDocument: async () =>
      (
        await chrome.runtime.getContexts({
          contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
        })
      ).length > 0,
    createDocument: options =>
      chrome.offscreen.createDocument({
        ...options,
        reasons: [chrome.offscreen.Reason.WORKERS],
      }),
    closeDocument: () => chrome.offscreen.closeDocument(),
  },
  url: 'offscreen.html',
  reasons: ['WORKERS'],
  justification: 'Offscreen prover regression test',
  probeActive: async () =>
    (await chrome.runtime.sendMessage({ target: 'lace:offscreen-status' }))
      .active,
});
const instance = crypto.randomUUID();
chrome.runtime.onMessage.addListener((message, _sender, reply) => {
  if (message.target !== 'test-harness') return false;
  void (async () => {
    if (message.operation === 'ping') return { instance };
    if (message.operation === 'release') return manager.releaseRole('prover');
    const acquired = await manager.acquireRole('prover');
    if (!acquired.ok) throw new Error(acquired.error);
    return chrome.runtime.sendMessage(message.command);
  })().then(reply, error => reply({ error: String(error) }));
  return true;
});

// Exercise real Port JSON serialization before the offscreen runtime-message hop.
const jobs = createProofJobs({ shouldForwardProvidersConcurrently: true });
const backend = createConfiguredWasmProver();
chrome.runtime.onConnect.addListener(port => {
  if (port.name !== 'proof-transport-test') return;
  const owner = port.sender?.documentId;
  port.onMessage.addListener(({ id, command }) => {
    if (!owner) {
      port.postMessage({
        id,
        reply: { ok: false, error: 'Missing browser document identity' },
      });
      return;
    }
    void jobs
      .handle(command, owner, backend)
      .then(reply => port.postMessage({ id, reply }));
  });
});
