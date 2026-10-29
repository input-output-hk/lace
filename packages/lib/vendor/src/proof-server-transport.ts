import {
  createCheckPayload,
  createProvingPayload,
  parseCheckResult,
} from '@midnight-ntwrk/ledger-v8';
import { fromProvingProvider } from '@midnightntwrk/wallet-sdk/capabilities/proving';
import { Effect } from 'effect';

import type {
  AttestationProgressEvent,
  ProofCircuitProvider,
  ProofServerTransport,
} from './midnight-proof-servers';
import type * as ledger from '@midnight-ntwrk/ledger-v8';
import type {
  ProvingService,
  UnboundTransaction,
} from '@midnightntwrk/wallet-sdk/capabilities/proving';
import type { WalletFacade } from '@midnightntwrk/wallet-sdk/facade';

/**
 * Everything the wallet hands out for one configured proof server: the
 * SDK transaction service and circuit-level dApp provider. HTTP payloads are
 * encoded at this boundary; local WASM consumes the circuit data directly.
 * Both use the same selection, including attestation for a TEE server.
 */
export type ProofServerAccess = {
  provingService: ProvingService<UnboundTransaction>;
  circuits: ProofCircuitProvider;
};

/** HTTP and attested backends encode circuit data only at the transport boundary. */
export const createCircuitProviderFromTransport = (
  transport: ProofServerTransport,
): ProofCircuitProvider => ({
  check: async (request, signal) =>
    parseCheckResult(
      await transport.check(
        createCheckPayload(request.serializedPreimage, request.keyMaterial?.ir),
        signal,
      ),
    ),
  prove: async (request, signal) =>
    transport.prove(
      createProvingPayload(
        request.serializedPreimage,
        request.overwriteBindingInput,
        request.keyMaterial,
      ),
      signal,
    ),
});

/** Append the endpoint while preserving any base path. */
const buildEndpointUrl = (baseUrl: string, endpoint: string): URL => {
  const url = new URL(baseUrl);
  url.pathname = url.pathname.replace(/\/$/, '') + endpoint;
  return url;
};

const post = async (
  url: URL,
  payload: Uint8Array,
  signal?: AbortSignal,
): Promise<Uint8Array> => {
  // `Uint8Array<SharedArrayBuffer>` doesn't satisfy lib.dom's `BodyInit`
  // typing on all setups, so cast through `unknown` — the runtime value is
  // a plain typed array `fetch` accepts in every browser we ship to.
  const response = await fetch(url, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/octet-stream' },
    body: payload as unknown as BodyInit,
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(
      `Proof server returned ${response.status}: ${
        detail || response.statusText
      }`,
    );
  }
  return new Uint8Array(await response.arrayBuffer());
};

/** Shared plain HTTP transport for local and delegated proving. */
export const createHttpProofServerTransport = (
  baseUrl: string,
): ProofServerTransport => {
  const checkUrl = buildEndpointUrl(baseUrl, '/check');
  const proveUrl = buildEndpointUrl(baseUrl, '/prove');
  return {
    check: async (payload, signal) => post(checkUrl, payload, signal),
    prove: async (payload, signal) => post(proveUrl, payload, signal),
  };
};

// Key locations under this prefix are reserved for the ledger's protocol
// circuits (zswap, dust); the proof server holds their key material.
const BUILT_IN_CIRCUIT_PREFIX = 'midnight/';

/** What a failed key material lookup does. */
export type ProvingProviderOptions = {
  /**
   * `'fallback'` (the default, the dApp connector's behaviour) proves any
   * circuit whose lookup fails without key material. `'propagate'` does so
   * only for the ledger's built-in circuits, which dApp providers do not
   * serve, and rejects with the provider's error for any other circuit.
   */
  onKeyMaterialError?: 'fallback' | 'propagate';
};

/**
 * Circuit payloads shared by the wallet, connector and headless SDK. Without
 * a key material provider every circuit is proved with the material the
 * proof server holds; `onKeyMaterialError` decides what a failed lookup does.
 */
