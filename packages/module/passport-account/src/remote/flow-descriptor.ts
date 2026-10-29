import { DEPLOYED_OPERATIONS } from '../acc/deployed-operations';
import { MAX_DEVICE_ENTRIES } from '../acc/envelopes';

import {
  decodeAccount,
  decodeBoolean,
  decodeBytes,
  decodeDeviceReader,
  decodeGrantId,
  decodeGrantScope,
  decodeScopeSalt,
  decodeSlot,
  encodeBytes,
  MalformedPayloadError,
} from './codec';

import type {
  AccAddress,
  DeviceReader,
  GrantId,
  GrantScopeInput,
  GrantScopeSalt,
  GrantSlot,
} from '@lace-contract/passport';
import type { SignerFlow, SignerFlowKind } from '@lace-lib/passkey';

/** An issue-grant descriptor once read: every field present and typed. */
export type IssueGrantFlow = {
  kind: 'issue-grant';
  account: AccAddress;
  grantId: GrantId;
  scope: GrantScopeInput;
  slot: GrantSlot;
  scopeSalt: GrantScopeSalt;
  scopeDigest: string;
  /** The device entries a read grant's rotation may seal to; absent otherwise. */
  devices?: string[];
};

/**
 * What a revoke descriptor names: the account whose grants it revokes,
 * and about the encryption key nothing, a read flag that is false, or a
 * rotation of that account's key to the device entries it lists.
 */
type RevokeRotation = { account: AccAddress } & (
  | { read: true; devices: string[] }
  | { read?: false; devices?: undefined }
);

/**
 * A device descriptor once read: the entry it targets, the account it
 * acts on and, for an enrolment that hands the joining device the
 * account keys, that device's reader and device keys, with the device
 * entries a rotation ahead of it may seal to when a read grant is live.
 */
type DeviceFlow =
  | {
      kind: 'add-device';
      commitmentHex: string;
      account: AccAddress;
      reader?: DeviceReader;
      devices?: string[];
    }
  | {
      kind: 'remove-device';
      commitmentHex: string;
      account: AccAddress;
      devices: string[];
    };

/**
 * An install descriptor once read: the account it upgrades and the
 * operations of the deployed roster whose verifier keys it installs, in
 * the order the flow installs them.
 */
type InstallOperationsFlow = {
  kind: 'install-operations';
  account: AccAddress;
  operations: string[];
};

/**
 * A flow descriptor as the signer holds it: each kind with exactly the
 * fields it binds, so a session check and a consent screen read them
 * without a second look. A revoke flow carries the `account` whose
 * grants it revokes, and `read` only when the revocation rotates that
 * account's encryption key; every rotating flow carries the device
 * entries whose devices the new secret may be sealed to. A creation
 * carries its lock choice, and an install the operations it installs.
 */
export type DecodedSignerFlow =
  | DeviceFlow
  | InstallOperationsFlow
  | IssueGrantFlow
  | { kind: 'create-account'; lockAccount: boolean }
  | { kind: 'read-holdings' | 'sign-in' }
  | (RevokeRotation & { kind: 'revoke-all-grants' })
  | (RevokeRotation & { kind: 'revoke-grant'; grantId: GrantId });

const FLOW_KINDS: ReadonlySet<string> = new Set<SignerFlowKind>([
  'add-device',
  'create-account',
  'install-operations',
  'issue-grant',
  'read-holdings',
  'remove-device',
  'revoke-all-grants',
  'revoke-grant',
  'sign-in',
]);

type DescriptorField = Exclude<keyof SignerFlow, 'kind'>;

const DESCRIPTOR_FIELDS: readonly DescriptorField[] = [
  'commitmentHex',
  'account',
  'grantId',
  'scope',
  'slot',
  'scopeSalt',
  'scopeDigest',
  'read',
  'reader',
  'devices',
  'lockAccount',
  'operations',
];

