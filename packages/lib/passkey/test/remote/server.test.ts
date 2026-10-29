import { afterEach, describe, expect, it, vi } from 'vitest';

import { serveSignerRequests } from '../../src';

import {
  allowEveryOrigin,
  approveAll,
  createWindowPair,
  DAPP_ORIGIN,
  echoHandlers,
  flush,
  SIGNER_HOSTNAME,
  SIGNER_ORIGIN,
} from './fake-windows';

import type { WindowPair } from './fake-windows';
import type { SignerRequest, SignerRequestHandlers } from '../../src';

type ServeProps = Parameters<typeof serveSignerRequests>[0];

const cleanups: (() => void)[] = [];

const serve = (pair: WindowPair, props: Partial<ServeProps> = {}) => {
  const stop = serveSignerRequests({
    handlers: echoHandlers(),
    assertOriginAllowed: allowEveryOrigin,
    onRequest: approveAll,
    host: pair.signerHost,
    ...props,
  });
  cleanups.push(stop);
  return stop;
};

const nextMessage = async (port: MessagePort): Promise<unknown> =>
  new Promise(resolve => {
    port.addEventListener(
      'message',
      (event: MessageEvent) => {
        resolve(event.data);
      },
      { once: true },
    );
    port.start();
  });

/** Sends a hello carrying a fresh channel and hands back the dApp's end. */
const sayHello = (pair: WindowPair, origin = DAPP_ORIGIN) => {
  const channel = new MessageChannel();
  cleanups.push(() => {
    channel.port1.close();
    channel.port2.close();
  });
  const ready = nextMessage(channel.port1);
  pair.signer.emit({
    data: { type: 'hello' },
    origin,
    source: pair.opener,
    ports: [channel.port2],
  });
  return { port: channel.port1, ready };
};

const connect = async (pair: WindowPair, props: Partial<ServeProps> = {}) => {
  serve(pair, props);
  const { port, ready } = sayHello(pair);
  await ready;
  return port;
};

const FLOW_COMPLETED = { outcome: 'completed' } as const;

const ids = { next: 1 };
const send = async (
  port: MessagePort,
  kind: SignerRequest['kind'],
  payload: unknown = {},
): Promise<unknown> => {
  const id = ids.next;
  ids.next += 1;
  const response = new Promise(resolve => {
    const onMessage = (event: MessageEvent): void => {
      if ((event.data as { id?: unknown }).id !== id) return;
      port.removeEventListener('message', onMessage);
      resolve(event.data);
    };
    port.addEventListener('message', onMessage);
  });
  port.postMessage({ id, kind, payload });
  return response;
};

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  vi.restoreAllMocks();
});

