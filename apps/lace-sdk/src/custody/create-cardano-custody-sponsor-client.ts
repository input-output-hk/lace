import { CardanoCustodySponsorError } from './cardano-custody-sponsor';
import {
  leaseIdOf,
  MalformedSponsorAnswerError,
  parseCollateralAnswer,
  parseCollateralWitnessAnswer,
  parseLeaseAnswer,
  parseLeaseWitnessAnswer,
  parseReleaseAnswer,
  parseServiceError,
} from './parse-sponsor-answer';

import type { CardanoCustodySponsor } from './cardano-custody-sponsor';
import type { HexBlob } from '@cardano-sdk/util';

export type CreateCardanoCustodySponsorClientProps = {
  /**
   * Where the fee sponsor service listens, or a relay that forwards to it,
   * such as `https://sponsor.example`. The API paths are appended to it,
   * after any trailing slash is dropped.
   */
  baseUrl: string;
  /**
   * The client key the service issued, in bearer token syntax (RFC 6750
   * token68). It is sent only as a bearer token and is never part of an
   * error. When it is omitted, requests carry no authorization header, for
   * a `baseUrl` that names a relay which adds the key.
   */
  apiKey?: string;
  /**
   * The fetch implementation to call the service with, such as one with a
   * timeout. Defaults to the global `fetch`, looked up on each call.
   */
  fetch?: (url: string, request: RequestInit) => Promise<Response>;
};

type ServiceCall<T> = {
  method: 'DELETE' | 'GET' | 'POST';
  path: string;
  body?: { transaction: HexBlob };
  /** The one status the service documents for success on this route. */
  successStatus: number;
  parse: (answer: unknown) => T;
  /** Runs before a refused success answer is reported, with that answer. */
  onRefusedAnswer?: (answer: unknown) => Promise<void>;
};

const UNEXPECTED_RESPONSE = 'unexpected_response';
const HTTP_CREATED = 201;
const HTTP_OK = 200;
// RFC 6750 token68. A key outside it, such as one with a line break, makes
// fetch throw an error that quotes the whole authorization header.
const BEARER_TOKEN_PATTERN = /^[\w.~+/-]+=*$/;
// The bearer key may travel unencrypted only to the local machine, as to a
// service under development.
const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

const parseServiceRoot = (baseUrl: string): URL | undefined => {
  try {
    return new URL(baseUrl);
  } catch {
    return undefined;
  }
};

const isTransportAllowed = (url: URL) =>
  url.protocol === 'https:' ||
  (url.protocol === 'http:' && LOOPBACK_HOSTNAMES.has(url.hostname));

/** The normalised base URL without trailing slashes, ready for an API path. */
const toServiceRoot = (baseUrl: string): string => {
  const url = parseServiceRoot(baseUrl);
  // A query or fragment would swallow the appended API path, and fetch
  // refuses URLs that embed credentials.
  if (
    url === undefined ||
    !isTransportAllowed(url) ||
    url.search !== '' ||
    url.hash !== '' ||
    url.username !== '' ||
    url.password !== ''
  ) {
    throw new TypeError(
      'The fee sponsor base URL must be an absolute https URL, or http to a loopback host, without credentials, query or fragment.',
    );
  }
  return `${url.origin}${url.pathname}`.replace(/\/+$/, '');
};

/** The parsed JSON body, or undefined when the body is not JSON. */
const readJson = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
};

const unexpectedResponse = (status: number, detail: string) =>
  new CardanoCustodySponsorError({ status, code: UNEXPECTED_RESPONSE, detail });

/**
 * A client for the fee sponsor service's client API (`/v1/leases` and
 * `/v1/collateral`). It holds no lease state: the caller decides when to
 * lease, release and re-read the collateral after a refusal.
 *
 * Every answer is validated before it is returned. UTxOs must name a 32-byte
 * transaction hash, a safe-integer index and lovelace amount, and the
 * sponsor address, which must be bech32 with a key-hash payment part. Witness
 * sets must hold exactly one vkey witness and nothing else, and a collateral
 * witness must name the posted transaction. A refused lease answer that
 * names its lease releases that lease, best effort. A refusal rejects with
 * {@link CardanoCustodySponsorError}. A failure to reach the service rejects
 * with the error the fetch implementation raised.
 *
 * The service sends no CORS headers, and its client keys are bearer secrets.
 * A browser app therefore omits `apiKey` and points `baseUrl` at a relay on
 * its own backend, which forwards each call to the service with the key
 * added. A server-side caller passes `apiKey` and calls the service directly.
 *
 * @returns A {@link CardanoCustodySponsor}: `lease`, `signLeased` and
 *   `releaseLease` in fee mode, which serves creation only, and `collateral`
 *   and `signCollateral` in collateral mode.
 * @throws `TypeError` When `baseUrl` is not an https URL, or an http URL to
 *   a loopback host, or `apiKey` is given but is not a bearer token.
 */
