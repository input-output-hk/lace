import { GrantSlot, GrantSpendRefusedError } from '@lace-contract/passport';
import { sha256 } from '@lace-lib/crypto';
import { ByteArray, HexBytes } from '@lace-lib/util';
import {
  grantSpendAuthorisationArgs,
  loadGrantDerivation,
} from '@lace-module/passport-account/sdk';
import { describe, expect, it } from 'vitest';

import { exportPassportAgentPolicy } from '../../src/passport/export-passport-agent-policy';
import { parsePassportAgentPolicy } from '../../src/passport/parse-passport-agent-policy';
import {
  loadPassportGrantSpendChallenges,
  preparePassportGrantSpend,
} from '../../src/passport/prepare-passport-grant-spend';

import {
  account,
  ACCOUNT_ADDRESS,
  COLOR,
  grantRecord,
  NETWORK,
  RECIPIENT_VALUE,
  walletWith,
} from './passport-fixtures';

import type { GrantSpend } from '@lace-module/passport-account/sdk';

const AGENT_PUBLIC_KEY = HexBytes(
  '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
);
const RECIPIENT = ByteArray.fromHex(HexBytes(RECIPIENT_VALUE));

/**
 * The policy an owner exports for a secp256k1 grant on the fixture
 * account, as the agent reads it back: its grant id derived as the
 * contract derives it, through JSON and the policy parser.
 */
const agentPolicy = async () => {
  const { deriveGrantId, granteePoint, originHash } =
    await loadGrantDerivation();
  const record = grantRecord();
  const opening = {
    ...record.opening!,
    granteeScheme: 'secp256k1-ecdsa' as const,
    granteePublicKey: AGENT_PUBLIC_KEY,
  };
  const id = deriveGrantId({
    contractAddress: ByteArray.fromHex(HexBytes(ACCOUNT_ADDRESS)),
    granteePublicKey: granteePoint({
      scheme: 'secp256k1-ecdsa',
      publicKey: AGENT_PUBLIC_KEY,
    }),
    originHash: await originHash(opening.origin),
    slot: GrantSlot(record.slot),
  });
  const exported = await exportPassportAgentPolicy(
    walletWith(account, [{ ...record, id, opening }]),
    { grantId: id },
  );
  return parsePassportAgentPolicy(JSON.stringify(exported), {
    network: NETWORK,
  });
};

const spend: GrantSpend = {
  operation: 'withdraw-unshielded',
  amount: 100n,
  recipient: RECIPIENT,
  issuedAt: 1_800_000_000n,
  nonce: 4n,
  spent: 0n,
};

describe('preparePassportGrantSpend', () => {
  it('turns a parsed secp256k1 policy and a spend into the k256 withdrawal and the SHA-256 digest the agent key signs', async () => {
    const policy = await agentPolicy();

    const call = await preparePassportGrantSpend(policy, spend);

    expect(call.circuit).toBe('withdraw_unshielded_with_grant_k256');
    if (call.scheme !== 'secp256k1-ecdsa') throw new Error('not k256');
    const challenges = await loadPassportGrantSpendChallenges();
    expect(call.challenge).toEqual(
      challenges['secp256k1-ecdsa']['withdraw-unshielded'](
        {
          contractAddress: ByteArray.fromHex(HexBytes(ACCOUNT_ADDRESS)),
          granteePublicKey: AGENT_PUBLIC_KEY,
          grantId: ByteArray.fromHex(HexBytes(policy.grantId)),
          issuedAt: spend.issuedAt,
          nonce: spend.nonce,
        },
        {
          color: ByteArray.fromHex(HexBytes(COLOR)),
          amount: spend.amount,
          recipient: RECIPIENT,
        },
      ),
    );
    expect(call.digest).toEqual(sha256(call.challenge));
    const args = [
      ...call.args,
      ...grantSpendAuthorisationArgs({ scheme: call.scheme, r: 1n, s: 2n }),
    ];
    expect(args).toHaveLength(13);
    expect(args.at(-1)).toEqual({ r: 1n, s: 2n });
  });

  it('refuses a spend above the per-call cap before anything is signed', async () => {
    const policy = await agentPolicy();

    await expect(
      preparePassportGrantSpend(policy, { ...spend, amount: 101n }),
    ).rejects.toThrow(GrantSpendRefusedError);
  });
});
