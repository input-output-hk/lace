import { verifyCardanoCustodyAccountIdentity } from '@lace-contract/cardano-context';
import {
  createCustodyAccountRecord,
  custodyGrantAssetId,
  custodyGrantLiveness,
  custodyRecipientToAddress,
  exportCustodyAgentPolicy,
  parseCustodyAccountRecord,
  parseCustodyAgentPolicy,
} from '@lace-lib/cardano-custody';

import {
  CardanoCustodyAgentPolicyInvalidError,
  CardanoCustodyInvalidOperationError,
  CardanoCustodyRecordInvalidError,
  CardanoCustodyUnsupportedVersionError,
  custodyAccountNotLiveError,
} from './cardano-custody-errors';
import {
  readCardanoCustodyAccount,
  readConfirmedCardanoCustodyAccountState,
} from './cardano-custody-wallet';

import type { CardanoCustodyRequestedGrantScope } from './cardano-custody-device-signer';
import type { WalletWithCardanoCustody } from './cardano-custody-wallet';
import type { Cardano } from '@cardano-sdk/core';
import type { Ed25519KeyHashHex } from '@cardano-sdk/crypto';
import type { CardanoCustodyAccount } from '@lace-contract/cardano-context';
import type { AccountId } from '@lace-contract/wallet-repo';
import type {
  CustodyAccountIdentity,
  CustodyAccountRecord,
  CustodyAccountRecordError,
  CustodyAgentPolicy,
  CustodyAgentPolicyError,
} from '@lace-lib/cardano-custody';

/**
 * The transferable, public description of one custody account (JSON, hex in
 * lower case). It never changes after creation and lists no devices: the
 * account's on-chain state does.
 */
export type CardanoCustodyAccountRecord = CustodyAccountRecord;

/**
 * What an agent needs to spend under one grant: the account record, the
 * grantee, and a snapshot of the grant with its slot and token, integers as
 * decimal strings and recipients in bech32.
 */
export type CardanoCustodyAgentPolicy = CustodyAgentPolicy;

/**
 * Validates an account record, as JSON text or a parsed value, and returns it
 * in canonical form. Validation re-derives the stake script hash from the
 * creator key hash and the pinned contract, and the address for the network,
 * which proves the record names a genuine custody account; then it checks
 * that the record is for the network `networkMagic` names. The upstream
 * `{ owner, stakeScriptHash, address }` record is accepted too, on that
 * network.
 *
 * It does not prove the account exists or lists this device: open it and
 * read its state for that.
 *
 * @throws {@link CardanoCustodyUnsupportedVersionError} When the record names an
 *   unsupported contract version.
 * @throws {@link CardanoCustodyRecordInvalidError} For any other failed step.
 */
export const parseCardanoCustodyAccountRecord = (
  input: unknown,
  { networkMagic }: { networkMagic: Cardano.NetworkMagic },
): CardanoCustodyAccountRecord => parseRecord(input, networkMagic).record;

/** The record and the identity its validation re-derived. */
export const parseRecord = (
  input: unknown,
  networkMagic: Cardano.NetworkMagic,
): { record: CustodyAccountRecord; identity: CustodyAccountIdentity } => {
  const parsed = parseCustodyAccountRecord(input, networkMagic);
  if (parsed.ok) return parsed.value;
  throw recordErrorOf(parsed.error);
};

const recordErrorOf = (error: CustodyAccountRecordError): Error =>
  error.code === 'unsupported-contract-version'
    ? new CardanoCustodyUnsupportedVersionError(error.accountValidatorHash)
    : new CardanoCustodyRecordInvalidError(error);

/**
 * The identity of a persisted custody account, derived again from its
 * contract version, creator key hash and network: persisted props are only
 * as trustworthy as storage.
 *
 * @throws {@link CardanoCustodyUnsupportedVersionError}
 * @throws {@link CardanoCustodyInvalidOperationError} With `unknown-account` when
 *   a stored field is not the derived one.
 */