const ISSUE_GRANT_FIELDS: readonly DescriptorField[] = [
  'account',
  'grantId',
  'scope',
  'slot',
  'scopeSalt',
  'scopeDigest',
  'devices',
];

/** The descriptor fields each flow kind carries; any other is refused. */
const FLOW_FIELDS: Record<SignerFlowKind, ReadonlySet<DescriptorField>> = {
  'create-account': new Set(['lockAccount']),
  'install-operations': new Set(['account', 'operations']),
  'read-holdings': new Set(),
  'sign-in': new Set(),
  'add-device': new Set(['commitmentHex', 'account', 'reader', 'devices']),
  'remove-device': new Set(['commitmentHex', 'account', 'devices']),
  'issue-grant': new Set(ISSUE_GRANT_FIELDS),
  'revoke-grant': new Set(['grantId', 'read', 'account', 'devices']),
  'revoke-all-grants': new Set(['read', 'account', 'devices']),
};

const COMMITMENT_HEX_PATTERN = /^[\da-f]{64}$/i;
const SCOPE_DIGEST_LENGTH = 32;

/**
 * The commitment a device flow targets, which is what the user approves
 * and what the authorisation is checked against: 32 bytes of hex, kept
 * lowercase so it compares and shows one way.
 */
const decodeCommitment = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !COMMITMENT_HEX_PATTERN.test(value)) {
    throw new MalformedPayloadError(field);
  }
  return value.toLowerCase();
};

/**
 * The device entries a rotating flow names, those whose devices may keep
 * reading: at most {@link MAX_DEVICE_ENTRIES}, each 32 bytes of hex, kept
 * lowercase, none twice, and never `except`, the entry a removal takes
 * out.
 */
const decodeDevices = (
  value: unknown,
  field: string,
  except?: string,
): string[] => {
  if (!Array.isArray(value) || value.length > MAX_DEVICE_ENTRIES) {
    throw new MalformedPayloadError(field);
  }
  const devices = value.map((item, index) =>
    decodeCommitment(item, `${field}[${index}]`),
  );
  if (
    new Set(devices).size !== devices.length ||
    (except !== undefined && devices.includes(except))
  ) {
    throw new MalformedPayloadError(field);
  }
  return devices;
};

/**
 * The operations an install names: at least one, each an operation of
 * the deployed roster and none twice, so the user approves exactly the
 * verifier keys the flow may install.
 */
const decodeInstallOperations = (value: unknown, field: string): string[] => {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > DEPLOYED_OPERATIONS.length
  ) {
    throw new MalformedPayloadError(field);
  }
  const operations = value.map((operation: unknown, index) => {
    if (
      typeof operation !== 'string' ||
      !DEPLOYED_OPERATIONS.includes(operation)
    ) {
      throw new MalformedPayloadError(`${field}[${index}]`);
    }
    return operation;
  });
  if (new Set(operations).size !== operations.length) {
    throw new MalformedPayloadError(field);
  }
  return operations;
};

/**
 * The account a revoke descriptor must name, its read flag, kept only
 * when it is carried, and the device entries a rotating revocation must
 * name, which any other must leave out.
 */
const decodeRevokeRotation = (
  fields: Record<string, unknown>,
): RevokeRotation => {
  const account = decodeAccount(fields.account, 'flow.account');
  if (fields.read === undefined || !decodeBoolean(fields.read, 'flow.read')) {
    if (fields.devices !== undefined) {
      throw new MalformedPayloadError('flow.devices');
    }
    return fields.read === undefined ? { account } : { account, read: false };
  }
  return {
    account,
    read: true,
    devices: decodeDevices(fields.devices, 'flow.devices'),
  };
};

/**
 * An issue descriptor: a read grant's must name the device entries its
 * rotation may seal to, and any other must leave them out.
 */
