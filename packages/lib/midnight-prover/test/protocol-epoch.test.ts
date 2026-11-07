import { describe, expect, it, vi } from 'vitest';

import { decodeRequest, encodeRequest } from '../src/protocol';

import type { WireRequest } from '../src/protocol';

describe('proof protocol ledger generation', () => {
  it.each([undefined, 'v8', 'v9'] as const)(
    'round trips %s through the JSON worker bridge',
    async ledgerVersion => {
      const preimage = new Uint8Array([1, 2]);
      const circuit = {
        serializedPreimage: preimage,
        keyLocation: 'midnight/zswap/output',
        ...(ledgerVersion ? { ledgerVersion } : {}),
      };
      const encoded = await encodeRequest(
        { method: 'prove', circuit },
        async () => ({ id: 'fixture', size: 2, digest: 'fixture-digest' }),
      );
      const wire = JSON.parse(JSON.stringify(encoded)) as WireRequest;
      expect(decodeRequest(wire, () => [preimage])).toEqual({
        method: 'prove',
        circuit,
      });
    },
  );

  it('rejects unknown ledger generations before pinning witness buffers', () => {
    const pin = vi.fn();
    const wire = {
      method: 'prove',
      circuit: {
        keyLocation: 'circuit',
        ledgerVersion: 'v10',
        serializedPreimage: { id: 'fixture', size: 2, digest: 'fixture' },
      },
    } as unknown as WireRequest;
    expect(() => decodeRequest(wire, pin)).toThrow(
      'Unsupported circuit ledger version',
    );
    expect(pin).not.toHaveBeenCalled();
  });
});
