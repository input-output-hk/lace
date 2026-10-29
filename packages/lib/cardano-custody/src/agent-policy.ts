import { Cardano } from '@cardano-sdk/core';

import {
  addressOfRepresentableRecipient,
  custodyRecipientFromAddress,
} from './codecs/recipient';
import { isHash28Hex } from './hex';
import { chainIdFromNetworkMagic } from './identity';
import {
  canonicalCustodyAccountRecord,
  CUSTODY_ACCOUNT_RECORD_TYPE,
  parseCustodyAccountRecord,
} from './record';
import { fail, ok } from './result';
import { findCustodyGrantViolations } from './state/rules';
import { custodyGrantAssetId } from './tokens';

import type { CustodyGrant } from './codecs/account-state';
import type { CustodyRecipient } from './codecs/recipient';
import type { CustodyAccountIdentity } from './identity';
import type { CustodyAccountRecord, CustodyAccountRecordError } from './record';
import type { CustodyResult } from './result';
import type { CustodyGrantViolation } from './state/rules';
import type { HexBlob } from '@cardano-sdk/util';

const CUSTODY_AGENT_POLICY_TYPE = 'cardano-custody-agent-policy';

const CUSTODY_AGENT_POLICY_VERSION = 2;

/**
 * A grant in the JSON form an agent consumes. Integers are decimal strings,
 * so no value loses precision; recipients are bech32 on the account network.
 * Every field is a snapshot taken at export: a spend lowers `cap` and
 * `lovelaceCap`, and a replacement moves the grant to another slot and
 * token.
 */
interface CustodyAgentPolicyGrant {
  readonly slot: string;
  readonly generation: string;
  /** Asset id of the grant token: the policy id, then the 32-byte name, in lower-case hex. */
  readonly token: string;
  readonly asset: { readonly policyId: string; readonly assetName: string };
  readonly perCallCap: string;
  readonly cap: string;
  readonly lovelacePerCallCap: string;
  readonly lovelaceCap: string;
  /** POSIX milliseconds. */
  readonly expiresAt: string;
  /** Empty when the grant allows any destination. */
  readonly recipients: readonly string[];
}

/**
 * What an agent needs to spend under its grant. The agent finds its grant
 * on chain by `grantee`, its own key hash: the grant UTxO moves on every
 * spend, so the policy names no output reference.
 */
export interface CustodyAgentPolicy {
  readonly type: typeof CUSTODY_AGENT_POLICY_TYPE;
  readonly version: typeof CUSTODY_AGENT_POLICY_VERSION;
  readonly account: CustodyAccountRecord;
  readonly grantee: string;
  readonly grant: CustodyAgentPolicyGrant;
}

interface CustodyAgentPolicyInvalidGrant {
  readonly code: 'invalid-grant';
  readonly violations: readonly CustodyGrantViolation[];
}

/** A policy whose JSON does not have the shape `exportCustodyAgentPolicy` writes. */
interface CustodyAgentPolicyMalformed {
  readonly code: 'malformed-agent-policy';
  /** Dotted path of the offending field, e.g. `grant.recipients`. */
  readonly field?: string;
  readonly reason: string;
}

/** The policy's account record failed `parseCustodyAccountRecord`. */
interface CustodyAgentPolicyInvalidAccount {
  readonly code: 'invalid-account';
  readonly error: CustodyAccountRecordError;
}

export type CustodyAgentPolicyError =
  | CustodyAgentPolicyInvalidAccount
  | CustodyAgentPolicyInvalidGrant
  | CustodyAgentPolicyMalformed;

/** An agent policy as `parseCustodyAgentPolicy` validated it. */
interface ParsedCustodyAgentPolicy {
  readonly record: CustodyAccountRecord;
  readonly identity: CustodyAccountIdentity;
  /** The exported snapshot, with `grantee` from the policy and recipients as Plutus addresses. */
  readonly grant: CustodyGrant;
}

/**
 * The agent policy for one grant of an account, rendered on the record's
 * network. Refuses a grant that breaks an authoring rule, since an agent
 * could not use it as described. Whether the grant is still current is the
 * caller's to check.
 */
