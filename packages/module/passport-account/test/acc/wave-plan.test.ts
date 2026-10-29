import { AuthorityRetiredError } from '@lace-contract/passport';
import { describe, expect, it } from 'vitest';

import {
  planDeployWaves,
  planInstallWaves,
  planResumeWaves,
} from '../../src/acc/wave-plan';

import type { DeployWave } from '../../src/acc/wave-plan';

/** Verifier key sizes measured from the vendored artefacts, in bytes. */
const JUBJUB_KEY_BYTES = 2313;
const DEPOSIT_UNSHIELDED_KEY_BYTES = 1353;
const DEPOSIT_SHIELDED_KEY_BYTES = 2121;
const K256_GRANT_KEY_BYTES = 2745;

const DEVICE_CIRCUITS = [
  'activate_initial_device',
  'withdraw_unshielded',
  'append_inbox',
  'withdraw_shielded',
  'withdraw_shielded_to_contract',
  'rotate_enc_key',
  'add_device',
  'remove_device',
].map(base => `${base}_with_jubjub`);

const GRANT_CIRCUITS = [
  'issue_grant_with_jubjub',
  'revoke_grant_with_jubjub',
  'revoke_all_grants_with_jubjub',
  'withdraw_unshielded_with_grant_jubjub',
  'withdraw_shielded_with_grant_jubjub',
  'withdraw_shielded_to_contract_with_grant_jubjub',
  'withdraw_unshielded_with_grant_k256',
  'withdraw_shielded_with_grant_k256',
  'withdraw_shielded_to_contract_with_grant_k256',
];

const ROSTER = [
  'deposit_unshielded',
  'deposit_shielded',
  ...DEVICE_CIRCUITS,
  ...GRANT_CIRCUITS,
];

const sizeOf = (operation: string): number => {
  if (operation === 'deposit_unshielded') return DEPOSIT_UNSHIELDED_KEY_BYTES;
  if (operation === 'deposit_shielded') return DEPOSIT_SHIELDED_KEY_BYTES;
  if (operation.endsWith('_with_grant_k256')) return K256_GRANT_KEY_BYTES;
  return JUBJUB_KEY_BYTES;
};

const sizes = new Map(ROSTER.map(operation => [operation, sizeOf(operation)]));

const operationsOf = (waves: DeployWave[]): string[][] =>
  waves.map(wave => wave.operations);

