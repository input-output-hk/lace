import { PasskeyCeremonyCancelledError, SignerBusyError } from '../errors';

import { hasMessageType, isSignerRequest } from './protocol';

import type {
  SignerLoadedMessage,
  SignerReadyMessage,
  SignerRequest,
  SignerRequestKind,
  SignerRequestPayloads,
  SignerResponse,
} from './protocol';

/**
 * One handler per request kind; each resolves with the public result the
 * dApp receives. `dappOrigin` is the origin of the dApp that sent the
 * request, the one consent named, for a handler whose result binds it,
 * as a custody data signature and the grant an issue-grant flow opens
 * do. {@link serveSignerRequests} always passes it; a handler that binds
 * it refuses a request without it.
 */
export type SignerRequestHandlers = {
  [Kind in SignerRequestKind]: (
    payload: SignerRequestPayloads[Kind],
    dappOrigin?: string,
  ) => Promise<unknown>;
};

/** What the popup page needs to serve one dApp's requests. */
export type ServeSignerRequestsProps = {
  handlers: SignerRequestHandlers;
  /**
   * Decides whether the dApp origin may send a request of `kind`. It runs
   * for every kind the signer serves, before the Passport flow state,
   * consent and the handler, and never sees the payload. A throw refuses
   * the request, and the error reaches the dApp as a handler error would.
   * A host that restricts no kind passes one that never throws.
   *
   * The check is synchronous: the server does not await it, so its return
   * type is `undefined` and an async check, whose rejection would admit the
   * request, does not compile.
   */
  assertOriginAllowed: (
    kind: SignerRequestKind,
    dappOrigin: string,
  ) => undefined;
  /**
   * Consent hook for the requests that start a ceremony, shown with the
   * dApp origin that asked. A reject answer fails the request with the
   * ceremony-cancelled code.
   */
  onRequest: (
    request: SignerRequest,
    dappOrigin: string,
  ) => Promise<'approve' | 'reject'>;
  /** Relying-party ID reported to the dApp; defaults to the page hostname. */
  rpId?: string;
  /** The popup window; defaults to `window`. */
  host?: Pick<
    Window,
    | 'addEventListener'
    | 'document'
    | 'location'
    | 'opener'
    | 'removeEventListener'
  >;
};

const CONSENT_KINDS: ReadonlySet<SignerRequestKind> =
  new Set<SignerRequestKind>([
    'flow-open',
    'sign-cardano-tx',
    'sign-cardano-data',
    'cardano-account-public-key',
    'cardano-custody-public-key',
    'sign-cardano-custody-tx',
    'sign-cardano-custody-data',
  ]);

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1']);

const GENERIC_FAILURE_MESSAGE = 'The signer request failed.';

/**
 * A request kind this signer has no handler for. It carries its own code so
 * the dApp can tell a kind the signer does not serve from a failure of a
 * kind it does serve, which reaches the dApp as `unexpected`.
 */
class UnsupportedSignerRequestError extends Error {
  public readonly code = 'unsupported-request' as const;
  public constructor() {
    super('The signer does not serve this request kind.');
    this.name = 'UnsupportedSignerRequestError';
  }
}

/**
 * The Passport flow slot. A flow-open holds it as `opening` until its
 * ceremony settles and a flow-close holds it as `closing` until the session
 * is torn down; requests that would overlap either transition are refused
 * as busy, so the slot never reports a state the handlers are not in.
 */
type FlowSlot = 'closing' | 'idle' | 'open' | 'opening';

/**
 * Consent is attributed to the dApp origin the popup displays, so that
 * origin must be one a network attacker cannot impersonate: https only,
 * with plain http allowed for local development hosts.
 */
const isTrustedDappOrigin = (origin: string): boolean => {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  return (
    url.protocol === 'https:' ||
    (url.protocol === 'http:' && LOCAL_HOSTNAMES.has(url.hostname))
  );
};

const referrerOrigin = (referrer: string): string | undefined => {
  try {
    return new URL(referrer).origin;
  } catch {
    return undefined;
  }
};

/**
 * The values an error declares for the dApp under `details`, when it
 * declares any as a plain object.
 */
const failureDetails = (
  error: object,
): Record<string, never> | { details: Record<string, unknown> } =>
  'details' in error &&
  typeof error.details === 'object' &&
  error.details !== null &&
  !Array.isArray(error.details)
    ? { details: { ...error.details } }
    : {};

/**
 * Only errors that declare a string code are meant for the dApp, with the
 * details they declare alongside. Anything else is reported as unexpected
 * with a fixed message, so WebAuthn and storage details never leave the
 * signer.
 */
