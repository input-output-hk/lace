import { WasmProver } from '@midnightntwrk/wallet-sdk/prover-client/effect';
import { provingProvider } from '@midnightntwrk/zkir-v2';
import { provingProvider as provingProviderV3 } from '@midnightntwrk/zkir-v3';

import type {
  AttestationProgressEvent,
  ProofCircuitRequest,
} from './midnight-proof-servers';
import type { ProofCircuitProvider } from './midnight-proof-servers';
import type { KeyMaterialProvider } from '@midnightntwrk/zkir-v2';

// The SDK caches downloaded wallet circuits and parameters. Share that cache
// across wallets and dApp calls for the lifetime of the engine.
const defaultKeys = {
  v8: WasmProver.makeV8KeyMaterialProvider(),
  v9: WasmProver.makeV9KeyMaterialProvider(),
};

/** Local proving with no proof-server fallback. Key downloads contain no witness. */
export const createWasmCircuitProvider = (
  keys?: KeyMaterialProvider,
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
  const createProverForCircuit = async (request: ProofCircuitRequest) => {
    const materialSource = keys ?? defaultKeys[request.ledgerVersion ?? 'v8'];
    const lookupKey: KeyMaterialProvider['lookupKey'] = async location =>
      (await loading(async () => materialSource.lookupKey(location))) ??
      (location === request.keyLocation ? request.keyMaterial : undefined);
    const material = await lookupKey(request.keyLocation);
    // Ledger epoch and circuit format are independent: v9 wallet circuits and
    // retained contracts still use v2, while Compact 0.36 contracts use v3.
    const header =
      material && new TextDecoder().decode(material.ir.subarray(0, 40));
    const createProvider = header?.startsWith('midnight:ir-source[v3')
      ? provingProviderV3
      : provingProvider;
    return createProvider({
      lookupKey: async location =>
        location === request.keyLocation ? material : lookupKey(location),
      getParams: async k => loading(async () => materialSource.getParams(k)),
    });
  };
  return {
    check: async request =>
      (await createProverForCircuit(request)).check(
        request.serializedPreimage,
        request.keyLocation,
      ),
    prove: async request =>
      (await createProverForCircuit(request)).prove(
        request.serializedPreimage,
        request.keyLocation,
        request.overwriteBindingInput,
      ),
  };
};
