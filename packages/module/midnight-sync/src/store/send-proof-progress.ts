import { Subject } from 'rxjs';

import type {
  AttestationProgressEvent,
  SendProofProgressEvent,
} from '@lace-contract/midnight-context';
import type { AccountId } from '@lace-contract/wallet-repo';

const progress = new Subject<SendProofProgressEvent>();
export const teeAttestationProgress$ = progress.asObservable();

/** Only an explicitly started wallet send can own the send checklist. */
export const beginSendProofProgress = (accountId: AccountId) => {
  pendingSends.delete(accountId);
  const operationId = crypto.randomUUID();
  progress.next({ type: 'begin', operationId, accountId });
  return (event: AttestationProgressEvent) => {
    progress.next({ type: 'progress', operationId, event });
  };
};

// One pending handoff per account. A new send invalidates the previous callback;
// submission consumes it once, and only for the exact signed transaction.
const pendingSends = new Map<
  AccountId,
  { txId: string; report: (event: AttestationProgressEvent) => void }
>();
export const trackSendSubmission = (
  accountId: AccountId,
  txId: string,
  report: (event: AttestationProgressEvent) => void,
) => {
  pendingSends.set(accountId, { txId, report });
};
export const takeSendSubmission = (accountId: AccountId, txId: string) => {
  const pending = pendingSends.get(accountId);
  if (pending?.txId !== txId) return undefined;
  pendingSends.delete(accountId);
  return pending.report;
};
