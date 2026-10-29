import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createSignerClient,
  RemoteSignerError,
  serveSignerRequests,
  SignerClosedError,
  SignerPopupBlockedError,
} from '../../src';

import {
  allowEveryOrigin,
  approveAll,
  createWindowPair,
  echoHandlers,
  isSettled,
  SIGNER_ORIGIN,
  SIGNER_URL,
} from './fake-windows';

import type { WindowPair } from './fake-windows';
import type { SignerRequestHandlers, SignerRequestPayloads } from '../../src';

const KEYRING = {
  account: 'ac'.repeat(32),
  encKey: '07'.repeat(32),
  envelopes: ['d1'.repeat(192)],
};
const LIVE_READER = {
  readerPublicKey: '12'.repeat(32),
  devicePublicKey: '34'.repeat(32),
  epoch: '0',
  counter: '0',
};

const REQUESTS: {
  [Kind in keyof SignerRequestPayloads]: SignerRequestPayloads[Kind];
} = {
  'flow-open': { flow: { kind: 'create-account' } },
  'flow-close': { outcome: 'completed' },
  'device-public-key': {},
  'device-commitments': { account: 'acc', epoch: '7', counters: ['0', '1'] },
  authorise: {
    account: 'acc',
    circuit: 'transfer',
    args: [1n, 'x'],
    witnessValues: [{ nested: 2n }],
    authNonce: '99',
    useCounter: '3',
  },
  'reader-public-key': { networkId: 'undeployed' },
  'create-keys': {
    networkId: 'undeployed',
    devicePublicKey: '34'.repeat(32),
    keyring: KEYRING,
    registrations: ['d2'.repeat(192)],
    readers: [LIVE_READER],
    rotateRoster: true,
  },
  'seal-to-device': {
    networkId: 'undeployed',
    keyring: KEYRING,
    reader: LIVE_READER,
  },
  'find-live-envelope': { networkId: 'undeployed', keyring: KEYRING },
  'open-inbox': {
    networkId: 'undeployed',
    keyring: KEYRING,
    entries: ['01'.repeat(192)],
  },
  'seal-grant': {
    networkId: 'undeployed',
    account: 'ac'.repeat(32),
    grant: { grantId: 'ab'.repeat(32) },
  },
  'reencrypt-inbox': {
    networkId: 'undeployed',
    keyring: KEYRING,
    to: '09'.repeat(32),
    entries: ['01'.repeat(192)],
  },
  'seal-view': {
    networkId: 'undeployed',
    keyring: KEYRING,
    grantId: 'ab'.repeat(32),
    account: 'cd'.repeat(32),
    readPublicKey: 'ef'.repeat(32),
  },
  'sign-maintenance-update': {
    networkId: 'undeployed',
    keyring: KEYRING,
    authority: { tag: 'schnorr', value: 'ab'.repeat(32) },
    counter: '4',
    changes: {
      kind: 'insert-verifier-keys',
      inserts: [{ operation: 'withdraw_unshielded', verifierKey: '0102' }],
    },
  },
  'holds-maintenance-authority': {
    networkId: 'undeployed',
    keyring: KEYRING,
    authority: { tag: 'schnorr', value: 'ab'.repeat(32) },
  },
  'record-read': {},
  'record-write': { record: { sealed: 'aa' } },
  'record-exists': {},
  'sign-cardano-tx': {
    serializedTx: '84a4',
    knownAddresses: [{ address: 'addr' }],
    utxo: [],
    accountIndex: 0,
    chainId: { networkMagic: 2 },
    extendedAccountPublicKey: 'xpub',
  },
  'sign-cardano-data': {
    signWith: 'addr',
    payload: 'deadbeef',
    knownAddresses: [],
    accountIndex: 0,
    chainId: { networkMagic: 2 },
    extendedAccountPublicKey: 'xpub',
  },
  'cardano-account-public-key': { accountIndex: 1 },
  'cardano-custody-public-key': { chainId: { networkId: 0, networkMagic: 1 } },
  'sign-cardano-custody-tx': {
    serializedTx: '84a4',
    chainId: { networkId: 0, networkMagic: 1 },
    device: { extendedAccountPublicKey: 'xpub', index: 0 },
    resolvedInputs: ['82825820'],
    accountRecord: { type: 'cardano-custody-account', version: 1 },
    requestedScopes: [{ slot: '0', cap: '15000000' }],
  },
  'sign-cardano-custody-data': {
    chainId: { networkId: 0, networkMagic: 1 },
    device: { extendedAccountPublicKey: 'xpub', index: 0 },
    accountRecord: { type: 'cardano-custody-account', version: 1 },
    controlUtxo: '82825820',
    payload: '5369676e20696e',
    purpose: 'sign-in',
  },
};

