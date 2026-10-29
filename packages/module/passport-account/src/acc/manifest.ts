import { AccBindingVersion } from '@lace-contract/passport';

/**
 * Name of an Account Custody Contract circuit this module submits proofs
 * for. Each one has downloadable ZK assets (circuit IR plus prover and
 * verifier keys) pinned in the manifest. The permissionless deposits are
 * proved by the sender, which the development deposit does from its own
 * wallet.
 */
export type AccProvingCircuitName =
  | 'activate_initial_device_with_jubjub'
  | 'add_device_with_jubjub'
  | 'append_inbox_with_jubjub'
  | 'deposit_shielded'
  | 'deposit_unshielded'
  | 'issue_grant_with_jubjub'
  | 'remove_device_with_jubjub'
  | 'revoke_all_grants_with_jubjub'
  | 'revoke_grant_with_jubjub'
  | 'rotate_enc_key_with_jubjub';

/**
 * Name of an Account Custody Contract pure circuit this module evaluates
 * locally through the generated code. Pure circuits produce no proofs and
 * ship no downloadable assets; their implementation is pinned by the
 * vendored contract module itself.
 */
export type AccPureCircuitName =
  | 'compute_public_point_with_jubjub'
  | 'derive_boot_commitment_with_jubjub'
  | 'derive_device_entry_with_jubjub'
  | 'derive_grant_id_with_jubjub'
  | 'derive_grant_id_with_k256'
  | 'derive_grant_object_commit'
  | 'derive_grant_scope_digest';

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
  bindingVersion: AccBindingVersion('0.1.0-lace.2'),
  toolchain: {
    compactc: '0.35.0',
    language: '0.27.0',
    runtime: '0.20.0',
  },
  circuits: {
    activate_initial_device_with_jubjub: {
      name: 'activate_initial_device_with_jubjub',
      keyLocation: 'keys/activate_initial_device_with_jubjub',
      zkirSha256:
        '18a73910ac9c1db1ae52a8c48abcbd891838d75206c5da48eb1338fd0db622ce',
      proverKeySha256:
        '6b9571e641ff826dd381550d14e3c445f28efad59890c1cd8a50b27a9517995a',
      verifierKeySha256:
        'b33fa139d34231f6ba1144a4ac3e947b35e679e8e91d31b554d7ff916932931e',
    },
    add_device_with_jubjub: {
      name: 'add_device_with_jubjub',
      keyLocation: 'keys/add_device_with_jubjub',
      zkirSha256:
        '7f5029b616e9be3fc37aa47d64c89b90cdb96860cec0b6e1b07ac5c7534945eb',
      proverKeySha256:
        'f109ee0aa3ea0b3cd61b70f50ab2e3f272810d29794b26de8ff458b12d36df1d',
      verifierKeySha256:
        '8bcb83e10f7ad25fc65e28f3fdb918eaf0f8755f6a0eb7416052c6153ea80408',
    },
    remove_device_with_jubjub: {
      name: 'remove_device_with_jubjub',
      keyLocation: 'keys/remove_device_with_jubjub',
      zkirSha256:
        '1a7f288bd9606663e82416fa38f6ba3aa29d3631a1b24b0879ee095cde9d337e',
      proverKeySha256:
        '1975015ef62a2eb946a9960c4d84372dfcf12ffaeb64789a8ed764cf81deef93',
      verifierKeySha256:
        '98b87b827e778a90e5012b99465b7c7cfcc00c5ee859bfbcfeec1da657698be0',
    },
    append_inbox_with_jubjub: {
      name: 'append_inbox_with_jubjub',
      keyLocation: 'keys/append_inbox_with_jubjub',
      zkirSha256:
        '5f3085f9669fbc3ce6eba0aaacd8fa1fd3cb9ccdacbb1210955c9a736a192c56',
      proverKeySha256:
        '6dff5362bd05631680267d83cdab67b5506597a7c851d6053cafa5332225c3e5',
      verifierKeySha256:
        'c7b4858b558b2d53ba36567ae2ff27f9f855593ad8910ebaf60f84b10d9bf601',
    },
    rotate_enc_key_with_jubjub: {
      name: 'rotate_enc_key_with_jubjub',
      keyLocation: 'keys/rotate_enc_key_with_jubjub',
      zkirSha256:
        '6dbbbdf1d7a82c04ede1104a0e21b9685c821217ced445033c8c25d62ce79fec',
      proverKeySha256:
        '659e1c4830023cee599a696fd4037f9a77dbac082eca35b490e84833b8b88be5',
      verifierKeySha256:
        '15238b09168c63a597c7d47cfe3b732fa126257bdf6b0558229d98feb5cb2322',
    },
    deposit_shielded: {
      name: 'deposit_shielded',
      keyLocation: 'keys/deposit_shielded',
      zkirSha256:
        'e61e8dd6f86999518f5d9dfe5d09f63c172f989e8eed3ccf5d90e43a7ab81951',
      proverKeySha256:
        '0c63768a2206101b86d8bfc49f7a55d3cdd230afa6a28f61964f160082a519cb',
      verifierKeySha256:
        '18caf9ffc1ea3271c340f97ee5433598b796a64fadcc1fb7bb5c65868574d328',
    },
    deposit_unshielded: {
      name: 'deposit_unshielded',
      keyLocation: 'keys/deposit_unshielded',
      zkirSha256:
        'b64d5d0243053a4b383493835a3a2412e09c89248d351076c5097f528eb7e2f8',
      proverKeySha256:
        'd8409e37efa3f142a8c9fb44a7a4c25397312317f9cf28f1243c1bba887f56a3',
      verifierKeySha256:
        'bb4421a5909564377d15f0756299bef99740089b842e8d9796ad2d3d75831de9',
    },
    issue_grant_with_jubjub: {
      name: 'issue_grant_with_jubjub',
      keyLocation: 'keys/issue_grant_with_jubjub',
      zkirSha256:
        '19887b86c759417a93ff30f90830e479ef987f5df2785a2ff9f42668cf8b0a99',
      proverKeySha256:
        'd21b34197c0db7ea29626faa3b5d65e959c67fd3d1e28b450f5cb3515ede67a0',
      verifierKeySha256:
        '008fa78514089341d53ead256a5f8878eb630d3f60741f3bc6bd34d41a84b2f7',
    },
    revoke_grant_with_jubjub: {
      name: 'revoke_grant_with_jubjub',
      keyLocation: 'keys/revoke_grant_with_jubjub',
      zkirSha256:
        '5bd4be3866cc3ecd94dbebb041813ecb3d9612f2de67b5f6fc4dc614303cdd0a',
      proverKeySha256:
        '882036c4b1086fea1f402bbc9efb308d5387d1a63e92a7bab30f4b93c3e74883',
      verifierKeySha256:
        '2acbb4bf271df28b6fb6ed20d931a10a51975d661dd917b8855c41f8dffac289',
    },
    revoke_all_grants_with_jubjub: {
      name: 'revoke_all_grants_with_jubjub',
      keyLocation: 'keys/revoke_all_grants_with_jubjub',
      zkirSha256:
        'bf4cde37c13b4a36cac999909154703cf2c05259c88f8b8cfe073cb49e60ce38',
      proverKeySha256:
        '41b2ceb329c890fc29baafc3d9d3bf65276f4d14ea12451b1b368768e046bf66',
      verifierKeySha256:
        'acf69db5f77b0663f995bbd91a752b4a8be80f89d1a5ea6132d890648a532610',
    },
  },
  pureCircuits: [
    'compute_public_point_with_jubjub',
    'derive_boot_commitment_with_jubjub',
    'derive_device_entry_with_jubjub',
    'derive_grant_id_with_jubjub',
    'derive_grant_id_with_k256',
    'derive_grant_object_commit',
    'derive_grant_scope_digest',
  ],
};