export const verifiedIdentityOf = (
  account: CardanoCustodyAccount,
): CustodyAccountIdentity => {
  const identity = verifyCardanoCustodyAccountIdentity(
    account.blockchainSpecific,
  );
  if (identity.ok) return identity.value;
  throw identity.error.code === 'unsupported-contract-version'
    ? new CardanoCustodyUnsupportedVersionError(
        identity.error.accountValidatorHash,
      )
    : new CardanoCustodyInvalidOperationError('unknown-account', {
        accountId: account.accountId,
        identity: identity.error,
      });
};

/**
 * The record of a custody account in the wallet, for a device that joins it
 * or an agent that observes it. Its identity is derived again first, so a
 * tampered persisted account never exports a record.
 *
 * @throws {@link CardanoCustodyInvalidOperationError} With `unknown-account` when
 *   the wallet holds no such account, or its identity does not derive.
 * @throws {@link CardanoCustodyUnsupportedVersionError}
 */
export const exportCardanoCustodyAccountRecord = async (
  wallet: Pick<WalletWithCardanoCustody, 'stateObservables'>,
  { accountId }: { accountId: AccountId },
): Promise<CardanoCustodyAccountRecord> =>
  createCustodyAccountRecord(
    verifiedIdentityOf(await readCardanoCustodyAccount(wallet, accountId)),
  );

/**
 * The agent policy of one grant, read from the account's confirmed grant
 * UTxOs: a grant still waiting in a submitted transaction is not exported,
 * since an agent could not spend under it yet. The policy is a snapshot:
 * every spend lowers the remaining caps, and the agent finds its grant on
 * chain by its own key hash, the policy's `grantee`.
 *
 * @throws {@link CardanoCustodyInvalidOperationError} With `unknown-account`,
 *   `account-not-live` when no single readable control state is confirmed,
 *   `unknown-grant` when no confirmed grant UTxO holds `slot`, `dead-grant`
 *   when that grant no longer works (`detail.liveness`), or `invalid-grant`
 *   when the grant breaks an authoring rule.
 * @throws {@link CardanoCustodyUnsupportedVersionError}
 */
export const exportCardanoCustodyAgentPolicy = async (
  wallet: Pick<WalletWithCardanoCustody, 'stateObservables'>,
  { accountId, slot }: { accountId: AccountId; slot: bigint },
): Promise<CardanoCustodyAgentPolicy> => {
  const account = await readCardanoCustodyAccount(wallet, accountId);
  const record = createCustodyAccountRecord(verifiedIdentityOf(account));
  const confirmed = await readConfirmedCardanoCustodyAccountState(
    wallet,
    account,
  );
  if (confirmed?.status !== 'live') {
    throw custodyAccountNotLiveError(confirmed);
  }
  const held = confirmed.grants.find(({ grant }) => grant.slot === slot);
  if (!held) {
    throw new CardanoCustodyInvalidOperationError('unknown-grant', { slot });
  }
  const liveness = custodyGrantLiveness(
    held.grant,
    confirmed.state,
    Date.now(),
  );
  if (liveness !== 'current') {
    throw new CardanoCustodyInvalidOperationError('dead-grant', {
      slot,
      liveness,
    });
  }
  const policy = exportCustodyAgentPolicy(record, held.grant);
  if (!policy.ok) {
    throw new CardanoCustodyInvalidOperationError(
      'invalid-grant',
      policy.error.violations,
    );
  }
  return policy.value;
};

/**
 * The grant of an agent policy as {@link parseCardanoCustodyAgentPolicy}
 * returns it: integers as `bigint`, recipients as addresses on the account
 * network, and the grant token's asset id. Every value is the snapshot the
 * policy was exported with.
 */
export type CardanoCustodyAgentPolicyGrant = Omit<
  CardanoCustodyRequestedGrantScope,
  'grantee'
> & {
  readonly generation: bigint;
  readonly token: Cardano.AssetId;
};

/**
 * An agent policy as {@link parseCardanoCustodyAgentPolicy} returns it: the
 * validated account record, the grantee and the grant, ready for
 * `buildCardanoCustodyGrantSpend`.
 */
