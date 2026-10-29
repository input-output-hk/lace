import { vi } from 'vitest';

import type { SignerRequestHandlers } from '../../src';

export const DAPP_ORIGIN = 'https://dapp.example';
export const SIGNER_URL = 'https://signer.lace.io/?v=1';
export const SIGNER_ORIGIN = 'https://signer.lace.io';
export const SIGNER_HOSTNAME = 'signer.lace.io';

type Listener = (event: MessageEvent) => void;

type FakeMessageEvent = {
  data: unknown;
  origin: string;
  source?: unknown;
  ports?: readonly MessagePort[];
};

const createMessageTarget = () => {
  const listeners = new Set<Listener>();
  return {
    addEventListener: vi.fn((_type: string, listener: Listener) => {
      listeners.add(listener);
    }),
    removeEventListener: vi.fn((_type: string, listener: Listener) => {
      listeners.delete(listener);
    }),
    emit: (event: FakeMessageEvent) => {
      for (const listener of [...listeners]) {
        listener(event as unknown as MessageEvent);
      }
    },
    listenerCount: () => listeners.size,
  };
};

type WindowPairOptions = {
  dappOrigin?: string;
  popupOrigin?: string;
  referrer?: string;
};

/**
 * A dApp window and the popup it opened, each delivering posted messages
 * to the other side asynchronously and only when the target origin matches
 * the recipient, as browsers do.
 */
export const createWindowPair = ({
  dappOrigin = DAPP_ORIGIN,
  popupOrigin = SIGNER_ORIGIN,
  referrer = '',
}: WindowPairOptions = {}) => {
  const dappTarget = createMessageTarget();
  const signerTarget = createMessageTarget();

  const opener = {
    postMessage: vi.fn((data: unknown, targetOrigin: string) => {
      if (targetOrigin !== '*' && targetOrigin !== dappOrigin) return;
      queueMicrotask(() => {
        dappTarget.emit({ data, origin: popupOrigin, source: popup });
      });
    }),
  };

  const popup = {
    closed: false,
    close: vi.fn(() => {
      popup.closed = true;
    }),
    postMessage: vi.fn(
      (data: unknown, targetOrigin: string, transfer: MessagePort[] = []) => {
        if (targetOrigin !== '*' && targetOrigin !== popupOrigin) return;
        queueMicrotask(() => {
          signerTarget.emit({
            data,
            origin: dappOrigin,
            source: opener,
            ports: transfer,
          });
        });
      },
    ),
  };

  const dapp = { ...dappTarget, open: vi.fn(() => popup) };
  const signer = {
    ...signerTarget,
    opener,
    location: { origin: SIGNER_ORIGIN, hostname: SIGNER_HOSTNAME },
    document: { referrer },
  };

  return {
    dapp,
    popup,
    signer,
    opener,
    dappHost: dapp as unknown as Window,
    signerHost: signer as unknown as Window,
  };
};

export type WindowPair = ReturnType<typeof createWindowPair>;

export const flush = async (): Promise<void> =>
  new Promise(resolve => {
    setImmediate(resolve);
  });

export const isSettled = async (promise: Promise<unknown>): Promise<boolean> =>
  Promise.race([
    promise.then(
      () => true,
      () => true,
    ),
    flush().then(() => false),
  ]);

/** Handlers that answer every kind with its own kind and payload. */
export const echoHandlers = (): SignerRequestHandlers => {
  const echo =
    (kind: string) =>
    async (payload: unknown): Promise<unknown> => ({ kind, payload });
  return {
    'flow-open': echo('flow-open'),
    'flow-close': echo('flow-close'),
    'device-public-key': echo('device-public-key'),
    'device-commitments': echo('device-commitments'),
    authorise: echo('authorise'),
    'reader-public-key': echo('reader-public-key'),
    'create-keys': echo('create-keys'),
    'seal-to-device': echo('seal-to-device'),
    'find-live-envelope': echo('find-live-envelope'),
    'open-inbox': echo('open-inbox'),
    'seal-grant': echo('seal-grant'),
    'reencrypt-inbox': echo('reencrypt-inbox'),
    'seal-view': echo('seal-view'),
    'sign-maintenance-update': echo('sign-maintenance-update'),
    'holds-maintenance-authority': echo('holds-maintenance-authority'),
    'record-read': echo('record-read'),
    'record-write': echo('record-write'),
    'record-exists': echo('record-exists'),
    'sign-cardano-tx': echo('sign-cardano-tx'),
    'sign-cardano-data': echo('sign-cardano-data'),
    'cardano-account-public-key': echo('cardano-account-public-key'),
    'cardano-custody-public-key': echo('cardano-custody-public-key'),
    'sign-cardano-custody-tx': echo('sign-cardano-custody-tx'),
    'sign-cardano-custody-data': echo('sign-cardano-custody-data'),
  };
};

export const approveAll = async (): Promise<'approve'> => 'approve';

export const allowEveryOrigin = (): undefined => undefined;
