/**
 * An agent spending under its grant with nothing but the module's SDK
 * surface and the policy the owner exports: a jubjub passkey owner
 * creates the account and issues a capped spend grant through the real
 * flows over an Account Custody Contract executed in process, and the
 * agent then prepares the withdrawal from the policy's fields alone,
 * signs the challenge the preparation returns with its own key, and calls
 * the circuit the preparation names with the arguments it returns. The
 * contract accepts the call only when the challenge the agent signed is
 * the one its own mirror recomputes. The unshielded withdrawal is the one
 * exercised because its balance is a ledger mirror the permissionless
 * deposit credits in process.
 */
import { GrantSpendRefusedError } from '@lace-contract/passport';
import { HexBytes } from '@lace-lib/util';
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { devJubjubAuthoriser } from '../../src/acc/dev-authoriser';
import { devEncryptionKey } from '../../src/acc/dev-encryption-key';
import { JubjubDevice, randomJubjubScalar } from '../../src/acc/signer';
import { createAccount } from '../../src/flows/create-account';
import { issueGrant } from '../../src/flows/grants';
import { grantSpendAuthorisationArgs, loadGrantSpend } from '../../src/sdk';
import {
  K256_GRANTEE_SECRET,
  k256SpendScope,
  spendScope,
} from '../remote/fake-grant';

import { AccountSim } from './account-sim';

import type * as GatedCall from '../../src/acc/gated-call';
import type { GatedContractHandle } from '../../src/acc/gated-call';
import type { GrantSpendPolicy } from '../../src/acc/grant-spend';
import type {
  AccountRecords,
  FlowContext,
  PassportAccountRecord,
} from '../../src/flows/types';
import type {
  GrantSpend,
  GrantSpendCall,
  GrantSpendSignature,
} from '../../src/sdk';
import type { GrantScopeInput } from '@lace-contract/passport';

const chain = vi.hoisted(() => ({
  sim: undefined as AccountSim | undefined,
  scalar: 0n,
}));

const simulated = (): AccountSim => {
  if (!chain.sim) throw new Error('No simulated account is deployed');
  return chain.sim;
};

vi.mock('../../src/infra/indexer', () => ({
  createIndexerClient: () => ({
    queryContractState: async () => simulated().contractState(),
    enumerateContractActions: async () => [],
    queryShieldedOutputs: async () => [],
  }),
}));
vi.mock('../../src/infra/providers', () => ({
  createMidnightProviders: async () => ({}),
}));
vi.mock('../../src/acc/gated-call', async importOriginal => ({
  ...(await importOriginal<typeof GatedCall>()),
  connectAccountHandle: async (): Promise<GatedContractHandle> =>
    simulated().handle(),
}));
vi.mock('../../src/acc/deploy', () => ({
  deployAccount: async ({
    encPublicKey,
    lockAccount,
    onDeployed,
  }: {
    encPublicKey: Uint8Array;
    lockAccount: boolean;
    onDeployed: (address: string, pending: unknown) => Promise<void>;
  }) => {
    chain.sim = await AccountSim.create({
      encKey: encPublicKey,
      scalar: chain.scalar,
    });
    const address = HexBytes.fromByteArray(chain.sim.address);
    await onDeployed(address, {
      operations: [],
      lockAccount,
      verifierKeysDigest: '00'.repeat(32),
      saltHex: '00'.repeat(32),
      authorityKey: { tag: 'schnorr', value: '00' },
    });
    return {
      address,
      salt: new Uint8Array(32),
      isActivated: true,
      activate: async () => undefined,
    };
  },
  resumeAccountDeployment: async () => {
    throw new Error('No deployment is resumed here');
  },
}));

const network = {
  networkId: 'undeployed',
  indexerUrl: 'http://indexer.example.com/api/v3/graphql',
  indexerWsUrl: 'ws://indexer.example.com/api/v3/graphql/ws',
  nodeUrl: 'http://node.example.com',
  artefactUrl: 'http://artefacts.example.com/account',
};
const rpId = 'lace.io';

/** The unshielded amount deposited into the account before each case. */
const DEPOSITED = 1000n;
/** The user address every spend pays. */
const RECIPIENT = Uint8Array.from({ length: 32 }, (_, index) => index + 0x40);
/** The secret of the jubjub grantee the shared spend scope names. */
const JUBJUB_GRANTEE_SECRET = 55n;

/** A record store in memory. */
const memoryRecords = (): AccountRecords => {
  let stored: PassportAccountRecord | undefined;
  return {
    read: async () => stored,
    write: async record => {
      stored = record;
    },
    presence: async () => {
      if (!stored) return 'absent';
      return stored.deployment ? 'pending' : 'complete';
    },
  };
};

/** The owner's passkey device: a dev jubjub authoriser and encryption key. */
const owner = (): FlowContext => {
  chain.scalar = randomJubjubScalar();
  return {
    seams: {
      passportAuthoriser: devJubjubAuthoriser(chain.scalar),
      passportEncryptionKey: devEncryptionKey(),
      passportSponsor: { balanceAndSign: vi.fn() },
      passportProver: { prove: vi.fn(), check: vi.fn() },
      passportNetwork: network,
    },
    accountRecords: memoryRecords(),
    onProgress: vi.fn(),
    rpId,
  };
};

/**
 * Creates the account, issues `scope`, funds the account and returns the
 * grant's policy as it travels to the agent: the fields the policy
 * export writes from the issued grant and its opening, through JSON.
 */
