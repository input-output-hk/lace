import { describe, expect, it, vi } from 'vitest';

import { createNodeRelaySubmissionService } from '../../src/infra/node-relay';

import type { ConnectNodeApi } from '../../src/infra/node-relay';

const nodeUrl = 'http://node.example.com:9944';

type ExtrinsicStatus = {
  type: string;
  isInBlock: boolean;
  isInvalid: boolean;
  isDropped: boolean;
  isUsurped: boolean;
  isFinalityTimeout: boolean;
};

const status = (overrides: Partial<ExtrinsicStatus>): ExtrinsicStatus => ({
  type: 'Ready',
  isInBlock: false,
  isInvalid: false,
  isDropped: false,
  isUsurped: false,
  isFinalityTimeout: false,
  ...overrides,
});

const createFakeApi = () => {
  let callback: ((result: { status: ExtrinsicStatus }) => void) | undefined;
  const stop = vi.fn();
  const send = vi.fn(
    async (onStatus: (result: { status: ExtrinsicStatus }) => void) => {
      callback = onStatus;
      return stop;
    },
  );
  const sendMnTransaction = vi.fn(() => ({ send }));
  const disconnect = vi.fn(async () => undefined);
  const connect = vi.fn(async () => ({
    tx: { midnight: { sendMnTransaction } },
    disconnect,
  })) as ConnectNodeApi & ReturnType<typeof vi.fn>;
  const report = (update: Partial<ExtrinsicStatus>): void => {
    if (!callback) throw new Error('send has no status callback yet');
    callback({ status: status(update) });
  };
  return { connect, sendMnTransaction, send, stop, disconnect, report };
};

const tx = { serialize: () => new Uint8Array([0, 1, 0xab, 0xff, 16]) };

describe('createNodeRelaySubmissionService', () => {
  it('connects the extrinsic api to the given node url', async () => {
    const api = createFakeApi();

    await createNodeRelaySubmissionService(nodeUrl, api.connect);

    expect(api.connect).toHaveBeenCalledExactlyOnceWith(nodeUrl);
  });

  it('submits the serialized bytes as lowercase 0x-prefixed hex', async () => {
    const api = createFakeApi();
    const service = await createNodeRelaySubmissionService(
      nodeUrl,
      api.connect,
    );

    const submission = service.submitTransaction(tx);
    api.report({ type: 'InBlock', isInBlock: true });

    await submission;
    expect(api.sendMnTransaction).toHaveBeenCalledExactlyOnceWith(
      '0x0001abff10',
    );
  });

  it('resolves once the transaction is in a block and unsubscribes', async () => {
    const api = createFakeApi();
    const service = await createNodeRelaySubmissionService(
      nodeUrl,
      api.connect,
    );

    const submission = service.submitTransaction(tx);
    api.report({ type: 'Ready' });
    api.report({ type: 'InBlock', isInBlock: true });

    await expect(submission).resolves.toBeUndefined();
    expect(api.stop).toHaveBeenCalledOnce();
  });

  it.each([
    ['Invalid', { isInvalid: true }],
    ['Dropped', { isDropped: true }],
    ['Usurped', { isUsurped: true }],
  ] as const)(
    'rejects with the status name and unsubscribes when the transaction is %s',
    async (type, update) => {
      const api = createFakeApi();
      const service = await createNodeRelaySubmissionService(
        nodeUrl,
        api.connect,
      );

      const submission = service.submitTransaction(tx);
      api.report({ type, ...update });

      await expect(submission).rejects.toThrow(`Transaction ${type}`);
      expect(api.stop).toHaveBeenCalledOnce();
    },
  );

  it('propagates the rpc rejection when the node refuses the extrinsic', async () => {
    const api = createFakeApi();
    api.send.mockRejectedValueOnce(new Error('Invalid Transaction'));
    const service = await createNodeRelaySubmissionService(
      nodeUrl,
      api.connect,
    );

    await expect(service.submitTransaction(tx)).rejects.toThrow(
      'Invalid Transaction',
    );
  });

  it('disconnects the api on close', async () => {
    const api = createFakeApi();
    const service = await createNodeRelaySubmissionService(
      nodeUrl,
      api.connect,
    );

    await service.close();

    expect(api.disconnect).toHaveBeenCalledOnce();
  });
});
