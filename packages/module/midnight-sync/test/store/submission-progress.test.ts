import { AccountId } from '@lace-contract/wallet-repo';
import {
  createProgressSubmissionService,
  observeSubmission,
} from '@lace-lib/vendor/midnight-submission-service';
import { PolkadotNodeClient } from '@midnightntwrk/wallet-sdk/node-client/effect';
import { Effect, Stream } from 'effect';
import { describe, expect, it, vi } from 'vitest';

import {
  beginSendProofProgress,
  takeSendSubmission,
  trackSendSubmission,
} from '../../src/store/send-proof-progress';

import type { FinalizedTransaction } from '@midnight-ntwrk/ledger-v8';
import type { SubmissionEvent } from '@midnightntwrk/wallet-sdk/capabilities/submission';
import type * as NodeClientExports from '@midnightntwrk/wallet-sdk/node-client/effect';

vi.mock(
  '@midnightntwrk/wallet-sdk/node-client/effect',
  async importOriginal => ({
    ...(await importOriginal<typeof NodeClientExports>()),
    PolkadotNodeClient: { make: vi.fn() },
  }),
);
const tx = () =>
  ({ serialize: () => new Uint8Array([1]) } as unknown as FinalizedTransaction);
const event = (_tag: SubmissionEvent['_tag']) => ({ _tag } as SubmissionEvent);
const setup = (events: Stream.Stream<SubmissionEvent, Error>) => {
  const send = vi.fn(() => events);
  const close = vi.fn();
  vi.mocked(PolkadotNodeClient.make).mockReturnValue(
    Effect.acquireRelease(
      Effect.succeed({
        sendMidnightTransaction: send,
        api: { isConnected: false },
      } as never),
      () => Effect.sync(close),
    ),
  );
  return {
    send,
    close,
    service: createProgressSubmissionService({
      relayURL: new URL('ws://localhost:9944'),
    }),
  };
};
describe('observed submission', () => {
  it('submits once and follows retraction through finality on the same stream', async () => {
    const stages: SubmissionEvent['_tag'][] = [
      'Submitted',
      'InBlock',
      'Submitted',
      'InBlock',
      'Finalized',
    ];
    const { service, send, close } = setup(
      Stream.fromIterable(stages.map(event)),
    );
    const transaction = tx();
    const report = vi.fn();
    const detach = observeSubmission(transaction, report);
    const unrelated = vi.fn();
    const detachOther = observeSubmission(tx(), unrelated);
    try {
      await expect(
        service.submitTransaction(transaction, 'Finalized'),
      ).resolves.toEqual(event('Finalized'));
      expect(send).toHaveBeenCalledTimes(1);
      expect(report.mock.calls.flat()).toEqual(stages);
      expect(unrelated).not.toHaveBeenCalled();
    } finally {
      detach();
      detachOther();
      await service.close();
    }
    expect(close).toHaveBeenCalledTimes(1);
  });
  it('does not mistake an exhausted stream for confirmation', async () => {
    const { service } = setup(Stream.make(event('Submitted')));
    await expect(
      service.submitTransaction(tx(), 'Finalized'),
    ).rejects.toThrow();
    await service.close();
  });
  it('propagates network failure without resubmitting', async () => {
    const { service, send } = setup(
      Stream.fail(new Error('node disconnected')),
    );
    await expect(
      service.submitTransaction(tx(), 'Finalized'),
    ).rejects.toThrow();
    expect(send).toHaveBeenCalledTimes(1);
    await service.close();
  });
  it('detaches observers and respects the requested target stage', async () => {
    const { service } = setup(
      Stream.make(event('Submitted'), event('InBlock'), event('Finalized')),
    );
    const transaction = tx();
    const report = vi.fn();
    observeSubmission(transaction, report)();
    await expect(
      service.submitTransaction(transaction, 'InBlock'),
    ).resolves.toEqual(event('InBlock'));
    expect(report).not.toHaveBeenCalled();
    await service.close();
  });
});
it('only hands a send callback to its matching transaction, once', () => {
  const account = AccountId('one');
  const report = vi.fn();
  trackSendSubmission(account, 'tx', report);
  expect(takeSendSubmission(account, 'dapp-tx')).toBeUndefined();
  expect(takeSendSubmission(account, 'tx')).toBe(report);
  expect(takeSendSubmission(account, 'tx')).toBeUndefined();
  trackSendSubmission(account, 'old', report);
  beginSendProofProgress(account);
  expect(takeSendSubmission(account, 'old')).toBeUndefined();
});