const issuedPolicy = async (
  scope: GrantScopeInput,
): Promise<GrantSpendPolicy> => {
  const context = owner();
  const created = await createAccount({ lockAccount: false }, context);
  const issued = await issueGrant(
    {
      account: created.account,
      devices: created.devices,
      localUseCounter: created.localUseCounter,
      scope,
    },
    context,
  );
  const grant = issued.grants.find(record => record.id === issued.grantId);
  if (!grant?.opening) throw new Error('The issued grant has no opening');
  const { opening } = grant;
  const policy: GrantSpendPolicy = {
    account: HexBytes.fromByteArray(simulated().address),
    grantId: grant.id,
    slot: grant.slot,
    granteeScheme: opening.granteeScheme,
    granteePublicKey: opening.granteePublicKey,
    scopeSalt: opening.scopeSalt,
    color: opening.color,
    recipient: opening.recipient,
    maxCoinValue: opening.maxCoinValue,
    perCallCap: grant.scope.perCallCap,
    cap: grant.scope.cap,
    operations: grant.scope.operations,
    origin: opening.origin,
    expiresAt: grant.scope.expiresAt,
  };
  await simulated().call('deposit_unshielded', new Uint8Array(32), DEPOSITED);
  return JSON.parse(JSON.stringify(policy)) as GrantSpendPolicy;
};

/** The record the account's grants map holds for the policy's grant. */
const recordOf = (policy: GrantSpendPolicy) =>
  simulated()
    .ledger()
    .grants.lookup(Uint8Array.from(Buffer.from(policy.grantId, 'hex')));

/** An unshielded spend bound to the grant's record as the ledger holds it now. */
const unshieldedSpend = (
  policy: GrantSpendPolicy,
  { amount, spent }: { amount: bigint; spent: bigint },
): GrantSpend => {
  const record = recordOf(policy);
  return {
    operation: 'withdraw-unshielded',
    amount,
    recipient: RECIPIENT,
    issuedAt: record.issued_at,
    nonce: record.nonce,
    spent,
  };
};

/** Signs a prepared call as a wallet holding only the grantee's key would. */
const signCall = (call: GrantSpendCall): GrantSpendSignature => {
  if (call.scheme === 'secp256k1-ecdsa') {
    const { r, s } = secp256k1.Signature.fromBytes(
      secp256k1.sign(
        call.digest,
        secp256k1.Point.Fn.toBytes(K256_GRANTEE_SECRET),
        { prehash: false },
      ),
    );
    return { scheme: call.scheme, r, s };
  }
  const { sigR, sigS, grindNonce } = new JubjubDevice(
    JUBJUB_GRANTEE_SECRET,
  ).sign(call.challenge, 0n);
  return { scheme: call.scheme, sigR, sigS, grindNonce };
};

/** Prepares, signs and submits one spend, as the agent does. */
const spendWith = async (policy: GrantSpendPolicy, spend: GrantSpend) => {
  const { prepareGrantSpend } = await loadGrantSpend();
  const call = await prepareGrantSpend(policy, spend);
  await simulated().call(
    call.circuit,
    ...call.args,
    ...grantSpendAuthorisationArgs(signCall(call)),
  );
  return call;
};

/** The unshielded balance the account holds of the night colour. */
const balance = (): bigint =>
  simulated().ledger().unshielded_balances.lookup(new Uint8Array(32));

describe(
  'an agent spending under its grant from the SDK surface',
  { timeout: 60_000 },
  () => {
    beforeEach(() => {
      chain.sim = undefined;
    });

    it.each([
      ['secp256k1', k256SpendScope, 'withdraw_unshielded_with_grant_k256'],
      ['jubjub', spendScope, 'withdraw_unshielded_with_grant_jubjub'],
    ] as const)(
      'has a %s grantee spend up to its caps, each call accepted by the contract',
      async (_scheme, scope, circuit) => {
        const policy = await issuedPolicy(scope);
        const before = recordOf(policy);

        const first = await spendWith(
          policy,
          unshieldedSpend(policy, { amount: 300n, spent: 0n }),
        );
        await spendWith(
          policy,
          unshieldedSpend(policy, { amount: 150n, spent: 300n }),
        );

        expect(first.circuit).toBe(circuit);
        expect(balance()).toBe(DEPOSITED - 450n);
        expect(recordOf(policy).nonce).toBe(before.nonce + 2n);
      },
    );

    it('is refused by the contract when the challenge binds a stale record nonce', async () => {
      const policy = await issuedPolicy(k256SpendScope);
      const stale = unshieldedSpend(policy, { amount: 100n, spent: 0n });
      await spendWith(policy, stale);

      await expect(
        spendWith(policy, { ...stale, spent: 100n }),
      ).rejects.toThrow('invalid grant signature');
      expect(balance()).toBe(DEPOSITED - 100n);
    });

    it('refuses before signing a spend past a cap or outside the scope', async () => {
      const policy = await issuedPolicy(k256SpendScope);

      await expect(
        spendWith(policy, unshieldedSpend(policy, { amount: 301n, spent: 0n })),
      ).rejects.toThrow(GrantSpendRefusedError);
      await expect(
        spendWith(
          policy,
          unshieldedSpend(policy, { amount: 200n, spent: 300n }),
        ),
      ).rejects.toThrow('exceeds the cap 450');
      await expect(
        spendWith(policy, {
          ...unshieldedSpend(policy, { amount: 100n, spent: 0n }),
          operation: 'withdraw-shielded',
          changeEntry: new Uint8Array(192),
          encPublicKey: new Uint8Array(32),
          coin: {
            nonce: new Uint8Array(32),
            color: new Uint8Array(32),
            value: 100n,
            mtIndex: 0n,
          },
        }),
      ).rejects.toThrow('withdraw-shielded is not in its scope');
      expect(balance()).toBe(DEPOSITED);
    });
  },
);
