/**
 * A secp256k1 grantee spending end to end: a jubjub passkey owner creates
 * the account and issues a spend grant through the real flows over an
 * Account Custody Contract executed in process, and the grantee then acts
 * outside the module as a wallet that only signs raw 32-byte hashes would:
 * it rebuilds the challenge with the contract's pure circuit, ECDSA-signs
 * SHA-256 of it as a prehash and calls the k256 grant withdrawal itself.
 * Only the network infrastructure is stood in for, as in the account keys
 * sim. The unshielded withdrawal is the one exercised because its balance
 * is a ledger mirror the permissionless deposit credits in process, while
 * the shielded twins need a held coin the simulated witness serves only to
 * the device withdrawal.
 */
import { sha256 } from '@lace-lib/crypto';
import { ByteArray, HexBytes } from '@lace-lib/util';
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { pureCircuits } from '../../src/acc/acc-module';
import { devJubjubAuthoriser } from '../../src/acc/dev-authoriser';
import { devEncryptionKey } from '../../src/acc/dev-encryption-key';
import { originHash } from '../../src/acc/grants';
import { randomJubjubScalar } from '../../src/acc/signer';
import { createAccount } from '../../src/flows/create-account';
import { issueGrant } from '../../src/flows/grants';
import { K256_GRANTEE_SECRET, k256SpendScope } from '../remote/fake-grant';

import { AccountSim } from './account-sim';

import type * as GatedCall from '../../src/acc/gated-call';
import type { GatedContractHandle } from '../../src/acc/gated-call';
import type {
  AccountRecords,
  FlowContext,
  PassportAccountRecord,
} from '../../src/flows/types';
import type { Secp256k1Point } from '@midnight-ntwrk/compact-runtime';

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
    queryShieldedEvents: async () => ({ outputs: [], nullifiers: [] }),
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
      handoverAuthority: { tag: 'schnorr', value: 'cd'.repeat(32) },
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

/** The envelope a plain ECDSA signature over SHA-256 of the challenge stands under. */
const ENVELOPE_NONE = 0n;
/** The dApp connector envelope, which the contract admits for no spend grant. */
const ENVELOPE_CONNECTOR = 1n;
/** Recipient kind 0: the grant pins no recipient. */
const RECIPIENT_ANY = 0n;
/** The unshielded amount deposited into the account before each case. */
const DEPOSITED = 1000n;
/** A secp256k1 secret that no grant was issued to. */
const FOREIGN_SECRET = 0xf0e1_9a11n;
/** The magic prefix Bitcoin message signing puts before the message. */
const BITCOIN_MESSAGE_PREFIX = new TextEncoder().encode(
  '\u0018Bitcoin Signed Message:\n',
);
/** The compact-size length byte of a 32-byte message. */
const COMPACT_SIZE_32 = 0x20;

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

/** An ECDSA signature as the generated circuits take it. */
type EcdsaSignature = { r: bigint; s: bigint };

/** Signs a 32-byte digest as it stands, with no hashing of its own. */
const signPrehash = (digest: Uint8Array, secret: bigint): EcdsaSignature => {
  const { r, s } = secp256k1.Signature.fromBytes(
    secp256k1.sign(digest, secp256k1.Point.Fn.toBytes(secret), {
      prehash: false,
    }),
  );
  return { r, s };
};

/** What a wallet's raw hash signing produces: ECDSA over SHA-256 of the challenge. */
const signHash = (challenge: Uint8Array, secret: bigint): EcdsaSignature =>
  signPrehash(sha256(challenge), secret);

/** What a wallet's Bitcoin message signing produces: ECDSA over double SHA-256 of the prefixed message. */
const signBitcoinMessage = (
  challenge: Uint8Array,
  secret: bigint,
): EcdsaSignature => {
  const message = new Uint8Array(
    BITCOIN_MESSAGE_PREFIX.length + 1 + challenge.length,
  );
  message.set(BITCOIN_MESSAGE_PREFIX);
  message[BITCOIN_MESSAGE_PREFIX.length] = COMPACT_SIZE_32;
  message.set(challenge, BITCOIN_MESSAGE_PREFIX.length + 1);
  return signPrehash(sha256(sha256(message)), secret);
};

/**
 * What the owner hands the grantee to act under its grant: the account,
 * the grant's slot and scope salt, the origin it was issued for and the
 * object fields its commitment hides.
 */
type GrantHandoff = {
  address: Uint8Array;
  slot: bigint;
  scopeSalt: Uint8Array;
  originHash: Uint8Array;
  color: Uint8Array;
  maxCoinValue: bigint;
};

/** The knobs of one spend: the amounts, and the secret, envelope and signer to override. */
type SpendProps = {
  amount: bigint;
  spentPrev: bigint;
  secret?: bigint;
  envelope?: bigint;
  sign?: (challenge: Uint8Array, secret: bigint) => EcdsaSignature;
};

/**
 * The grantee's side of a spend, from the handoff and the public ledger
 * alone: the grant id it derives, the record nonce and issue time the
 * challenge binds, the signature, and the call to the k256 withdrawal.
 */
