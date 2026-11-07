import { AMD_ROOT_CERTIFICATES } from '@input-output-hk/veritee-attestation-verifier';

import type { VeriteeTrustRoots } from './veritee-attested-prover';

/**
 * Current root source: the reviewed, version-pinned Veritee package. Called
 * at composition time, never by the verifier adapter. A future trust store
 * can replace this source without changing the adapter or Wallet Facade.
 * This does not fetch roots from a server or implement trust-store policy.
 */
export const getVeriteeBundledTrustRoots = (): VeriteeTrustRoots => ({
  amdRootCertificates: [...AMD_ROOT_CERTIFICATES],
});
