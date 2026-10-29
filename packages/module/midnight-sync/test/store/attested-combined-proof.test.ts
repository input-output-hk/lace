import { executeCircuit } from '@lace-lib/midnight-prover';
import { expect, it, vi } from 'vitest';

import { createAttestedProofServerAccess } from '../../src/store/attested-proving-service';

import type * as ledger from '@midnight-ntwrk/ledger-v8';

// Exercise routing and session ownership without requiring a real circuit fixture.
vi.mock('@midnight-ntwrk/ledger-v8', async importOriginal => ({
  ...(await importOriginal<typeof ledger>()),
  createProvingPayload: (preimage: Uint8Array) => preimage,
  createCheckPayload: (preimage: Uint8Array) => preimage,
}));

it('proves through a prove-only attested channel while explicit check remains unsupported', async () => {
  const prove = vi.fn(async (payload: Uint8Array) => payload);
  const close = vi.fn(async () => undefined);
  const establishAttestedSession = vi.fn(async () => ({ prove, close }));
  const access = createAttestedProofServerAccess(
    {
      id: 'temenos',
      phases: ['evidence'],
      operations: ['prove'],
      establishAttestedSession,
    },
    () => undefined,
  );
  const circuit = {
    serializedPreimage: new Uint8Array([1]),
    keyLocation: 'fixture',
  };
  await expect(
    executeCircuit(access.circuits, { method: 'checkAndProve', circuit }),
  ).resolves.toEqual(circuit.serializedPreimage);
  expect(establishAttestedSession).toHaveBeenCalledTimes(1);
  expect(prove).toHaveBeenCalledTimes(1);
  expect(close).toHaveBeenCalledTimes(1);
  await expect(access.circuits.check(circuit)).rejects.toThrow(
    '/check is not available',
  );
  expect(establishAttestedSession).toHaveBeenCalledTimes(1);
});

it('does not bypass attestation when a combined proof fails to establish a session', async () => {
  const access = createAttestedProofServerAccess(
    {
      id: 'temenos',
      phases: ['evidence'],
      operations: ['prove'],
      establishAttestedSession: async () => {
        throw new Error('Attestation rejected');
      },
    },
    () => undefined,
  );
  await expect(
    executeCircuit(access.circuits, {
      method: 'checkAndProve',
      circuit: {
        serializedPreimage: new Uint8Array([1]),
        keyLocation: 'fixture',
      },
    }),
  ).rejects.toThrow('Attestation rejected');
});