export const exportCustodyAgentPolicy = (
  record: CustodyAccountRecord,
  grant: CustodyGrant,
): CustodyResult<CustodyAgentPolicy, CustodyAgentPolicyInvalidGrant> => {
  const violations = findCustodyGrantViolations(grant);
  if (violations.length > 0) return fail({ code: 'invalid-grant', violations });

  const { networkId } = chainIdFromNetworkMagic(record.networkMagic);
  // Every recipient is representable: it is one of the grant rules above.
  const recipients = grant.scope.recipients.map(recipient =>
    addressOfRepresentableRecipient(recipient, networkId).toBech32(),
  );

  const { scope } = grant;
  return ok({
    type: CUSTODY_AGENT_POLICY_TYPE,
    version: CUSTODY_AGENT_POLICY_VERSION,
    account: canonicalCustodyAccountRecord(record),
    grantee: grant.grantee,
    grant: {
      slot: grant.slot.toString(),
      generation: grant.generation.toString(),
      token: custodyGrantAssetId(record, grant.slot),
      asset: {
        policyId: scope.asset.policyId,
        assetName: scope.asset.assetName,
      },
      perCallCap: scope.perCallCap.toString(),
      cap: scope.cap.toString(),
      lovelacePerCallCap: scope.lovelacePerCallCap.toString(),
      lovelaceCap: scope.lovelaceCap.toString(),
      expiresAt: scope.expiresAt.toString(),
      recipients,
    },
  });
};

const POLICY_FIELDS = ['type', 'version', 'account', 'grantee', 'grant'];
const GRANT_FIELDS = [
  'slot',
  'generation',
  'token',
  'asset',
  'perCallCap',
  'cap',
  'lovelacePerCallCap',
  'lovelaceCap',
  'expiresAt',
  'recipients',
];
const ASSET_FIELDS = ['policyId', 'assetName'];
const INTEGER_FIELDS = [
  'slot',
  'generation',
  'perCallCap',
  'cap',
  'lovelacePerCallCap',
  'lovelaceCap',
  'expiresAt',
] as const;
const CANONICAL_DECIMAL = /^(?:0|[1-9]\d*)$/;

