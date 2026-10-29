import { describe, expect, it } from 'vitest';

import {
  Contract,
  expectedVk,
  ledger,
  pureCircuits,
} from '../../src/acc/acc-module';
import inventory from '../../src/acc/artefact-inventory.json';
import { accManifest } from '../../src/acc/manifest';

const circuits: Record<string, { verifier: { sha256: string } }> =
  inventory.circuits;

describe('acc-module', () => {
  it('exposes the generated Contract constructor and ledger decoder', () => {
    expect(typeof Contract).toBe('function');
    expect(typeof ledger).toBe('function');
  });

  it('pins a verifier key digest for exactly the circuits of the artefact inventory', () => {
    expect(Object.keys(expectedVk).sort()).toEqual(
      Object.keys(circuits).sort(),
    );
  });

  it.each(Object.entries(circuits))(
    'pins the inventory verifier key digest for %s',
    (name, entry) => {
      expect(expectedVk[name]).toBe(entry.verifier.sha256);
    },
  );

  it('matches the manifest for proving circuits', () => {
    for (const entry of Object.values(accManifest.circuits)) {
      expect(expectedVk[entry.name]).toBe(entry.verifierKeySha256);
    }
  });

  it('computes the public point for a known jubjub scalar', () => {
    const point = pureCircuits.compute_public_point_with_jubjub(7n);

    expect(typeof point.x).toBe('bigint');
    expect(typeof point.y).toBe('bigint');
    expect(point.x).not.toBe(0n);
    expect(point.y).not.toBe(0n);
  });

  it('derives public points deterministically and per scalar', () => {
    const first = pureCircuits.compute_public_point_with_jubjub(7n);
    const again = pureCircuits.compute_public_point_with_jubjub(7n);
    const other = pureCircuits.compute_public_point_with_jubjub(8n);

    expect(again).toEqual(first);
    expect(other).not.toEqual(first);
  });
});
