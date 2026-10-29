import { provingProvider } from '@midnight-ntwrk/zkir-v2';
import { WasmProver } from '@midnightntwrk/wallet-sdk/prover-client/effect';

import type {
  AttestationProgressEvent,
  ProofCircuitRequest,
} from './midnight-proof-servers';
import type { ProofCircuitProvider } from './midnight-proof-servers';
import type { KeyMaterialProvider } from '@midnight-ntwrk/zkir-v2';

// The SDK caches downloaded wallet circuits and parameters. Share that cache
// across wallets and dApp calls for the lifetime of the engine.
const defaultKeys = WasmProver.makeDefaultKeyMaterialProvider();

/** Local proving with no proof-server fallback. Key downloads contain no witness. */
export const createWasmCircuitProvider = (
  keys: KeyMaterialProvider = defaultKeys,
  onProgress?: (event: AttestationProgressEvent) => void,
): ProofCircuitProvider => {
  const loading = async <T>(load: () => Promise<T>): Promise<T> => {
    onProgress?.({ type: 'phase', phase: 'proof-material', status: 'started' });
    try {
      return await load();
    } finally {
      onProgress?.({
        type: 'phase',
        phase: 'proof-material',
        status: 'completed',
      });
    }
  };
  const forCircuit = (request: ProofCircuitRequest) =>
    provingProvider({
      // Material belongs to this one call. Never cache a dApp's circuit under
      // a name that another origin (or a built-in wallet circuit) could reuse.
      lookupKey: async location =>
        (await loading(async () => keys.lookupKey(location))) ??
        (location === request.keyLocation ? request.keyMaterial : undefined),
      getParams: async k => loading(async () => keys.getParams(k)),
    });
  return {
    check: async request =>
      forCircuit(request).check(
        request.serializedPreimage,
        request.keyLocation,
      ),
    prove: async request =>
      forCircuit(request).prove(
        request.serializedPreimage,
        request.keyLocation,
        request.overwriteBindingInput,
      ),
  };
};