/** Raised inside the parser only; `parseCustodyAgentPolicy` turns it into a result. */
class Malformed extends Error {
  public constructor(readonly reason: string, readonly field?: string) {
    super(reason);
  }
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const objectWithFields = (
  value: unknown,
  fields: readonly string[],
  field?: string,
): Record<string, unknown> => {
  const keys = isPlainObject(value) ? Object.keys(value) : undefined;
  if (
    !isPlainObject(value) ||
    keys?.length !== fields.length ||
    !fields.every(name => keys.includes(name))
  ) {
    throw new Malformed(`expected exactly ${fields.join(', ')}`, field);
  }
  return value;
};

const parseJson = (input: unknown): unknown => {
  if (typeof input !== 'string') return input;
  try {
    return JSON.parse(input) as unknown;
  } catch {
    throw new Malformed('expected JSON');
  }
};

const integerOf = (value: unknown, field: string): bigint => {
  if (typeof value !== 'string' || !CANONICAL_DECIMAL.test(value)) {
    throw new Malformed('expected a canonical non-negative decimal', field);
  }
  return BigInt(value);
};

const stringOf = (value: unknown, field: string): string => {
  if (typeof value !== 'string') throw new Malformed('expected text', field);
  return value;
};

/**
 * The recipient a bech32 payment address names on the account network, when
 * spelled exactly as `toBech32` writes it. Bech32 also decodes an upper-case
 * spelling and ignores the prefix, so a mainnet-looking address could
 * otherwise stand for a testnet recipient.
 */
const recipientOf = (
  value: unknown,
  networkId: Cardano.NetworkId,
): CustodyRecipient => {
  const field = 'grant.recipients';
  const reason = 'expected bech32 payment addresses on the account network';
  if (typeof value !== 'string' || !Cardano.Address.isValidBech32(value)) {
    throw new Malformed(reason, field);
  }
  const address = Cardano.Address.fromBech32(value);
  const recipient = custodyRecipientFromAddress(address);
  if (
    !recipient.ok ||
    address.toBech32() !== value ||
    address.getNetworkId() !== networkId
  ) {
    throw new Malformed(reason, field);
  }
  return recipient.value;
};

const readGrant = (
  value: unknown,
  grantee: HexBlob,
  identity: CustodyAccountIdentity,
): { grant: CustodyGrant; token: string } => {
  const fields = objectWithFields(value, GRANT_FIELDS, 'grant');
  const asset = objectWithFields(fields.asset, ASSET_FIELDS, 'grant.asset');
  const [
    slot,
    generation,
    perCallCap,
    cap,
    lovelacePerCallCap,
    lovelaceCap,
    expiresAt,
  ] = INTEGER_FIELDS.map(name => integerOf(fields[name], `grant.${name}`));
  if (!Array.isArray(fields.recipients)) {
    throw new Malformed('expected a list', 'grant.recipients');
  }
  const { networkId } = identity.chainId;
  return {
    grant: {
      slot,
      grantee,
      generation,
      scope: {
        asset: {
          policyId: stringOf(asset.policyId, 'grant.asset.policyId') as HexBlob,
          assetName: stringOf(
            asset.assetName,
            'grant.asset.assetName',
          ) as HexBlob,
        },
        perCallCap,
        cap,
        lovelacePerCallCap,
        lovelaceCap,
        expiresAt,
        recipients: fields.recipients.map(recipient =>
          recipientOf(recipient, networkId),
        ),
      },
    },
    token: stringOf(fields.token, 'grant.token'),
  };
};

const readPolicy = (
  input: unknown,
  selectedNetworkMagic: Cardano.NetworkMagic,
): CustodyResult<ParsedCustodyAgentPolicy, CustodyAgentPolicyError> => {
  const value = objectWithFields(parseJson(input), POLICY_FIELDS);
  if (value.type !== CUSTODY_AGENT_POLICY_TYPE) {
    throw new Malformed('unknown type', 'type');
  }
  if (value.version !== CUSTODY_AGENT_POLICY_VERSION) {
    throw new Malformed('unsupported version', 'version');
  }
  // The upstream record shape names no network; a policy carries record v1.
  if (
    !isPlainObject(value.account) ||
    value.account.type !== CUSTODY_ACCOUNT_RECORD_TYPE
  ) {
    throw new Malformed('expected an account record', 'account');
  }
  const account = parseCustodyAccountRecord(
    value.account,
    selectedNetworkMagic,
  );
  if (!account.ok) {
    return fail({ code: 'invalid-account', error: account.error });
  }
  const { record, identity } = account.value;

  if (!isHash28Hex(value.grantee)) {
    throw new Malformed('expected 28 bytes of lower-case hex', 'grantee');
  }
  const { grant, token } = readGrant(value.grant, value.grantee, identity);
  const violations = findCustodyGrantViolations(grant);
  if (violations.length > 0) return fail({ code: 'invalid-grant', violations });
  if (token !== custodyGrantAssetId(record, grant.slot)) {
    throw new Malformed(
      'expected the grant token of the account and slot',
      'grant.token',
    );
  }
  return ok({ record, identity, grant });
};

/**
 * Validates an agent policy, as JSON text or a parsed value, for the
 * selected network. It refuses any shape but the one
 * `exportCustodyAgentPolicy` writes: another type or version, a missing or
 * extra field, an integer that is not a canonical non-negative decimal, a
 * grantee that is not 28 bytes of lower-case hex, a recipient that is not
 * canonical bech32 on the account network, and a token that is not the
 * grant token of the account and slot. The account is validated as
 * `parseCustodyAccountRecord` validates it, and the grant must keep the
 * authoring rules.
 *
 * It does not prove that the grant exists or is current: an agent reads the
 * account's grant UTxOs for that.
 */
export const parseCustodyAgentPolicy = (
  input: unknown,
  selectedNetworkMagic: Cardano.NetworkMagic,
): CustodyResult<ParsedCustodyAgentPolicy, CustodyAgentPolicyError> => {
  try {
    return readPolicy(input, selectedNetworkMagic);
  } catch (error) {
    if (!(error instanceof Malformed)) throw error;
    return fail({
      code: 'malformed-agent-policy',
      reason: error.reason,
      ...(error.field === undefined ? {} : { field: error.field }),
    });
  }
};