export const createCardanoCustodySponsorClient = ({
  baseUrl,
  apiKey,
  fetch: fetchImplementation,
}: CreateCardanoCustodySponsorClientProps): CardanoCustodySponsor => {
  const root = toServiceRoot(baseUrl);
  if (apiKey !== undefined && !BEARER_TOKEN_PATTERN.test(apiKey)) {
    throw new TypeError('The fee sponsor API key is not a valid bearer token.');
  }
  const send =
    fetchImplementation ??
    (async (url: string, request: RequestInit) =>
      globalThis.fetch(url, request));

  const call = async <T>({
    method,
    path,
    body,
    successStatus,
    parse,
    onRefusedAnswer,
  }: ServiceCall<T>): Promise<T> => {
    const headers: Record<string, string> = {};
    if (apiKey !== undefined) headers.authorization = `Bearer ${apiKey}`;
    const request: RequestInit = { method, headers };
    if (body !== undefined) {
      headers['content-type'] = 'application/json';
      request.body = JSON.stringify(body);
    }
    const response = await send(`${root}${path}`, request);
    const answer = await readJson(response);
    const route = `${method} ${path}`;
    if (response.status !== successStatus) {
      // The service sends error bodies with error statuses only, so another
      // success status is unexpected whatever its body says.
      if (response.ok) {
        throw unexpectedResponse(
          response.status,
          `${route} answered with status ${response.status} instead of ${successStatus}`,
        );
      }
      const serviceError = parseServiceError(answer);
      if (serviceError === undefined) {
        throw unexpectedResponse(
          response.status,
          `${route} answered with status ${response.status} and no service error body`,
        );
      }
      throw new CardanoCustodySponsorError({
        status: response.status,
        ...serviceError,
      });
    }
    try {
      return parse(answer);
    } catch (error) {
      if (!(error instanceof MalformedSponsorAnswerError)) throw error;
      await onRefusedAnswer?.(answer);
      throw unexpectedResponse(
        response.status,
        `${route} answered with a malformed ${error.field}`,
      );
    }
  };

  const leasePath = (leaseId: string) =>
    `/v1/leases/${encodeURIComponent(leaseId)}`;

  const releaseLease = async (leaseId: string) =>
    call({
      method: 'DELETE',
      path: leasePath(leaseId),
      successStatus: HTTP_OK,
      parse: answer => {
        parseReleaseAnswer(answer, leaseId);
      },
    });

  /**
   * The service created the lease before its answer was refused here, and the
   * caller never learns the lease. Releasing it frees the fee UTxO and the
   * key's open-lease slot now instead of at expiry. The release is best
   * effort: the refusal is reported whatever its outcome.
   */
  const releaseRefusedLease = async (answer: unknown) => {
    const leaseId = leaseIdOf(answer);
    if (leaseId === undefined) return;
    try {
      await releaseLease(leaseId);
    } catch {
      // The lease lapses at its expiry instead.
    }
  };

  return {
    lease: async () =>
      call({
        method: 'POST',
        path: '/v1/leases',
        successStatus: HTTP_CREATED,
        parse: parseLeaseAnswer,
        onRefusedAnswer: releaseRefusedLease,
      }),
    signLeased: async (leaseId, transaction) =>
      call({
        method: 'POST',
        path: `${leasePath(leaseId)}/witness`,
        body: { transaction },
        successStatus: HTTP_OK,
        parse: answer => parseLeaseWitnessAnswer(answer, leaseId),
      }),
    releaseLease,
    collateral: async () =>
      call({
        method: 'GET',
        path: '/v1/collateral',
        successStatus: HTTP_OK,
        parse: parseCollateralAnswer,
      }),
    signCollateral: async transaction =>
      call({
        method: 'POST',
        path: '/v1/collateral/witness',
        body: { transaction },
        successStatus: HTTP_OK,
        parse: answer => parseCollateralWitnessAnswer(answer, transaction),
      }),
  };
};
