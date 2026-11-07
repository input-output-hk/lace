import { getVeriteeBundledTrustRoots } from '@lace-lib/vendor/veritee-trust-roots';
import { wasmProofActivities } from '@lace-lib/vendor/wasm-proof-backend';
// Static import keeps local proving available during MV3 install-time preload.
import { createWasmProofServerAccess } from '@lace-lib/vendor/wasm-proof-server';
import { Observable } from 'rxjs';

import { createMidnightSideEffectDependencies } from './dependencies';
import { createStoreVeriteeAttestedProver } from './veritee-attested-prover';

import type { MidnightSideEffectsDependencies } from '@lace-contract/midnight-context';
import type { LaceInitSync } from '@lace-contract/module';

// The app attests tee-delegated proof servers with the verifier library's full
// AKX pipeline against the baked Veritee deployment.
const initializeEngineDependencies = createMidnightSideEffectDependencies({
  createLocalProofServerAccess: onProgress =>
    createWasmProofServerAccess(undefined, onProgress),
  createAttestedProver: ({
    networkId,
    proofServerApiUrl,
    getLedgerIndexerUrl,
  }) =>
    createStoreVeriteeAttestedProver({
      networkId,
      proofServerApiUrl,
      getLedgerIndexerUrl,
      trustRoots: getVeriteeBundledTrustRoots(),
    }),
});

export const initializeMidnightSideEffectDependencies: LaceInitSync<
  MidnightSideEffectsDependencies
> = (props, dependencies) => ({
  ...initializeEngineDependencies(props, dependencies),
  wasmProofActivities$: new Observable(subscriber =>
    wasmProofActivities.subscribe(activities => {
      subscriber.next(activities);
    }),
  ),
  dismissWasmProofActivity: wasmProofActivities.dismiss,
});
