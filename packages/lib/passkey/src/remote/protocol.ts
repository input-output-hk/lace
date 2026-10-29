/**
 * Messages exchanged between a dApp and the Lace signer popup. The
 * handshake travels over window messaging; requests and responses travel
 * over a MessageChannel the dApp hands to the popup. Everything on the
 * channel is structured-cloneable and public: the dApp only ever learns
 * public keys, commitments, signatures, sealed envelopes and error codes.
 *
 * Payloads the library must not understand are typed as `unknown` and
 * narrowed by the modules that send them. Field-level bigints are
 * carried as decimal strings so both ends encode them the same way.
 */

import type { ExtensionSignerRequestPayloads } from './protocol-extensions';

/**
 * The Cardano request payloads by kind: transaction and data signatures, and
 * the account public key.
 */
export type CardanoSignerRequestPayloads = {
  'sign-cardano-tx': {
    serializedTx: string;
    knownAddresses: unknown[];
    utxo: unknown[];
    accountIndex: number;
    chainId: unknown;
    extendedAccountPublicKey: string;
  };
  'sign-cardano-data': {
    signWith: string;
    payload: string;
    knownAddresses: unknown[];
    accountIndex: number;
    chainId: unknown;
    extendedAccountPublicKey: string;
  };
  'cardano-account-public-key': { accountIndex: number };
};

/**
 * Request payloads by kind: the Cardano kinds and the kinds the features add.
 * Field-level bigints in the latter are decimal strings.
 */
export type SignerRequestPayloads = CardanoSignerRequestPayloads &
  ExtensionSignerRequestPayloads;

export type SignerRequestKind = keyof SignerRequestPayloads;

/** A request the dApp sends on the channel, discriminated by `kind`. */
export type SignerRequest<Kind extends SignerRequestKind = SignerRequestKind> =
  {
    [K in Kind]: { id: number; kind: K; payload: SignerRequestPayloads[K] };
  }[Kind];

/**
 * The signer's answer to one request. A failure carries the error's code
 * and message, and `details` when the error declares values the dApp
 * needs to act on it, such as the round a refused rotation may step to.
 */
export type SignerResponse =
  | {
      id: number;
      ok: false;
      code: string;
      message: string;
      details?: Record<string, unknown>;
    }
  | { id: number; ok: true; result: unknown };

/** Sent by the popup to its opener once its page has loaded. */
export type SignerLoadedMessage = { type: 'signer-loaded' };

/** Sent by the dApp to the popup with the request port transferred along. */
export type SignerHelloMessage = { type: 'hello' };

/** Sent by the popup on the adopted port once it is serving requests. */
export type SignerReadyMessage = {
  type: 'ready';
  origin: string;
  rpId: string;
};

/** Whether a channel message is shaped like a signer response. */
export const isSignerResponse = (data: unknown): data is SignerResponse =>
  typeof data === 'object' &&
  data !== null &&
  'id' in data &&
  typeof data.id === 'number' &&
  'ok' in data &&
  typeof data.ok === 'boolean';

/** Whether a channel message is shaped like a signer request. */
export const isSignerRequest = (data: unknown): data is SignerRequest =>
  typeof data === 'object' &&
  data !== null &&
  'id' in data &&
  typeof data.id === 'number' &&
  'kind' in data &&
  typeof data.kind === 'string' &&
  'payload' in data;

/** Whether a window or channel message carries the given `type` tag. */
export const hasMessageType = <Type extends string>(
  data: unknown,
  type: Type,
): data is { type: Type } =>
  typeof data === 'object' &&
  data !== null &&
  'type' in data &&
  data.type === type;
