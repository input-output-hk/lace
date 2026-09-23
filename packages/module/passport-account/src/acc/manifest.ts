import { AccBindingVersion } from '@lace-contract/passport';

/**
 * Name of an Account Custody Contract circuit this module submits proofs
 * for. Each one has downloadable ZK assets (circuit IR plus prover and
 * verifier keys) pinned in the manifest.
 */
export type AccProvingCircuitName =
  | 'activate_initial_device_with_jubjub'
  | 'add_device_with_jubjub'
  | 'remove_device_with_jubjub';

/**
 * Name of an Account Custody Contract pure circuit this module evaluates
 * locally through the generated code. Pure circuits produce no proofs and
 * ship no downloadable assets; their implementation is pinned by the
 * vendored contract module itself.
 */
export type AccPureCircuitName =
  | 'compute_public_point_with_jubjub'
  | 'derive_boot_commitment_with_jubjub'
  | 'derive_device_entry_with_jubjub';

/**
 * Integrity record for one proving circuit's downloadable ZK assets.
 * `keyLocation` is the artefact-root-relative path prefix of the key
 * files (`<keyLocation>.prover` and `<keyLocation>.verifier`); the
 * circuit IR lives at `zkir/<name>.bzkir`. Each sha256 is the lowercase
 * hex digest of the exact bytes the compiler emitted, so any tampered or
 * mismatched download can be rejected before it reaches the prover.
 */
export type AccCircuitManifestEntry = {
  name: AccProvingCircuitName;
  keyLocation: string;
  zkirSha256: string;
  proverKeySha256: string;
  verifierKeySha256: string;
};

/**
 * Compile-time description of the Account Custody Contract binding: which
 * compiled artefact this module was built against, the toolchain that
 * produced it, and the integrity pins for every circuit the module uses.
 */
export type AccManifest = {
  bindingVersion: AccBindingVersion;
  toolchain: Record<string, string>;
  circuits: Record<AccProvingCircuitName, AccCircuitManifestEntry>;
  pureCircuits: readonly AccPureCircuitName[];
};

/**
 * The manifest of the vendored Account Custody Contract artefact. Hashes
 * are sha256 digests of the artefact files emitted by the compile that
 * produced `src/acc/generated`; the verifier key digests equal the
 * `expectedVk` table embedded in the generated module.
 */
export const accManifest: AccManifest = {
  bindingVersion: AccBindingVersion('0.1.0-lace.1'),
  toolchain: {
    compactc: '0.33.0',
    language: '0.25.0',
    runtime: '0.18.0-rc.1',
  },
  circuits: {
    activate_initial_device_with_jubjub: {
      name: 'activate_initial_device_with_jubjub',
      keyLocation: 'keys/activate_initial_device_with_jubjub',
      zkirSha256:
        'e85bba43e8d272a2001fe4b54b7916f14a3ea81202909bb3c41a2328bce8bb19',
      proverKeySha256:
        '9e145ee8960e63928c369de99edf1c2e789a3f04f3a650e43338cdc641092a24',
      verifierKeySha256:
        '61b72fb8e457f3fff7e1a2fb2f1e6b5a1fd25400e63f5eb7ed8f4ba1d07ee2a3',
    },
    add_device_with_jubjub: {
      name: 'add_device_with_jubjub',
      keyLocation: 'keys/add_device_with_jubjub',
      zkirSha256:
        '05b207321e31ed579bdb4593a762c637777db39757101c886320289a40c4a2ce',
      proverKeySha256:
        '57b6213dd87873b8f9ce28f2032241428443686a3f1877b167dadc9a80102b45',
      verifierKeySha256:
        'c8697688038a558f96bc58ca4fa22929f58a97165e8149df73d52e3b3f27d239',
    },
    remove_device_with_jubjub: {
      name: 'remove_device_with_jubjub',
      keyLocation: 'keys/remove_device_with_jubjub',
      zkirSha256:
        'e18aa355ea1101285866b10b672ba9e3455e1dd074a7372414325ebfdf31f3fd',
      proverKeySha256:
        '0ca9508379e2582850f13cf23bc0bfb3f2c655b3e2993cacb8ef8bca13b667c6',
      verifierKeySha256:
        '9fd6161248d0f6e5b998ff0e837159f6b293cd4d000139845037a5afd208c804',
    },
  },
  pureCircuits: [
    'compute_public_point_with_jubjub',
    'derive_boot_commitment_with_jubjub',
    'derive_device_entry_with_jubjub',
  ],
};