const decodeIssueGrantFlow = (
  value: Record<string, unknown>,
): IssueGrantFlow => {
  const scope = decodeGrantScope(value.scope, 'flow.scope');
  if (scope.read !== true && value.devices !== undefined) {
    throw new MalformedPayloadError('flow.devices');
  }
  return {
    kind: 'issue-grant',
    account: decodeAccount(value.account, 'flow.account'),
    grantId: decodeGrantId(value.grantId, 'flow.grantId'),
    scope,
    slot: decodeSlot(value.slot, 'flow.slot'),
    scopeSalt: decodeScopeSalt(value.scopeSalt, 'flow.scopeSalt'),
    scopeDigest: encodeBytes(
      decodeBytes(value.scopeDigest, 'flow.scopeDigest', SCOPE_DIGEST_LENGTH),
    ),
    ...(scope.read === true
      ? { devices: decodeDevices(value.devices, 'flow.devices') }
      : {}),
  };
};

/**
 * Reads the flow descriptor the dApp sent with its flow-open. The kind
 * decides what the session will serve and the other fields are what the
 * user approves and what the flow's authorisation is checked against, so
 * none is trusted as sent: each kind must carry exactly its own fields,
 * each in the shape the flow binds. The signer handlers read a descriptor
 * through this before they open a session, and a signer page reads it
 * the same way before it asks consent, so the two never disagree on what
 * a descriptor says.
 *
 * @throws {@link MalformedPayloadError} naming the first field that
 * cannot be read.
 */
export const decodeSignerFlow = (value: unknown): DecodedSignerFlow => {
  if (typeof value !== 'object' || value === null) {
    throw new MalformedPayloadError('flow');
  }
  const fields = value as Record<string, unknown>;
  const { kind } = fields;
  if (typeof kind !== 'string' || !FLOW_KINDS.has(kind)) {
    throw new MalformedPayloadError('flow.kind');
  }
  const flowKind = kind as SignerFlowKind;
  const carried = FLOW_FIELDS[flowKind];
  for (const field of DESCRIPTOR_FIELDS) {
    if (!carried.has(field) && fields[field] !== undefined) {
      throw new MalformedPayloadError(`flow.${field}`);
    }
  }
  switch (flowKind) {
    case 'add-device':
      if (fields.devices !== undefined && fields.reader === undefined) {
        throw new MalformedPayloadError('flow.devices');
      }
      return {
        kind: flowKind,
        commitmentHex: decodeCommitment(
          fields.commitmentHex,
          'flow.commitmentHex',
        ),
        account: decodeAccount(fields.account, 'flow.account'),
        ...(fields.reader === undefined
          ? {}
          : { reader: decodeDeviceReader(fields.reader, 'flow.reader') }),
        ...(fields.devices === undefined
          ? {}
          : { devices: decodeDevices(fields.devices, 'flow.devices') }),
      };
    case 'remove-device': {
      const commitmentHex = decodeCommitment(
        fields.commitmentHex,
        'flow.commitmentHex',
      );
      return {
        kind: flowKind,
        commitmentHex,
        account: decodeAccount(fields.account, 'flow.account'),
        devices: decodeDevices(fields.devices, 'flow.devices', commitmentHex),
      };
    }
    case 'issue-grant':
      return decodeIssueGrantFlow(fields);
    case 'revoke-grant':
      return {
        kind: flowKind,
        grantId: decodeGrantId(fields.grantId, 'flow.grantId'),
        ...decodeRevokeRotation(fields),
      };
    case 'revoke-all-grants':
      return { kind: flowKind, ...decodeRevokeRotation(fields) };
    case 'create-account':
      return {
        kind: flowKind,
        lockAccount: decodeBoolean(fields.lockAccount, 'flow.lockAccount'),
      };
    case 'install-operations':
      return {
        kind: flowKind,
        account: decodeAccount(fields.account, 'flow.account'),
        operations: decodeInstallOperations(
          fields.operations,
          'flow.operations',
        ),
      };
    case 'read-holdings':
    case 'sign-in':
      return { kind: flowKind };
  }
};
