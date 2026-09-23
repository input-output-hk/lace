import { describe, expect, it } from 'vitest';

import { accManifest } from '../../src/acc/manifest';

const SHA256_HEX = /^[0-9a-f]{64}$/;

describe('accManifest', () => {
  it('pins the binding version and the toolchain that produced the artefact', () => {
    expect(accManifest.bindingVersion).toBe('0.1.0-lace.1');
    expect(accManifest.toolchain).toEqual({
      compactc: '0.33.0',
      language: '0.25.0',
      runtime: '0.18.0-rc.1',
    });
  });

  it('lists the six circuits the module uses', () => {
    expect(Object.keys(accManifest.circuits).sort()).toEqual([
      'activate_initial_device_with_jubjub',
      'add_device_with_jubjub',
      'remove_device_with_jubjub',
    ]);
    expect([...accManifest.pureCircuits].sort()).toEqual([
      'compute_public_point_with_jubjub',
      'derive_boot_commitment_with_jubjub',
      'derive_device_entry_with_jubjub',
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

  it('pins distinct digests per asset and per circuit', () => {
    const digests = Object.values(accManifest.circuits).flatMap(entry => [
      entry.zkirSha256,
      entry.proverKeySha256,
      entry.verifierKeySha256,
    ]);
    expect(new Set(digests).size).toBe(digests.length);
  });
});
