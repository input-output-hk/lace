import { createProofJobs, createProofWorker } from '@lace-lib/midnight-prover';

import type { ProverCommand } from '@lace-lib/midnight-prover';

const jobs = createProofJobs({
  createWorker: () =>
    createProofWorker(
      new Worker(new URL('./prover-worker.ts', import.meta.url)),
    ),
});
// This entry accepts only the extension service worker, never a tab/content script.
chrome.runtime.onMessage.addListener((message: unknown, sender, respond) => {
  if (
    sender.id !== chrome.runtime.id ||
    sender.tab ||
    sender.url !== chrome.runtime.getURL('js/sw/sw-script.js')
  )
    return false;
  if (!message || typeof message !== 'object') return false;
  if ('target' in message && message.target === 'lace:offscreen-status') {
    respond({ active: jobs.isActive() });
  } else if ('target' in message && message.target === 'lace:prover') {
    void jobs.handle(message as ProverCommand).then(respond);
    return true;
  }
  return false;
});
// Expired results must be collected even if every caller has gone away.
setInterval(() => {
  if (!jobs.isActive())
    void chrome.runtime
      .sendMessage({ target: 'lace:offscreen-idle' })
      .catch(() => undefined);
}, 30_000);
