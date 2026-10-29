import { vi } from 'vitest';

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
  };
};

/**
 * A dApp window and the popup it opened, each delivering posted messages
 * to the other side asynchronously and only when the target origin matches
 * the recipient, as browsers do.
 */
export const createWindowPair = () => {
  const dappTarget = createMessageTarget();
  const signerTarget = createMessageTarget();

  const opener = {
    postMessage: vi.fn((data: unknown, targetOrigin: string) => {
      if (targetOrigin !== '*' && targetOrigin !== DAPP_ORIGIN) return;
      queueMicrotask(() => {
        dappTarget.emit({ data, origin: SIGNER_ORIGIN, source: popup });
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
        if (targetOrigin !== '*' && targetOrigin !== SIGNER_ORIGIN) return;
        queueMicrotask(() => {
          signerTarget.emit({
            data,
            origin: DAPP_ORIGIN,
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
    document: { referrer: '' },
  };

  return {
    dappHost: dapp as unknown as Window,
    signerHost: signer as unknown as Window,
  };
};