type ServeProps = Parameters<typeof serveSignerRequests>[0];

const cleanups: (() => void)[] = [];

const connectedPair = async ({
  handlers = echoHandlers(),
  onRequest = vi.fn(approveAll),
}: {
  handlers?: SignerRequestHandlers;
  onRequest?: ServeProps['onRequest'];
} = {}) => {
  const pair = createWindowPair();
  const client = createSignerClient({
    signerUrl: SIGNER_URL,
    host: pair.dappHost,
  });
  client.open();
  const stop = serveSignerRequests({
    handlers,
    assertOriginAllowed: allowEveryOrigin,
    onRequest,
    host: pair.signerHost,
  });
  cleanups.push(stop, client.close);
  await client.connect();
  return { pair, client, onRequest };
};

const openClient = (pair: WindowPair) => {
  const client = createSignerClient({
    signerUrl: SIGNER_URL,
    host: pair.dappHost,
  });
  cleanups.push(client.close);
  return client;
};

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('createSignerClient', () => {
  describe('open', () => {
    it('opens the signer URL as a named popup and returns it', () => {
      const pair = createWindowPair();
      const client = openClient(pair);

      expect(client.open()).toBe(pair.popup);
      expect(pair.dapp.open).toHaveBeenCalledWith(
        SIGNER_URL,
        'lace-signer',
        'popup,width=420,height=600',
      );
    });

    it('throws SignerPopupBlockedError when the browser returns no window', () => {
      const pair = createWindowPair();
      pair.dapp.open.mockReturnValue(null as never);
      const client = openClient(pair);

      let error: unknown;
      try {
        client.open();
      } catch (thrown) {
        error = thrown;
      }

      expect(error).toBeInstanceOf(SignerPopupBlockedError);
      expect(error).toMatchObject({ code: 'popup-blocked' });
    });

    it('rejects requests pending on a previous popup when opened again', async () => {
      const { client, pair } = await connectedPair({
        handlers: {
          ...echoHandlers(),
          'record-read': async () => new Promise(() => {}),
        },
      });
      const pendingRequest = client.request('record-read', {});

      client.open();

      await expect(pendingRequest).rejects.toBeInstanceOf(SignerClosedError);
      expect(pair.popup.close).toHaveBeenCalledOnce();
    });
  });

  describe('connect', () => {
    it('rejects when the popup was never opened', async () => {
      const client = openClient(createWindowPair());

      await expect(client.connect()).rejects.toThrow(
        'The signer popup is not open.',
      );
    });

    it('posts hello with the request port to the signer origin only', async () => {
      const { pair } = await connectedPair();

      expect(pair.popup.postMessage).toHaveBeenCalledOnce();
      const [hello, targetOrigin, transfer] = pair.popup.postMessage.mock
        .calls[0] as [unknown, string, MessagePort[]];
      expect(hello).toEqual({ type: 'hello' });
      expect(targetOrigin).toBe(SIGNER_ORIGIN);
      expect(transfer).toHaveLength(1);
      expect(transfer[0]).toBeInstanceOf(MessagePort);
    });

    it('stops listening for the loaded message once connected', async () => {
      const { pair } = await connectedPair();

      expect(pair.dapp.listenerCount()).toBe(0);
    });

    it('ignores a loaded message from another origin or another window', async () => {
      const pair = createWindowPair();
      const client = openClient(pair);
      client.open();
      const connecting = client.connect();

      pair.dapp.emit({
        data: { type: 'signer-loaded' },
        origin: 'https://evil.example',
        source: pair.popup,
      });
      pair.dapp.emit({
        data: { type: 'signer-loaded' },
        origin: SIGNER_ORIGIN,
        source: { other: true },
      });
      pair.dapp.emit({
        data: { type: 'something-else' },
        origin: SIGNER_ORIGIN,
        source: pair.popup,
      });
      await expect(isSettled(connecting)).resolves.toBe(false);
      expect(pair.popup.postMessage).not.toHaveBeenCalled();

      cleanups.push(
        serveSignerRequests({
          handlers: echoHandlers(),
          assertOriginAllowed: allowEveryOrigin,
          onRequest: approveAll,
          host: pair.signerHost,
        }),
      );
      await expect(connecting).resolves.toBeUndefined();
    });

    it('joins the first handshake when called again for the same popup', async () => {
      const pair = createWindowPair();
      const client = openClient(pair);
      client.open();
      cleanups.push(
        serveSignerRequests({
          handlers: echoHandlers(),
          assertOriginAllowed: allowEveryOrigin,
          onRequest: approveAll,
          host: pair.signerHost,
        }),
      );

      const first = client.connect();
      const second = client.connect();

      await expect(first).resolves.toBeUndefined();
      await expect(second).resolves.toBeUndefined();
      expect(pair.popup.postMessage).toHaveBeenCalledOnce();
      await expect(client.connect()).resolves.toBeUndefined();
      expect(pair.popup.postMessage).toHaveBeenCalledOnce();
    });

    it('does not miss a loaded message that arrives before connect is called', async () => {
      const pair = createWindowPair();
      const client = openClient(pair);
      client.open();
      cleanups.push(
        serveSignerRequests({
          handlers: echoHandlers(),
          assertOriginAllowed: allowEveryOrigin,
          onRequest: approveAll,
          host: pair.signerHost,
        }),
      );
      await expect(isSettled(Promise.resolve())).resolves.toBe(true);

      await expect(client.connect()).resolves.toBeUndefined();
    });

    it('rejects with SignerClosedError when the popup closes before it loads', async () => {
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
      const pair = createWindowPair();
      const client = openClient(pair);
      client.open();
      const connecting = client.connect();

      pair.popup.closed = true;
      vi.advanceTimersByTime(500);

      await expect(connecting).rejects.toBeInstanceOf(SignerClosedError);
    });
  });

  describe('request', () => {
    it('rejects before the signer is connected', async () => {
      const client = openClient(createWindowPair());
      client.open();

      await expect(client.request('record-read', {})).rejects.toThrow(
        'The signer is not connected.',
      );
    });

    it('rejects before the popup was ever opened', async () => {
      const client = openClient(createWindowPair());

      await expect(client.request('record-read', {})).rejects.toThrow(
        'The signer is not connected.',
      );
    });

    it('rejects with SignerClosedError once the user closed the popup', async () => {
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
      const { client, pair } = await connectedPair();

      pair.popup.closed = true;
      vi.advanceTimersByTime(500);

      const late = client.request('record-write', { record: {} });
      await expect(late).rejects.toBeInstanceOf(SignerClosedError);
      await expect(late).rejects.toMatchObject({ code: 'ceremony-cancelled' });
      await expect(
        client.request('flow-close', { outcome: 'completed' }),
      ).rejects.toBeInstanceOf(SignerClosedError);
    });

    it('rejects with SignerClosedError once close() was called', async () => {
      const { client } = await connectedPair();

      client.close();

      await expect(client.request('record-read', {})).rejects.toBeInstanceOf(
        SignerClosedError,
      );
    });

    it('rejects with SignerClosedError when the popup closed before it loaded', async () => {
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
      const pair = createWindowPair();
      const client = openClient(pair);
      client.open();

      pair.popup.closed = true;
      vi.advanceTimersByTime(500);

      await expect(client.request('record-read', {})).rejects.toBeInstanceOf(
        SignerClosedError,
      );
    });

    it('reports not connected again for a popup opened after the close', async () => {
      const { client } = await connectedPair();
      client.close();

      client.open();

      await expect(client.request('record-read', {})).rejects.toThrow(
        'The signer is not connected.',
      );
    });

    it('round-trips every request kind with its payload intact', async () => {
      const { client } = await connectedPair();

      for (const [kind, payload] of Object.entries(REQUESTS)) {
        await expect(
          client.request(kind as keyof SignerRequestPayloads, payload as never),
        ).resolves.toEqual({ kind, payload });
      }
    });

    it('carries each grant flow descriptor to the signer intact', async () => {
      const { client } = await connectedPair();
      const grantId = 'ab'.repeat(32);
      const flows: SignerRequestPayloads['flow-open']['flow'][] = [
        {
          kind: 'issue-grant',
          account: 'ac'.repeat(32),
          grantId,
          scope: { operations: ['withdraw-unshielded'], cap: '450' },
          slot: 0,
          scopeSalt: '22'.repeat(32),
          scopeDigest: 'cd'.repeat(32),
        },
        { kind: 'revoke-grant', grantId },
        { kind: 'revoke-all-grants' },
      ];

      for (const flow of flows) {
        await expect(client.request('flow-open', { flow })).resolves.toEqual({
          kind: 'flow-open',
          payload: { flow },
        });
        await client.request('flow-close', { outcome: 'completed' });
      }
    });

    it('matches responses to their requests when they complete out of order', async () => {
      const gate = { release: (): void => {} };
      const { client } = await connectedPair({
        handlers: {
          ...echoHandlers(),
          'record-read': async () =>
            new Promise(resolve => {
              gate.release = () => {
                resolve('slow');
              };
            }),
        },
      });

      const slow = client.request('record-read', {});
      const fast = client.request('record-exists', {});

      await expect(fast).resolves.toEqual({
        kind: 'record-exists',
        payload: {},
      });
      gate.release();
      await expect(slow).resolves.toBe('slow');
    });

    it('rejects with RemoteSignerError carrying the code of a failed response', async () => {
      const { client } = await connectedPair({
        handlers: {
          ...echoHandlers(),
          'reader-public-key': async () => {
            throw Object.assign(new Error('Wrong network.'), {
              code: 'network-mismatch',
            });
          },
        },
      });

      const failing = client.request('reader-public-key', { networkId: 'x' });

      await expect(failing).rejects.toBeInstanceOf(RemoteSignerError);
      await expect(failing).rejects.toMatchObject({
        code: 'network-mismatch',
        message: 'Wrong network.',
      });
    });

    it('rejects with the details a failed response declares, and none when it declares none', async () => {
      const { client } = await connectedPair({
        handlers: {
          ...echoHandlers(),
          'open-inbox': async ({ entries }) => {
            throw Object.assign(new Error('Too many entries.'), {
              code: 'inbox-request-too-large',
              ...(entries.length > 1 ? { details: { maxEntries: 1 } } : {}),
            });
          },
        },
      });

      await expect(
        client.request('open-inbox', {
          networkId: 'x',
          keyring: KEYRING,
          entries: ['01', '02'],
        }),
      ).rejects.toMatchObject({
        code: 'inbox-request-too-large',
        details: { maxEntries: 1 },
      });
      await expect(
        client.request('open-inbox', {
          networkId: 'x',
          keyring: KEYRING,
          entries: ['01'],
        }),
      ).rejects.toMatchObject({ details: undefined });
    });

    it('rejects a request whose payload cannot be cloned and keeps serving', async () => {
      const { client } = await connectedPair();

      await expect(
        client.request('record-write', { record: () => 'not cloneable' }),
      ).rejects.toMatchObject({ name: 'DataCloneError' });
      await expect(client.request('record-exists', {})).resolves.toEqual({
        kind: 'record-exists',
        payload: {},
      });
    });

    it('ignores port messages that are not responses to a pending request', async () => {
      const { client, pair } = await connectedPair();
      const [, , [port2]] = pair.popup.postMessage.mock.calls[0] as [
        unknown,
        string,
        MessagePort[],
      ];

      port2.postMessage({ id: 999, ok: true, result: 'stray' });
      port2.postMessage({ unrelated: true });

      await expect(client.request('record-exists', {})).resolves.toEqual({
        kind: 'record-exists',
        payload: {},
      });
    });

    it('rejects every pending request with ceremony-cancelled when the popup closes', async () => {
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
      const { client, pair } = await connectedPair({
        handlers: {
          ...echoHandlers(),
          'record-read': async () => new Promise(() => {}),
          'record-exists': async () => new Promise(() => {}),
        },
      });
      const first = client.request('record-read', {});
      const second = client.request('record-exists', {});

      vi.advanceTimersByTime(500);
      await expect(isSettled(first)).resolves.toBe(false);

      pair.popup.closed = true;
      vi.advanceTimersByTime(500);

      await expect(first).rejects.toBeInstanceOf(SignerClosedError);
      await expect(second).rejects.toMatchObject({
        code: 'ceremony-cancelled',
      });
      await expect(client.request('record-read', {})).rejects.toBeInstanceOf(
        SignerClosedError,
      );
    });
  });

  describe('close', () => {
    it('closes the popup, stops polling and rejects pending requests', async () => {
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
      const { client, pair } = await connectedPair({
        handlers: {
          ...echoHandlers(),
          'record-read': async () => new Promise(() => {}),
        },
      });
      const pendingRequest = client.request('record-read', {});

      client.close();

      expect(pair.popup.close).toHaveBeenCalledOnce();
      expect(vi.getTimerCount()).toBe(0);
      await expect(pendingRequest).rejects.toBeInstanceOf(SignerClosedError);
    });

    it('does not close a popup the user already closed', async () => {
      const { client, pair } = await connectedPair();
      pair.popup.closed = true;

      client.close();

      expect(pair.popup.close).not.toHaveBeenCalled();
    });
  });
});
