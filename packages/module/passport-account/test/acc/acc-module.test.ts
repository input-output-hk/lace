import { describe, expect, it } from 'vitest';

import {
  Contract,
  expectedVk,
  ledger,
  pureCircuits,
} from '../../src/acc/acc-module';
import { accManifest } from '../../src/acc/manifest';

describe('acc-module', () => {
  it('exposes the generated Contract constructor and ledger decoder', () => {
    expect(typeof Contract).toBe('function');
    expect(typeof ledger).toBe('function');
  });

  it('pins a verifier key digest per impure circuit, matching the manifest for proving circuits', () => {
    for (const digest of Object.values(expectedVk)) {
      expect(digest).toMatch(/^[0-9a-f]{64}$/);
    }
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