export type CardanoCustodyParsedAgentPolicy = {
  readonly type: CardanoCustodyAgentPolicy['type'];
  readonly version: CardanoCustodyAgentPolicy['version'];
  readonly account: CardanoCustodyAccountRecord;
  /** The agent's key hash, lower-case hex: the spend selects its grant by it. */
  readonly grantee: Ed25519KeyHashHex;
  readonly grant: CardanoCustodyAgentPolicyGrant;
};

const AGENT_POLICY_VERSION: CardanoCustodyAgentPolicy['version'] = 2;

/** The `version` field of a policy, as JSON text or a parsed value, if it has one. */
const versionOf = (input: unknown): unknown => {
  try {
    const value: unknown =
      typeof input === 'string' ? JSON.parse(input) : input;
    return typeof value === 'object' && value !== null && 'version' in value
      ? value.version
      : undefined;
  } catch {
    return undefined;
  }
};

const agentPolicyErrorOf = (error: CustodyAgentPolicyError): Error => {
  switch (error.code) {
    case 'invalid-account':
      return recordErrorOf(error.error);
    case 'invalid-grant':
      return new CardanoCustodyAgentPolicyInvalidError(
        error.violations[0].code,
        'grant',
      );
    case 'malformed-agent-policy':
      return new CardanoCustodyAgentPolicyInvalidError(
        error.reason,
        error.field,
      );
  }
};

/**
 * Validates an agent policy, as JSON text or a parsed value, for the
 * network `networkMagic` names, and returns it with the grant's integers as
 * `bigint`. An agent reads its policy with it before it opens the account
 * and calls `buildCardanoCustodyGrantSpend` with the policy's `grantee`.
 *
 * It refuses any shape but the one `exportCardanoCustodyAgentPolicy` writes:
 * another type, any version but 2, a missing or extra field, an integer
 * that is not a canonical non-negative decimal string, a grantee that is
 * not 28 bytes of lower-case hex, a recipient that is not canonical bech32
 * on the account network, and a token that is not the grant token of the
 * account and slot. The account is validated as
 * `parseCardanoCustodyAccountRecord` validates it. The grant must also keep
 * the contract's authoring rules: a lovelace grant has zero lovelace caps,
 * and no recipient is listed twice.
 *
 * It does not prove that the grant exists or still works: the spend finds
 * the grantee's grant on chain. Nor does it check the grantee: the agent
 * compares it with its own key hash.
 *
 * @throws {@link CardanoCustodyAgentPolicyInvalidError} When the policy or its
 *   grant is malformed.
 * @throws {@link CardanoCustodyRecordInvalidError} When the account record fails
 *   validation or is for another network.
 * @throws {@link CardanoCustodyUnsupportedVersionError} When the account record
 *   names an unsupported contract version.
 */
export const parseCardanoCustodyAgentPolicy = (
  input: unknown,
  { networkMagic }: { networkMagic: Cardano.NetworkMagic },
): CardanoCustodyParsedAgentPolicy => {
  const version = versionOf(input);
  if (version !== undefined && version !== AGENT_POLICY_VERSION) {
    throw new CardanoCustodyAgentPolicyInvalidError(
      'unsupported version',
      'version',
    );
  }
  const parsed = parseCustodyAgentPolicy(input, networkMagic);
  if (!parsed.ok) throw agentPolicyErrorOf(parsed.error);
  const { record, identity, grant } = parsed.value;
  const { scope } = grant;
  return {
    type: 'cardano-custody-agent-policy',
    version: AGENT_POLICY_VERSION,
    account: record,
    grantee: grant.grantee as unknown as Ed25519KeyHashHex,
    grant: {
      slot: grant.slot,
      generation: grant.generation,
      token: custodyGrantAssetId(record, grant.slot),
      asset: scope.asset,
      perCallCap: scope.perCallCap,
      cap: scope.cap,
      lovelacePerCallCap: scope.lovelacePerCallCap,
      lovelaceCap: scope.lovelaceCap,
      expiresAt: scope.expiresAt,
      // Every recipient is representable: the parser read each from bech32.
      recipients: scope.recipients.flatMap(recipient => {
        const address = custodyRecipientToAddress(
          recipient,
          identity.chainId.networkId,
        );
        return address.ok
          ? [address.value.toBech32() as Cardano.PaymentAddress]
          : [];
      }),
    },
  };
};