export const createProvingProviderFromCircuits = (
  circuits: ProofCircuitProvider,
  keyMaterialProvider?: Record<
    'getProverKey' | 'getVerifierKey' | 'getZKIR',
    (keyLocation: string) => Promise<Uint8Array>
  >,
  { onKeyMaterialError = 'fallback' }: ProvingProviderOptions = {},
): ledger.ProvingProvider => {
  const keyMaterial = async (keyLocation: string) => {
    if (!keyMaterialProvider) return undefined;
    try {
      const [proverKey, verifierKey, ir] = await Promise.all([
        keyMaterialProvider.getProverKey(keyLocation),
        keyMaterialProvider.getVerifierKey(keyLocation),
        keyMaterialProvider.getZKIR(keyLocation),
      ]);
      return { proverKey, verifierKey, ir };
    } catch (error) {
      if (
        onKeyMaterialError === 'fallback' ||
        keyLocation.startsWith(BUILT_IN_CIRCUIT_PREFIX)
      )
        return undefined;
      throw error;
    }
  };
  return {
    check: async (serializedPreimage, keyLocation) =>
      circuits.check({
        serializedPreimage,
        keyLocation,
        keyMaterial: await keyMaterial(keyLocation),
      }),
    prove: async (serializedPreimage, keyLocation, overwriteBindingInput) =>
      circuits.prove({
        serializedPreimage,
        keyLocation,
        overwriteBindingInput,
        keyMaterial: await keyMaterial(keyLocation),
      }),
  };
};

/** Preserve the HTTP adapter for consumers with a raw binary transport. */
export const createProvingProviderFromTransport = (
  transport: ProofServerTransport,
  keyMaterialProvider?: Parameters<typeof createProvingProviderFromCircuits>[1],
  options?: ProvingProviderOptions,
): ledger.ProvingProvider =>
  createProvingProviderFromCircuits(
    createCircuitProviderFromTransport(transport),
    keyMaterialProvider,
    options,
  );

/** Adapts a transport to the wallet SDK's transaction-level `ProvingService`. */
export const createProvingServiceFromTransport = (
  transport: ProofServerTransport,
): ProvingService<UnboundTransaction> => {
  const effectService = fromProvingProvider(
    createProvingProviderFromTransport(transport),
  );
  return {
    prove: async transaction =>
      Effect.runPromise(effectService.prove(transaction)),
  };
};

/** Access to a proof server reachable as-is, with no attestation step. */
export const createProofServerAccess = (
  transport: ProofServerTransport,
): ProofServerAccess & { transport: ProofServerTransport } => ({
  provingService: createProvingServiceFromTransport(transport),
  circuits: createCircuitProviderFromTransport(transport),
  transport,
});

export type FinalizeRecipeWithProgress = (
  facade: WalletFacade,
  recipe: Parameters<WalletFacade['finalizeRecipe']>[0],
  onProgress?: (event: AttestationProgressEvent) => void,
) => ReturnType<WalletFacade['finalizeRecipe']>;

/** Transaction identity isolates concurrent progress callbacks within one account.
 * Entries live until finalization settles; raw connector requests stay unscoped. */
export const createScopedProofServerAccess = (
  createAccess: (
    onProgress: (event: AttestationProgressEvent) => void,
  ) => ProofServerAccess,
): ProofServerAccess & { finalizeRecipe: FinalizeRecipeWithProgress } => {
  const unscoped = createAccess(() => undefined);
  const operations = new WeakMap<object, ProofServerAccess['provingService']>();
  return {
    circuits: unscoped.circuits,
    provingService: {
      prove: async transaction =>
        (operations.get(transaction) ?? unscoped.provingService).prove(
          transaction,
        ),
    },
    finalizeRecipe: async (facade, recipe, onProgress) => {
      const transaction =
        recipe.type === 'UNPROVEN_TRANSACTION'
          ? recipe.transaction
          : recipe.balancingTransaction;
      if (!transaction) return facade.finalizeRecipe(recipe);
      if (operations.has(transaction))
        throw new Error('This transaction is already being finalized');
      const access = onProgress
        ? createAccess(onProgress).provingService
        : unscoped.provingService;
      onProgress?.({
        type: 'phase',
        phase: 'transaction-proving',
        status: 'started',
      });
      operations.set(transaction, {
        prove: async tx => {
          const proven = await access.prove(tx);
          onProgress?.({
            type: 'phase',
            phase: 'transaction-finalizing',
            status: 'started',
          });
          return proven;
        },
      });
      try {
        return await facade.finalizeRecipe(recipe);
      } finally {
        operations.delete(transaction);
      }
    },
  };
};
