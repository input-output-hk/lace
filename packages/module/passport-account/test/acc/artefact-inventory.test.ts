import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { buildInventory } from '../../scripts/inventory-artefacts.mjs';
import inventory from '../../src/acc/artefact-inventory.json';
import { accManifest } from '../../src/acc/manifest';

import type { ArtefactDigest } from '../../scripts/inventory-artefacts.mjs';

const SHA256_HEX = /^[0-9a-f]{64}$/;
const ARTEFACTS = ['zkir', 'prover', 'verifier'] as const;

const sha256Hex = (bytes: Uint8Array): string =>
  createHash('sha256').update(bytes).digest('hex');

const digest = (bytes: Uint8Array): ArtefactDigest => ({
  bytes: bytes.byteLength,
  sha256: sha256Hex(bytes),
});

const toolchain = { compactc: '0.35.0', language: '0.27.0', runtime: '0.20.0' };
const commit = 'd3152081c35bb151d8fbf4fdfced0e23afa256a2';

describe('artefact-inventory.json', () => {
  it('pins the upstream contract build the bundle was compiled from', () => {
    expect(inventory.repository).toBe(
      'https://github.com/midnightntwrk/passport',
    );
    expect(inventory.contract).toBe('contract/contracts/account.compact');
    expect(inventory.commit).toBe(commit);
    expect(inventory.toolchain).toEqual(toolchain);
  });

  it('lists the 52 circuits once each, sorted by name', () => {
    const names = Object.keys(inventory.circuits);
    expect(names).toHaveLength(52);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toEqual([...names].sort());
  });

  it('records a positive byte size and a sha256 pin for all three artefacts of every circuit', () => {
    for (const entry of Object.values(inventory.circuits)) {
      expect(Object.keys(entry)).toEqual(ARTEFACTS);
      for (const artefact of ARTEFACTS) {
        expect(Number.isInteger(entry[artefact].bytes)).toBe(true);
        expect(entry[artefact].bytes).toBeGreaterThan(0);
        expect(entry[artefact].sha256).toMatch(SHA256_HEX);
      }
    }
  });

  it('pins a distinct digest per file', () => {
    const digests = Object.values(inventory.circuits).flatMap(entry =>
      ARTEFACTS.map(artefact => entry[artefact].sha256),
    );
    expect(new Set(digests).size).toBe(digests.length);
  });

  it('covers every proving circuit the manifest pins', () => {
    for (const name of Object.keys(accManifest.circuits)) {
      expect(inventory.circuits).toHaveProperty(name);
    }
  });

  it('matches the verifier key sizes measured upstream', () => {
    const circuits: Record<string, { verifier: ArtefactDigest }> =
      inventory.circuits;
    for (const [name, entry] of Object.entries(circuits)) {
      if (name.endsWith('jubjub')) expect(entry.verifier.bytes).toBe(2313);
    }
    expect(circuits.deposit_unshielded.verifier.bytes).toBe(1353);
    expect(circuits.deposit_shielded.verifier.bytes).toBe(2121);
    expect(circuits.recover_finalise.verifier.bytes).toBe(1593);
  });
});

describe('buildInventory', () => {
  const files = {
    'keys/add_device_with_jubjub.verifier': new Uint8Array([8, 9]),
    'zkir/add_device_with_jubjub.bzkir': new Uint8Array([1, 2, 3]),
    'keys/activate_initial_device_with_jubjub.prover': new Uint8Array([4]),
    'keys/add_device_with_jubjub.prover': new Uint8Array([4, 5, 6, 7]),
    'zkir/activate_initial_device_with_jubjub.bzkir': new Uint8Array([1]),
    'keys/activate_initial_device_with_jubjub.verifier': new Uint8Array([8]),
  };

  const digests = (bytesByPath: Record<string, Uint8Array>) =>
    Object.fromEntries(
      Object.entries(bytesByPath).map(([file, bytes]) => [file, digest(bytes)]),
    );

  it('groups the digests of an in-memory file map by circuit, sorted by name', () => {
    expect(
      buildInventory({ commit, toolchain, digests: digests(files) }),
    ).toEqual({
      repository: 'https://github.com/midnightntwrk/passport',
      contract: 'contract/contracts/account.compact',
      commit,
      toolchain,
      circuits: {
        activate_initial_device_with_jubjub: {
          zkir: digest(new Uint8Array([1])),
          prover: digest(new Uint8Array([4])),
          verifier: digest(new Uint8Array([8])),
        },
        add_device_with_jubjub: {
          zkir: digest(new Uint8Array([1, 2, 3])),
          prover: digest(new Uint8Array([4, 5, 6, 7])),
          verifier: digest(new Uint8Array([8, 9])),
        },
      },
    });
  });

  it('refuses a circuit missing one of its three artefacts', () => {
    const { 'keys/add_device_with_jubjub.prover': _, ...incomplete } = files;

    expect(() =>
      buildInventory({ commit, toolchain, digests: digests(incomplete) }),
    ).toThrow('Circuit add_device_with_jubjub has no prover artefact');
  });

  it('refuses a key whose circuit has no circuit IR', () => {
    const stray = {
      ...files,
      'keys/remove_device_with_jubjub.verifier': new Uint8Array([2]),
    };

    expect(() =>
      buildInventory({ commit, toolchain, digests: digests(stray) }),
    ).toThrow('Circuit remove_device_with_jubjub has no zkir artefact');
  });

  it('refuses a path outside the bundle layout', () => {
    const stray = {
      ...files,
      'zkir/add_device_with_jubjub.zkir': new Uint8Array([2]),
    };

    expect(() =>
      buildInventory({ commit, toolchain, digests: digests(stray) }),
    ).toThrow('Not an artefact path: zkir/add_device_with_jubjub.zkir');
  });
});