const failure = (id: number, error: unknown): SignerResponse => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    return {
      id,
      ok: false,
      code: error.code,
      message: error instanceof Error ? error.message : GENERIC_FAILURE_MESSAGE,
      ...failureDetails(error),
    };
  }
  return {
    id,
    ok: false,
    code: 'unexpected',
    message: GENERIC_FAILURE_MESSAGE,
  };
};

/**
 * The popup's side of the signer protocol. It announces itself to its
 * opener, adopts the request port from the opener's hello, and answers
 * every request through the matching handler once `assertOriginAllowed`
 * admits its kind from the dApp's origin, asking `onRequest` first for the
 * kinds that start a ceremony. One Passport flow is open at a time: a
 * flow-open while another is opening or open, and a flow-close while one is
 * still opening or closing, answer with the signer-busy code. A kind with no
 * handler answers with the unsupported-request code before the origin check
 * and any consent. Handler errors reach the dApp as their `code` when they
 * carry one and as `unexpected` otherwise. Returns a function that stops
 * serving.
 */
export const serveSignerRequests = ({
  handlers,
  assertOriginAllowed,
  onRequest,
  host = window,
  rpId = host.location.hostname,
}: ServeSignerRequestsProps): (() => void) => {
  const opener: unknown = host.opener;
  if (!opener) throw new Error('The signer page must be opened by a dApp.');
  let port: MessagePort | undefined;
  let flowSlot: FlowSlot = 'idle';

  /**
   * Moves the slot into its transition state for a request that changes it
   * and returns the state to settle into once that request succeeds. A
   * failed transition always leaves the slot idle.
   */
  const claimFlowSlot = (kind: SignerRequestKind): FlowSlot | undefined => {
    if (kind === 'flow-open') {
      if (flowSlot !== 'idle') throw new SignerBusyError();
      flowSlot = 'opening';
      return 'open';
    }
    if (kind === 'flow-close') {
      if (flowSlot === 'opening' || flowSlot === 'closing') {
        throw new SignerBusyError();
      }
      if (flowSlot === 'idle') return undefined;
      flowSlot = 'closing';
      return 'idle';
    }
    return undefined;
  };

  const handle = async (
    request: SignerRequest,
    dappOrigin: string,
  ): Promise<unknown> => {
    if (!Object.hasOwn(handlers, request.kind)) {
      throw new UnsupportedSignerRequestError();
    }
    assertOriginAllowed(request.kind, dappOrigin);
    const settledSlot = claimFlowSlot(request.kind);
    try {
      if (CONSENT_KINDS.has(request.kind)) {
        const decision = await onRequest(request, dappOrigin);
        if (decision === 'reject') throw new PasskeyCeremonyCancelledError();
      }
      const handler = handlers[request.kind] as (
        payload: unknown,
        dappOrigin: string,
      ) => Promise<unknown>;
      const result = await handler(request.payload, dappOrigin);
      if (settledSlot) flowSlot = settledSlot;
      return result;
    } catch (error) {
      if (settledSlot) flowSlot = 'idle';
      throw error;
    }
  };

  const answer = async (
    adopted: MessagePort,
    request: SignerRequest,
    dappOrigin: string,
  ): Promise<void> => {
    try {
      const result = await handle(request, dappOrigin);
      const response: SignerResponse = { id: request.id, ok: true, result };
      adopted.postMessage(response);
    } catch (error) {
      adopted.postMessage(failure(request.id, error));
    }
  };

  const serve = (adopted: MessagePort, dappOrigin: string): void => {
    adopted.addEventListener('message', (event: MessageEvent) => {
      if (!isSignerRequest(event.data)) return;
      void answer(adopted, event.data, dappOrigin);
    });
    adopted.start();
    const ready: SignerReadyMessage = {
      type: 'ready',
      origin: host.location.origin,
      rpId,
    };
    adopted.postMessage(ready);
  };

  const onHello = (event: MessageEvent): void => {
    if (port || event.source !== opener) return;
    if (!hasMessageType(event.data, 'hello')) return;
    const [offered] = event.ports;
    if (!offered) return;
    if (!isTrustedDappOrigin(event.origin)) {
      offered.close();
      return;
    }
    port = offered;
    host.removeEventListener('message', onHello);
    serve(offered, event.origin);
  };

  host.addEventListener('message', onHello);
  const loaded: SignerLoadedMessage = { type: 'signer-loaded' };
  (opener as Window).postMessage(
    loaded,
    referrerOrigin(host.document.referrer) ?? '*',
  );

  return () => {
    host.removeEventListener('message', onHello);
    port?.close();
    port = undefined;
  };
};
