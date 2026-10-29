import { describe, expect, it } from 'vitest';

import inventory from '../../src/acc/artefact-inventory.json';
import { accManifest } from '../../src/acc/manifest';

const SHA256_HEX = /^[0-9a-f]{64}$/;

describe('accManifest', () => {
  it('pins the binding version and the toolchain that produced the artefact', () => {
    expect(accManifest.bindingVersion).toBe('0.1.0-lace.2');
    expect(accManifest.toolchain).toEqual({
      compactc: '0.35.0',
      language: '0.27.0',
      runtime: '0.20.0',
    });
  });

  it('lists the device, grant and deposit circuits the module uses', () => {
    expect(Object.keys(accManifest.circuits).sort()).toEqual([
      'activate_initial_device_with_jubjub',
      'add_device_with_jubjub',
      'append_inbox_with_jubjub',
      'deposit_shielded',
      'deposit_unshielded',
      'issue_grant_with_jubjub',
      'remove_device_with_jubjub',
      'revoke_all_grants_with_jubjub',
      'revoke_grant_with_jubjub',
      'rotate_enc_key_with_jubjub',
    ]);
    expect([...accManifest.pureCircuits].sort()).toEqual([
      'compute_public_point_with_jubjub',
      'derive_boot_commitment_with_jubjub',
      'derive_device_entry_with_jubjub',
      'derive_grant_id_with_jubjub',
      'derive_grant_id_with_k256',
      'derive_grant_object_commit',
      'derive_grant_scope_digest',
    ]);
  });

  it('records 64-char lowercase hex sha256 pins for every proving circuit asset', () => {
    for (const entry of Object.values(accManifest.circuits)) {
      expect(entry.zkirSha256).toMatch(SHA256_HEX);
      expect(entry.proverKeySha256).toMatch(SHA256_HEX);
      expect(entry.verifierKeySha256).toMatch(SHA256_HEX);
    }
  });

  it('keys each proving circuit entry by its own name and key location', () => {
    for (const [name, entry] of Object.entries(accManifest.circuits)) {
      expect(entry.name).toBe(name);
      expect(entry.keyLocation).toBe(`keys/${name}`);
    }
  });

  it('pins the digests the artefact inventory records for each proving circuit', () => {
    expect(accManifest.toolchain).toEqual(inventory.toolchain);
    for (const [name, entry] of Object.entries(accManifest.circuits)) {
      const recorded =
        inventory.circuits[name as keyof typeof inventory.circuits];
      expect(entry.zkirSha256).toBe(recorded.zkir.sha256);
      expect(entry.proverKeySha256).toBe(recorded.prover.sha256);
      expect(entry.verifierKeySha256).toBe(recorded.verifier.sha256);
    }
  });

  it('pins distinct digests per asset and per circuit', () => {
    const digests = Object.values(accManifest.circuits).flatMap(entry => [
      entry.zkirSha256,
      entry.proverKeySha256,
      entry.verifierKeySha256,
    ]);
    expect(new Set(digests).size).toBe(digests.length);
  });
});