describe('planDeployWaves', () => {
  it('packs the 19 operation roster into four waves under the 15,000 byte budget', () => {
    const waves = planDeployWaves(ROSTER, sizes);

    expect(waves.map(wave => wave.kind)).toEqual([
      'deploy',
      'maintenance',
      'maintenance',
      'maintenance',
    ]);
    expect(operationsOf(waves)).toEqual([
      ROSTER.slice(0, 6),
      ROSTER.slice(6, 12),
      ROSTER.slice(12, 18),
      ROSTER.slice(18),
    ]);
    expect(waves.map(wave => wave.verifierBytes)).toEqual([
      12_726, 13_878, 14_742, 2745,
    ]);
    for (const wave of waves) {
      expect(wave.verifierBytes).toBeLessThanOrEqual(15_000);
    }
    expect(waves.flatMap(wave => wave.operations)).toEqual(ROSTER);
    expect(waves.reduce((total, wave) => total + wave.verifierBytes, 0)).toBe(
      44_091,
    );
  });

  it('keeps the roster order, so the activation circuit lands in the deploy', () => {
    const [deploy] = planDeployWaves(ROSTER, sizes);

    expect(deploy.operations).toContain('activate_initial_device_with_jubjub');
  });

  it('is deterministic for a given roster and key set', () => {
    const first = planDeployWaves(ROSTER, sizes);
    const second = planDeployWaves(ROSTER, sizes);

    expect(second).toEqual(first);
  });

  it('replaces the authority in the last maintenance wave only', () => {
    const waves = planDeployWaves(ROSTER, sizes);

    expect(waves.map(wave => wave.replacesAuthority)).toEqual([
      false,
      false,
      false,
      true,
    ]);
  });

  it('follows a roster within the budget with a replace-only wave, since the deploy cannot replace the authority it mints', () => {
    const roster = ROSTER.slice(0, 6);

    const waves = planDeployWaves(roster, sizes);

    expect(waves).toEqual([
      {
        kind: 'deploy',
        operations: roster,
        verifierBytes: 12_726,
        replacesAuthority: false,
      },
      {
        kind: 'maintenance',
        operations: [],
        verifierBytes: 0,
        replacesAuthority: true,
      },
    ]);
  });

  it('starts a new wave when the next key would exceed the budget exactly by one byte', () => {
    const roster = ['a', 'b', 'c'];
    const exact = new Map([
      ['a', 10],
      ['b', 5],
      ['c', 1],
    ]);

    expect(
      operationsOf(planDeployWaves(roster, exact, { budget: 15 })),
    ).toEqual([['a', 'b'], ['c']]);
    expect(
      operationsOf(planDeployWaves(roster, exact, { budget: 14 })),
    ).toEqual([['a'], ['b', 'c']]);
  });

  it('refuses a verifier key larger than the budget', () => {
    expect(() => planDeployWaves(ROSTER, sizes, { budget: 2000 })).toThrow(
      "The verifier key of 'deposit_shielded' (2121 bytes) exceeds the 2000 byte wave budget",
    );
  });

  it('refuses an operation with no measured key size', () => {
    expect(() =>
      planDeployWaves([...ROSTER, 'recover_submit'], sizes, {}),
    ).toThrow("No verifier key size for operation 'recover_submit'");
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'refuses the budget %s',
    budget => {
      expect(() => planDeployWaves(ROSTER, sizes, { budget })).toThrow(
        'The verifier byte budget must be a positive number',
      );
    },
  );

  it('refuses an empty roster', () => {
    expect(() => planDeployWaves([], sizes)).toThrow(
      'A deployment needs at least one operation',
    );
  });
});

describe('planResumeWaves', () => {
  it('packs the operations the chain lacks into maintenance waves', () => {
    const waves = planResumeWaves({
      operations: ROSTER,
      sizes,
      installed: ROSTER.slice(0, 6),
      isAuthorityReplaced: false,
    });

    expect(waves.map(wave => wave.kind)).toEqual([
      'maintenance',
      'maintenance',
      'maintenance',
    ]);
    expect(operationsOf(waves)).toEqual([
      ROSTER.slice(6, 12),
      ROSTER.slice(12, 18),
      ROSTER.slice(18),
    ]);
    expect(waves.map(wave => wave.replacesAuthority)).toEqual([
      false,
      false,
      true,
    ]);
  });

  it('repacks from the installed set, so a wave that landed is never sent twice', () => {
    const waves = planResumeWaves({
      operations: ROSTER,
      sizes,
      installed: ROSTER.slice(0, 12),
      isAuthorityReplaced: false,
    });

    expect(operationsOf(waves)).toEqual([
      ROSTER.slice(12, 18),
      ROSTER.slice(18),
    ]);
    expect(waves.map(wave => wave.replacesAuthority)).toEqual([false, true]);
  });

  it('ignores the order and extras of the installed set', () => {
    const waves = planResumeWaves({
      operations: ROSTER,
      sizes,
      installed: [...ROSTER.slice(0, 6)].reverse().concat('recover_submit'),
      isAuthorityReplaced: false,
    });

    expect(waves.flatMap(wave => wave.operations)).toEqual(ROSTER.slice(6));
  });

  it('plans a replace-only wave when every operation is in but the authority is still the deploy-time one', () => {
    const waves = planResumeWaves({
      operations: ROSTER,
      sizes,
      installed: ROSTER,
      isAuthorityReplaced: false,
    });

    expect(waves).toEqual([
      {
        kind: 'maintenance',
        operations: [],
        verifierBytes: 0,
        replacesAuthority: true,
      },
    ]);
  });

  it('plans nothing when every operation is in and the authority is already replaced', () => {
    expect(
      planResumeWaves({
        operations: ROSTER,
        sizes,
        installed: ROSTER,
        isAuthorityReplaced: true,
      }),
    ).toEqual([]);
  });

  it('rejects with AuthorityRetiredError when operations are missing and nothing can install them', () => {
    expect(() =>
      planResumeWaves({
        operations: ROSTER,
        sizes,
        installed: ROSTER.slice(0, 12),
        isAuthorityReplaced: true,
      }),
    ).toThrow(
      new AuthorityRetiredError(
        `The deploy-time maintenance authority is replaced and 7 operations are not installed: ${ROSTER.slice(
          12,
        ).join(', ')}`,
      ),
    );
  });

  it('refuses a missing operation whose key exceeds the budget', () => {
    expect(() =>
      planResumeWaves({
        operations: ROSTER,
        sizes,
        installed: ROSTER.slice(0, 6),
        isAuthorityReplaced: false,
        budget: 2000,
      }),
    ).toThrow('exceeds the 2000 byte wave budget');
  });
});

describe('planInstallWaves', () => {
  it('installs the three secp256k1 grantee withdrawals in one wave that keeps the authority', () => {
    const missing = GRANT_CIRCUITS.slice(-3);

    expect(planInstallWaves(missing, sizes)).toEqual([
      {
        kind: 'maintenance',
        operations: missing,
        verifierBytes: 3 * K256_GRANT_KEY_BYTES,
        replacesAuthority: false,
      },
    ]);
  });

  it('splits many operations into budgeted waves in the order given', () => {
    const waves = planInstallWaves(GRANT_CIRCUITS, sizes);

    expect(waves.length).toBeGreaterThan(1);
    expect(waves.flatMap(wave => wave.operations)).toEqual(GRANT_CIRCUITS);
    for (const wave of waves) {
      expect(wave.kind).toBe('maintenance');
      expect(wave.replacesAuthority).toBe(false);
      expect(wave.verifierBytes).toBeLessThanOrEqual(15_000);
    }
  });

  it('plans nothing for nothing to install', () => {
    expect(planInstallWaves([], sizes)).toEqual([]);
  });

  it('refuses an operation whose key exceeds the budget', () => {
    expect(() =>
      planInstallWaves(GRANT_CIRCUITS.slice(-1), sizes, { budget: 2000 }),
    ).toThrow('exceeds the 2000 byte wave budget');
  });
});
