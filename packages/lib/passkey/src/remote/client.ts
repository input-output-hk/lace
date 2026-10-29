import {
  RemoteSignerError,
  SignerClosedError,
  SignerPopupBlockedError,
} from '../errors';

import { hasMessageType, isSignerResponse } from './protocol';

import type {
  SignerHelloMessage,
  SignerRequestKind,
  SignerRequestPayloads,
} from './protocol';

/** The options of `createSignerClient`. */
export type CreateSignerClientProps = {
  /** URL of the hosted signer page; its origin is the only one trusted. */
  signerUrl: string;
  /**
   * Window that opens the popup and hears its handshake; defaults to
   * `window`.
   */
  host?: Pick<Window, 'addEventListener' | 'open' | 'removeEventListener'>;
};

/**
 * The dApp's side of the signer protocol. `open` must run synchronously
 * inside a user click handler: browsers block popups opened after an
 * await. `connect` completes the handshake once the popup has loaded;
 * calling it again for the same popup joins that handshake instead of
 * starting another. `request` sends one request and resolves with its
 * result or rejects with a {@link RemoteSignerError} carrying the signer's
 * code. Requests pending when the popup closes reject with a
 * {@link SignerClosedError}, as does every request sent after the popup
 * has closed; a request before `open` and `connect` is a programming
 * error.
 */
export type SignerClient = {
  open: () => Window;
  connect: () => Promise<void>;
  request: <Kind extends SignerRequestKind>(
    kind: Kind,
    payload: SignerRequestPayloads[Kind],
  ) => Promise<unknown>;
  close: () => void;
};

const POPUP_NAME = 'lace-signer';
const POPUP_FEATURES = 'popup,width=420,height=600';
const POPUP_CLOSED_POLL_INTERVAL = 500;

type PendingRequest = {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
};

type OpenPopup = {
  popup: Window;
  loaded: Promise<void>;
  closed: Promise<never>;
  handshake?: Promise<void>;
  settleClosed: () => void;
  stop: () => void;
};

/**
 * The low-level client underneath `createRemotePasskeySigner`: it opens the
 * hosted signer page in a popup, completes the handshake over a message
 * channel and carries typed requests to it.
 *
 * Only messages whose origin is the signer's and whose source is the popup
 * this client opened are trusted: any other page that can reach the dApp
 * window could otherwise complete the handshake and receive the port.
 * The hello message is posted to the signer origin alone, so a popup that
 * navigated elsewhere never receives the port either.
 *
 * The popup's loaded message is awaited from `open`, not from `connect`,
 * so a dApp that awaits anything between the two cannot miss it.
 */
export const createSignerClient = ({
  signerUrl,
  host = window,
}: CreateSignerClientProps): SignerClient => {
  const signerOrigin = new URL(signerUrl).origin;
  const pending = new Map<number, PendingRequest>();
  let nextId = 1;
  let opened: OpenPopup | undefined;
  let port: MessagePort | undefined;
  let didClose = false;

  const close = (): void => {
    const closing = opened;
    opened = undefined;
    if (closing) didClose = true;
    closing?.stop();
    if (closing && !closing.popup.closed) closing.popup.close();
    port?.close();
    port = undefined;
    closing?.settleClosed();
    const error = new SignerClosedError();
    for (const request of pending.values()) request.reject(error);
    pending.clear();
  };

  const trackPopup = (popup: Window): OpenPopup => {
    let stopListening = (): void => {};
    const loaded = new Promise<void>(resolve => {
      const onMessage = (event: MessageEvent): void => {
        if (event.origin !== signerOrigin || event.source !== popup) return;
        if (!hasMessageType(event.data, 'signer-loaded')) return;
        stopListening();
        resolve();
      };
      host.addEventListener('message', onMessage);
      stopListening = () => {
        host.removeEventListener('message', onMessage);
      };
    });
    let settleClosed = (): void => {};
    const closed = new Promise<never>((_, reject) => {
      settleClosed = () => {
        reject(new SignerClosedError());
      };
    });
    closed.catch(() => {});
    const interval = setInterval(() => {
      if (popup.closed) close();
    }, POPUP_CLOSED_POLL_INTERVAL);
    return {
      popup,
      loaded,
      closed,
      settleClosed,
      stop: () => {
        clearInterval(interval);
        stopListening();
      },
    };
  };

  const open = (): Window => {
    close();
    const popup = host.open(signerUrl, POPUP_NAME, POPUP_FEATURES);
    if (!popup) throw new SignerPopupBlockedError();
    opened = trackPopup(popup);
    didClose = false;
    return popup;
  };

  const onResponse = (event: MessageEvent): void => {
    if (!isSignerResponse(event.data)) return;
    const response = event.data;
    const request = pending.get(response.id);
    if (!request) return;
    pending.delete(response.id);
    if (response.ok) request.resolve(response.result);
    else
      request.reject(
        new RemoteSignerError(
          response.code,
          response.message,
          response.details,
        ),
      );
  };

  const handshake = async ({
    popup,
    loaded,
    closed,
  }: OpenPopup): Promise<void> => {
    await Promise.race([loaded, closed]);
    const channel = new MessageChannel();
    const ready = new Promise<void>(resolve => {
      const onReady = (event: MessageEvent): void => {
        if (!hasMessageType(event.data, 'ready')) return;
        channel.port1.removeEventListener('message', onReady);
        resolve();
      };
      channel.port1.addEventListener('message', onReady);
    });
    channel.port1.addEventListener('message', onResponse);
    channel.port1.start();
    port = channel.port1;
    const hello: SignerHelloMessage = { type: 'hello' };
    popup.postMessage(hello, signerOrigin, [channel.port2]);
    await Promise.race([ready, closed]);
  };

  const connect = async (): Promise<void> => {
    if (!opened) throw new Error('The signer popup is not open.');
    opened.handshake ??= handshake(opened);
    return opened.handshake;
  };

  const request: SignerClient['request'] = async (kind, payload) => {
    const activePort = port;
    if (!activePort) {
      if (didClose) throw new SignerClosedError();
      throw new Error('The signer is not connected.');
    }
    const id = nextId;
    nextId += 1;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      try {
        activePort.postMessage({ id, kind, payload });
      } catch (error) {
        pending.delete(id);
        throw error;
      }
    });
  };

  return { open, connect, request, close };
};
