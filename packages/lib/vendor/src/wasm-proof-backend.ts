import { createProofActivityStore } from '@lace-lib/midnight-prover';

import type {
  AttestationProgressEvent,
  ProofCircuitProvider,
} from './midnight-proof-servers';
import type { ProofJobObserver } from '@lace-lib/midnight-prover';

export type { ProofActivity } from '@lace-lib/midnight-prover';
export const wasmProofActivities = createProofActivityStore();

// Keep registration free of runtime SDK imports: their async initialization
// would defer the service worker's install listener beyond initial evaluation.
// eslint-disable-next-line functional/no-let
let factory:
  | ((
      onProgress?: (event: AttestationProgressEvent) => void,
      onJobChange?: ProofJobObserver,
    ) => ProofCircuitProvider)
  | undefined;

export const configureWasmProver = (
  createProvider: NonNullable<typeof factory>,
): void => {
  factory = createProvider;
};

export const createConfiguredWasmProver = (
  onProgress?: (event: AttestationProgressEvent) => void,
  onJobChange?: ProofJobObserver,
): ProofCircuitProvider => {
  if (!factory) throw new Error('The local proof worker is not configured');
  return factory(onProgress, onJobChange);
};