const granteeAgent = (handoff: GrantHandoff, recipient: Uint8Array) => {
  const self = { bytes: handoff.address };
  const grantIdOf = (pk: Secp256k1Point): Uint8Array =>
    pureCircuits.derive_grant_id_with_k256(
      self,
      pk,
      ENVELOPE_NONE,
      handoff.originHash,
      handoff.slot,
    );
  const ownPoint =
    pureCircuits.compute_public_point_with_k256(K256_GRANTEE_SECRET);

  const grantId = grantIdOf(ownPoint);

  const challenge = (amount: bigint): Uint8Array => {
    const record = simulated().ledger().grants.lookup(grantId);
    return pureCircuits.challenge_withdraw_unshielded_with_grant_k256(
      self,
      ownPoint,
      grantId,
      record.issued_at,
      handoff.color,
      amount,
      { bytes: recipient },
      record.nonce,
    );
  };

  const spend = async ({
    amount,
    spentPrev,
    secret = K256_GRANTEE_SECRET,
    envelope = ENVELOPE_NONE,
    sign = signHash,
  }: SpendProps): Promise<unknown> =>
    simulated().call(
      'withdraw_unshielded_with_grant_k256',
      handoff.color,
      amount,
      { bytes: recipient },
      pureCircuits.compute_public_point_with_k256(secret),
      envelope,
      handoff.originHash,
      handoff.slot,
      handoff.scopeSalt,
      RECIPIENT_ANY,
      new Uint8Array(32),
      handoff.maxCoinValue,
      spentPrev,
      sign(challenge(amount), secret),
    );

  return { grantId, challenge, spend };
};

describe(
  'a secp256k1 grantee spending over the simulated contract',
  { timeout: 60_000 },
  () => {
    beforeEach(() => {
      chain.sim = undefined;
    });

    /** Creates the account, issues the k256 spend grant and funds the account. */
    const issuedToK256Grantee = async () => {
      const context = owner();
      const created = await createAccount({ lockAccount: false }, context);
      const issued = await issueGrant(
        {
          account: created.account,
          devices: created.devices,
          localUseCounter: created.localUseCounter,
          scope: k256SpendScope,
        },
        context,
      );
      const grant = issued.grants.find(record => record.id === issued.grantId);
      if (!grant?.opening) throw new Error('The issued grant has no opening');
      const handoff: GrantHandoff = {
        address: simulated().address,
        slot: BigInt(grant.slot),
        scopeSalt: ByteArray.fromHex(HexBytes(grant.opening.scopeSalt)),
        originHash: await originHash(grant.opening.origin),
        color: ByteArray.fromHex(HexBytes(grant.opening.color)),
        maxCoinValue: BigInt(grant.opening.maxCoinValue),
      };
      await simulated().call('deposit_unshielded', handoff.color, DEPOSITED);
      const agent = granteeAgent(
        handoff,
        crypto.getRandomValues(new Uint8Array(32)),
      );
      return { issuedGrantId: issued.grantId, handoff, agent };
    };

    /** The unshielded balance the account holds of a color. */
    const balanceOf = (color: Uint8Array): bigint =>
      simulated().ledger().unshielded_balances.lookup(color);

    /** The on-ledger grant record stored under a grant id. */
    const recordOf = (id: Uint8Array) => simulated().ledger().grants.lookup(id);

    it('accepts ECDSA over SHA-256 of the challenge, settling the nonce and the spent amount', async () => {
      const { issuedGrantId, handoff, agent } = await issuedToK256Grantee();
      expect(HexBytes.fromByteArray(agent.grantId)).toBe(issuedGrantId);
      const challenge = agent.challenge(300n);
      expect(sha256(challenge)).toEqual(
        pureCircuits.envelope_digest(ENVELOPE_NONE, challenge),
      );
      const before = recordOf(agent.grantId);

      await agent.spend({ amount: 300n, spentPrev: 0n });

      expect(balanceOf(handoff.color)).toBe(DEPOSITED - 300n);
      const after = recordOf(agent.grantId);
      expect(after.nonce).toBe(before.nonce + 1n);
      expect(after.spent_commit).toEqual(
        pureCircuits.derive_grant_spent_commit(handoff.scopeSalt, 300n),
      );

      await agent.spend({ amount: 150n, spentPrev: 300n });

      expect(balanceOf(handoff.color)).toBe(DEPOSITED - 450n);
      const last = recordOf(agent.grantId);
      expect(last.nonce).toBe(before.nonce + 2n);
      expect(last.spent_commit).toEqual(
        pureCircuits.derive_grant_spent_commit(handoff.scopeSalt, 450n),
      );
    });

    it('refuses a Bitcoin-style prefixed message signature over the challenge', async () => {
      const { handoff, agent } = await issuedToK256Grantee();

      await expect(
        agent.spend({
          amount: 100n,
          spentPrev: 0n,
          sign: signBitcoinMessage,
        }),
      ).rejects.toThrow('invalid grant signature');
      expect(balanceOf(handoff.color)).toBe(DEPOSITED);
    });

    it('refuses the connector envelope for a spend grant', async () => {
      const { handoff, agent } = await issuedToK256Grantee();

      await expect(
        agent.spend({
          amount: 100n,
          spentPrev: 0n,
          envelope: ENVELOPE_CONNECTOR,
        }),
      ).rejects.toThrow('envelope not admitted for a spend grant');
      expect(balanceOf(handoff.color)).toBe(DEPOSITED);
    });

    it('refuses another secp256k1 key as naming no grant', async () => {
      const { handoff, agent } = await issuedToK256Grantee();

      await expect(
        agent.spend({ amount: 100n, spentPrev: 0n, secret: FOREIGN_SECRET }),
      ).rejects.toThrow('unknown grant');
      expect(balanceOf(handoff.color)).toBe(DEPOSITED);
    });

    it('refuses an amount above the per-call cap and a spend past the cumulative cap', async () => {
      const { handoff, agent } = await issuedToK256Grantee();

      await expect(
        agent.spend({ amount: 301n, spentPrev: 0n }),
      ).rejects.toThrow('amount above per-call cap');

      await agent.spend({ amount: 300n, spentPrev: 0n });
      await expect(
        agent.spend({ amount: 151n, spentPrev: 300n }),
      ).rejects.toThrow('cumulative cap exceeded');
      expect(balanceOf(handoff.color)).toBe(DEPOSITED - 300n);
    });
  },
);