describe('serveSignerRequests', () => {
  describe('handshake', () => {
    it('throws when the page has no opener', () => {
      const pair = createWindowPair();
      pair.signer.opener = null as never;

      expect(() => serve(pair)).toThrow(
        'The signer page must be opened by a dApp.',
      );
    });

    it('announces itself to any opener origin when the referrer is unknown', () => {
      const pair = createWindowPair();

      serve(pair);

      expect(pair.opener.postMessage).toHaveBeenCalledWith(
        { type: 'signer-loaded' },
        '*',
      );
    });

    it('announces itself to the referrer origin when it is known', () => {
      const pair = createWindowPair({ referrer: `${DAPP_ORIGIN}/app/index` });

      serve(pair);

      expect(pair.opener.postMessage).toHaveBeenCalledWith(
        { type: 'signer-loaded' },
        DAPP_ORIGIN,
      );
    });

    it('answers hello with ready carrying its origin and the page hostname as rpId', async () => {
      const pair = createWindowPair();
      serve(pair);

      const { ready } = sayHello(pair);

      await expect(ready).resolves.toEqual({
        type: 'ready',
        origin: SIGNER_ORIGIN,
        rpId: SIGNER_HOSTNAME,
      });
      expect(pair.signer.listenerCount()).toBe(0);
    });

    it('reports an explicit rpId', async () => {
      const pair = createWindowPair();
      serve(pair, { rpId: 'lace.io' });

      await expect(sayHello(pair).ready).resolves.toMatchObject({
        rpId: 'lace.io',
      });
    });

    it.each(['http://dapp.example', 'null', 'file://', 'ftp://localhost'])(
      'refuses a hello from the insecure origin %s',
      async origin => {
        const pair = createWindowPair();
        serve(pair);
        const closePort = vi.spyOn(MessagePort.prototype, 'close');

        const { ready } = sayHello(pair, origin);

        await flush();
        expect(closePort).toHaveBeenCalledOnce();
        expect(pair.signer.listenerCount()).toBe(1);
        await expect(
          Promise.race([ready, flush().then(() => 'unanswered')]),
        ).resolves.toBe('unanswered');
      },
    );

    it.each(['http://localhost:5173', 'http://127.0.0.1:8080'])(
      'accepts a hello from the development origin %s',
      async origin => {
        const pair = createWindowPair();
        serve(pair);

        await expect(sayHello(pair, origin).ready).resolves.toMatchObject({
          type: 'ready',
        });
      },
    );

    it('ignores a hello whose source is not the opener or that carries no port', async () => {
      const pair = createWindowPair();
      serve(pair);
      const channel = new MessageChannel();
      cleanups.push(
        () => {
          channel.port1.close();
        },
        () => {
          channel.port2.close();
        },
      );

      pair.signer.emit({
        data: { type: 'hello' },
        origin: DAPP_ORIGIN,
        source: { other: true },
        ports: [channel.port2],
      });
      pair.signer.emit({
        data: { type: 'hello' },
        origin: DAPP_ORIGIN,
        source: pair.opener,
        ports: [],
      });
      pair.signer.emit({
        data: { type: 'ready' },
        origin: DAPP_ORIGIN,
        source: pair.opener,
        ports: [channel.port2],
      });

      await flush();
      expect(pair.signer.listenerCount()).toBe(1);
    });

    it('serves the first accepted hello only', async () => {
      const pair = createWindowPair();
      const port = await connect(pair);
      const second = sayHello(pair);

      await expect(send(port, 'record-exists')).resolves.toMatchObject({
        ok: true,
      });
      await expect(
        Promise.race([second.ready, flush().then(() => 'unanswered')]),
      ).resolves.toBe('unanswered');
    });
  });

  describe('requests', () => {
    it('answers a request with the handler result under the same id', async () => {
      const port = await connect(createWindowPair());
      const payload = { account: 'acc', epoch: '1', counters: ['2'] };

      const response = nextMessage(port);
      port.postMessage({ id: 42, kind: 'device-commitments', payload });

      await expect(response).resolves.toEqual({
        id: 42,
        ok: true,
        result: { kind: 'device-commitments', payload },
      });
    });

    it('ignores port messages that are not requests', async () => {
      const port = await connect(createWindowPair());

      port.postMessage({ type: 'hello' });
      port.postMessage({ id: 'one', kind: 'record-read', payload: {} });

      await expect(send(port, 'record-read')).resolves.toMatchObject({
        ok: true,
      });
    });

    it('answers an unknown kind with the unsupported-request code', async () => {
      const port = await connect(createWindowPair());

      await expect(
        send(port, 'hasOwnProperty' as never),
      ).resolves.toMatchObject({
        ok: false,
        code: 'unsupported-request',
        message: 'The signer does not serve this request kind.',
      });
    });

    it('refuses a custody request without consent on a signer that predates the custody kinds', async () => {
      const {
        'cardano-custody-public-key': _publicKey,
        'sign-cardano-custody-tx': _signTx,
        'sign-cardano-custody-data': _signData,
        ...olderHandlers
      } = echoHandlers();
      const onRequest = vi.fn<ServeProps['onRequest']>(approveAll);
      const port = await connect(createWindowPair(), {
        handlers: olderHandlers as SignerRequestHandlers,
        onRequest,
      });

      await expect(
        send(port, 'sign-cardano-custody-tx', { serializedTx: '84' }),
      ).resolves.toMatchObject({ ok: false, code: 'unsupported-request' });
      await expect(
        send(port, 'cardano-custody-public-key', { chainId: {} }),
      ).resolves.toMatchObject({ ok: false, code: 'unsupported-request' });
      await expect(
        send(port, 'sign-cardano-custody-data', { payload: 'aa' }),
      ).resolves.toMatchObject({ ok: false, code: 'unsupported-request' });
      expect(onRequest).not.toHaveBeenCalled();
    });

    it('answers with unexpected when the handler result cannot be cloned', async () => {
      const handlers: SignerRequestHandlers = {
        ...echoHandlers(),
        'record-read': async () => () => 'not cloneable',
      };
      const port = await connect(createWindowPair(), { handlers });

      await expect(send(port, 'record-read')).resolves.toMatchObject({
        ok: false,
        code: 'unexpected',
        message: 'The signer request failed.',
      });
    });

    it('forwards a coded error with its message and hides the message of other errors', async () => {
      const handlers: SignerRequestHandlers = {
        ...echoHandlers(),
        authorise: async () => {
          throw Object.assign(new Error('Counter used.'), {
            code: 'use-counter-spent',
          });
        },
        'record-read': async () => {
          throw new Error('Storage failed.');
        },
        'record-exists': async () => {
          const notAnError: unknown = 'not an error';
          throw notAnError;
        },
        'record-write': async () => {
          const codedValue: unknown = { code: 'record-missing' };
          throw codedValue;
        },
      };
      const port = await connect(createWindowPair(), { handlers });

      await expect(send(port, 'authorise')).resolves.toMatchObject({
        ok: false,
        code: 'use-counter-spent',
        message: 'Counter used.',
      });
      await expect(send(port, 'record-read')).resolves.toMatchObject({
        ok: false,
        code: 'unexpected',
        message: 'The signer request failed.',
      });
      await expect(send(port, 'record-exists')).resolves.toMatchObject({
        ok: false,
        code: 'unexpected',
        message: 'The signer request failed.',
      });
      await expect(send(port, 'record-write')).resolves.toMatchObject({
        ok: false,
        code: 'record-missing',
        message: 'The signer request failed.',
      });
    });
  });

  describe('consent', () => {
    it('asks for consent with the request and dApp origin for ceremony kinds only', async () => {
      const onRequest = vi.fn<ServeProps['onRequest']>(approveAll);
      const port = await connect(createWindowPair(), { onRequest });
      const flow = { flow: { kind: 'sign-in' } };

      await send(port, 'flow-open', flow);
      await send(port, 'sign-cardano-tx', { serializedTx: '84' });
      await send(port, 'sign-cardano-data', { payload: 'aa' });
      await send(port, 'cardano-account-public-key', { accountIndex: 0 });
      await send(port, 'cardano-custody-public-key', { chainId: {} });
      await send(port, 'sign-cardano-custody-tx', { serializedTx: '84' });
      await send(port, 'sign-cardano-custody-data', { payload: 'aa' });
      await send(port, 'device-public-key');
      await send(port, 'device-commitments');
      await send(port, 'authorise');
      for (const kind of [
        'reader-public-key',
        'create-keys',
        'seal-to-device',
        'find-live-envelope',
        'open-inbox',
        'seal-grant',
        'reencrypt-inbox',
        'seal-view',
        'sign-maintenance-update',
        'holds-maintenance-authority',
      ] as const) {
        await send(port, kind);
      }
      await send(port, 'record-read');
      await send(port, 'record-write');
      await send(port, 'record-exists');
      await send(port, 'flow-close', FLOW_COMPLETED);

      expect(onRequest.mock.calls.map(([request]) => request.kind)).toEqual([
        'flow-open',
        'sign-cardano-tx',
        'sign-cardano-data',
        'cardano-account-public-key',
        'cardano-custody-public-key',
        'sign-cardano-custody-tx',
        'sign-cardano-custody-data',
      ]);
      const [request, origin] = onRequest.mock.calls[0];
      expect(request).toMatchObject({ kind: 'flow-open', payload: flow });
      expect(origin).toBe(DAPP_ORIGIN);
    });

    it('hands the handler the dApp origin that consent named', async () => {
      const handlers = echoHandlers();
      const signData = vi.spyOn(handlers, 'sign-cardano-custody-data');
      const onRequest = vi.fn<ServeProps['onRequest']>(approveAll);
      const pair = createWindowPair();
      serve(pair, { handlers, onRequest });
      const { port, ready } = sayHello(pair, 'http://localhost:5173');
      await ready;

      await send(port, 'sign-cardano-custody-data', { payload: 'aa' });

      expect(onRequest.mock.calls[0][1]).toBe('http://localhost:5173');
      expect(signData).toHaveBeenCalledWith(
        { payload: 'aa' },
        'http://localhost:5173',
      );
    });

    it('answers a rejected request with ceremony-cancelled without running the handler', async () => {
      const handlers = echoHandlers();
      const signTx = vi.spyOn(handlers, 'sign-cardano-tx');
      const port = await connect(createWindowPair(), {
        handlers,
        onRequest: async () => 'reject',
      });

      await expect(send(port, 'sign-cardano-tx')).resolves.toMatchObject({
        ok: false,
        code: 'ceremony-cancelled',
      });
      expect(signTx).not.toHaveBeenCalled();
    });
  });

  describe('origin check', () => {
    const refuseOrigin = (): never => {
      throw Object.assign(new Error('This site may not send that request.'), {
        code: 'origin-not-allowed',
      });
    };

    it('checks the kind and dApp origin of every served request before consent', async () => {
      const assertOriginAllowed = vi.fn<ServeProps['assertOriginAllowed']>();
      const onRequest = vi.fn<ServeProps['onRequest']>(approveAll);
      const port = await connect(createWindowPair(), {
        assertOriginAllowed,
        onRequest,
      });

      await send(port, 'sign-cardano-custody-tx', { serializedTx: '84' });
      await send(port, 'record-read');

      expect(assertOriginAllowed.mock.calls).toEqual([
        ['sign-cardano-custody-tx', DAPP_ORIGIN],
        ['record-read', DAPP_ORIGIN],
      ]);
      expect(assertOriginAllowed.mock.invocationCallOrder[0]).toBeLessThan(
        onRequest.mock.invocationCallOrder[0],
      );
    });

    it.each([
      ['a kind that asks for consent', 'sign-cardano-custody-tx'],
      ['a kind that asks for no consent', 'authorise'],
    ] as const)(
      'refuses %s with the thrown code before consent and the handler',
      async (...[, kind]) => {
        const handlers = echoHandlers();
        const handler = vi.spyOn(handlers, kind);
        const onRequest = vi.fn<ServeProps['onRequest']>(approveAll);
        const port = await connect(createWindowPair(), {
          handlers,
          assertOriginAllowed: refuseOrigin,
          onRequest,
        });

        await expect(send(port, kind)).resolves.toMatchObject({
          ok: false,
          code: 'origin-not-allowed',
          message: 'This site may not send that request.',
        });
        expect(onRequest).not.toHaveBeenCalled();
        expect(handler).not.toHaveBeenCalled();
      },
    );

    it('leaves the flow free when it refuses a flow-open', async () => {
      const assertOriginAllowed = vi
        .fn<ServeProps['assertOriginAllowed']>()
        .mockImplementationOnce(refuseOrigin);
      const port = await connect(createWindowPair(), { assertOriginAllowed });

      await expect(send(port, 'flow-open')).resolves.toMatchObject({
        code: 'origin-not-allowed',
      });
      await expect(send(port, 'flow-open')).resolves.toMatchObject({
        ok: true,
      });
    });

    it('answers a kind with no handler as unsupported without checking its origin', async () => {
      const assertOriginAllowed = vi.fn<ServeProps['assertOriginAllowed']>();
      const port = await connect(createWindowPair(), { assertOriginAllowed });

      await expect(
        send(port, 'hasOwnProperty' as never),
      ).resolves.toMatchObject({ ok: false, code: 'unsupported-request' });
      expect(assertOriginAllowed).not.toHaveBeenCalled();
    });
  });

  describe('flows', () => {
    it('carries a grant flow descriptor to consent and its handler unchanged', async () => {
      const onRequest = vi.fn<ServeProps['onRequest']>(approveAll);
      const port = await connect(createWindowPair(), { onRequest });
      const flow = {
        kind: 'issue-grant',
        account: 'ac'.repeat(32),
        grantId: 'ab'.repeat(32),
        scope: { operations: ['withdraw-unshielded'], cap: '450' },
        slot: 0,
        scopeSalt: '22'.repeat(32),
        scopeDigest: 'cd'.repeat(32),
      };

      await expect(send(port, 'flow-open', { flow })).resolves.toMatchObject({
        ok: true,
        result: { kind: 'flow-open', payload: { flow } },
      });

      expect(onRequest).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ kind: 'flow-open', payload: { flow } }),
        DAPP_ORIGIN,
      );
    });

    it('hands the flow-close outcome to its handler, completed or failed', async () => {
      const port = await connect(createWindowPair());

      await send(port, 'flow-open');
      await expect(
        send(port, 'flow-close', FLOW_COMPLETED),
      ).resolves.toMatchObject({
        ok: true,
        result: { kind: 'flow-close', payload: FLOW_COMPLETED },
      });
      await send(port, 'flow-open');
      await expect(
        send(port, 'flow-close', { outcome: 'failed', code: 'network-error' }),
      ).resolves.toMatchObject({
        ok: true,
        result: {
          kind: 'flow-close',
          payload: { outcome: 'failed', code: 'network-error' },
        },
      });
    });

    it('answers a second flow-open with signer-busy until the flow closes', async () => {
      const port = await connect(createWindowPair());

      await expect(send(port, 'flow-open')).resolves.toMatchObject({
        ok: true,
      });
      await expect(send(port, 'flow-open')).resolves.toMatchObject({
        ok: false,
        code: 'signer-busy',
        message: 'A signer flow is already open.',
      });
      await expect(
        send(port, 'flow-close', FLOW_COMPLETED),
      ).resolves.toMatchObject({
        ok: true,
      });
      await expect(send(port, 'flow-open')).resolves.toMatchObject({
        ok: true,
      });
    });

    it('is busy while a flow-open awaits consent', async () => {
      const gate = { release: (): void => {} };
      const port = await connect(createWindowPair(), {
        onRequest: async () =>
          new Promise(resolve => {
            gate.release = () => {
              resolve('approve');
            };
          }),
      });

      const first = send(port, 'flow-open');
      await expect(send(port, 'flow-open')).resolves.toMatchObject({
        code: 'signer-busy',
      });

      gate.release();
      await expect(first).resolves.toMatchObject({ ok: true });
    });

    it('refuses a flow-close while a flow-open awaits consent and keeps the flow open', async () => {
      const gate = { release: (): void => {} };
      const port = await connect(createWindowPair(), {
        onRequest: async () =>
          new Promise(resolve => {
            gate.release = () => {
              resolve('approve');
            };
          }),
      });

      const opening = send(port, 'flow-open');
      await expect(
        send(port, 'flow-close', FLOW_COMPLETED),
      ).resolves.toMatchObject({
        code: 'signer-busy',
      });

      gate.release();
      await expect(opening).resolves.toMatchObject({ ok: true });
      await expect(send(port, 'flow-open')).resolves.toMatchObject({
        code: 'signer-busy',
      });
      await expect(
        send(port, 'flow-close', FLOW_COMPLETED),
      ).resolves.toMatchObject({
        ok: true,
      });
    });

    it('stays busy while a flow-close runs and frees the flow once it settles', async () => {
      const gate = { release: (): void => {} };
      const handlers: SignerRequestHandlers = {
        ...echoHandlers(),
        'flow-close': async () =>
          new Promise(resolve => {
            gate.release = () => {
              resolve('closed');
            };
          }),
      };
      const port = await connect(createWindowPair(), { handlers });
      await send(port, 'flow-open');

      const closing = send(port, 'flow-close', FLOW_COMPLETED);
      await expect(send(port, 'flow-open')).resolves.toMatchObject({
        code: 'signer-busy',
      });
      await expect(
        send(port, 'flow-close', FLOW_COMPLETED),
      ).resolves.toMatchObject({
        code: 'signer-busy',
      });

      gate.release();
      await expect(closing).resolves.toMatchObject({ ok: true });
      await expect(send(port, 'flow-open')).resolves.toMatchObject({
        ok: true,
      });
    });

    it('runs a flow-close with no flow open without claiming the slot', async () => {
      const gate = { release: (): void => {} };
      const handlers: SignerRequestHandlers = {
        ...echoHandlers(),
        'flow-close': async () =>
          new Promise(resolve => {
            gate.release = () => {
              resolve('closed');
            };
          }),
      };
      const port = await connect(createWindowPair(), { handlers });

      const closing = send(port, 'flow-close', FLOW_COMPLETED);
      await expect(send(port, 'flow-open')).resolves.toMatchObject({
        ok: true,
      });
      gate.release();
      await expect(closing).resolves.toMatchObject({ ok: true });

      await expect(send(port, 'flow-open')).resolves.toMatchObject({
        code: 'signer-busy',
      });
    });

    it('frees the flow when its open is rejected or fails', async () => {
      const handlers: SignerRequestHandlers = {
        ...echoHandlers(),
        'flow-open': async () => {
          throw new Error('No credential.');
        },
      };
      const onRequest = vi
        .fn<ServeProps['onRequest']>(approveAll)
        .mockResolvedValueOnce('reject');
      const port = await connect(createWindowPair(), { handlers, onRequest });

      await expect(send(port, 'flow-open')).resolves.toMatchObject({
        code: 'ceremony-cancelled',
      });
      await expect(send(port, 'flow-open')).resolves.toMatchObject({
        code: 'unexpected',
      });
      handlers['flow-open'] = echoHandlers()['flow-open'];
      await expect(send(port, 'flow-open')).resolves.toMatchObject({
        ok: true,
      });
    });
  });

  describe('stop', () => {
    it('stops listening for hello and closes the adopted port', async () => {
      const pair = createWindowPair();
      const stop = serve(pair);
      const { port, ready } = sayHello(pair);
      await ready;
      const closePort = vi.spyOn(MessagePort.prototype, 'close');

      stop();

      expect(closePort).toHaveBeenCalledOnce();
      expect(pair.signer.listenerCount()).toBe(0);
      port.postMessage({ id: 1, kind: 'record-read', payload: {} });
      await expect(
        Promise.race([nextMessage(port), flush().then(() => 'unanswered')]),
      ).resolves.toBe('unanswered');
    });

    it('stops listening for hello before any was accepted', () => {
      const pair = createWindowPair();
      const stop = serve(pair);

      stop();

      expect(pair.signer.listenerCount()).toBe(0);
    });
  });
});
