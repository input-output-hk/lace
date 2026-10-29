import {
  decodeAuthorisation,
  decodeCommitments,
  decodePoint,
  encodeBigInt,
  MalformedPayloadError,
} from './codec';
import { requestSigner } from './request';

import type { SignerRequester } from './request';
import type {
  KeySessionFlow,
  PassportAuthoriser,
} from '@lace-contract/passport';
import type { SignerFlow } from '@lace-lib/passkey';

/**
 * The code a failed operation reports to the signer: its own string code
 * when it carries one, otherwise unexpected.
 */
const failureCode = (error: unknown): string =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  typeof error.code === 'string'
    ? error.code
    : 'unexpected';

const required = <T>(value: T | undefined, field: string): T => {
  if (value === undefined) throw new MalformedPayloadError(field);
  return value;
};

/**
 * The issue-grant descriptor as the signer verifies it: the account, the
 * grant id, the scope, the slot, the salt and the scope digest the flow
 * prepared, which the signer re-derives and shows. The digest is carried
 * rather than derived here, so this seam, which the Cardano entry of the
 * SDK bundles, never evaluates the contract module. A flow that prepared
 * no slot, salt or digest cannot be bound, so it is refused before
 * anything is sent.
 */
const toIssueGrantFlow = (flow: KeySessionFlow): SignerFlow => ({
  kind: 'issue-grant',
  account: required(flow.account, 'flow.account'),
  grantId: required(flow.grantId, 'flow.grantId'),
  scope: required(flow.scope, 'flow.scope'),
  slot: required(flow.slot, 'flow.slot'),
  scopeSalt: required(flow.scopeSalt, 'flow.scopeSalt'),
  scopeDigest: required(flow.scopeDigest, 'flow.scopeDigest'),
  ...(flow.devices ? { devices: flow.devices } : {}),
});

/**
 * The fields every revoke descriptor carries, the account whose grants
 * it revokes, and those it adds when the revocation rotates the
 * encryption key: the read flag and the device entries the new secret
 * may be sealed to, which the signer holds the rotation to.
 */
const revokeFields = (
  flow: KeySessionFlow,
): Pick<SignerFlow, 'account' | 'devices' | 'read'> => ({
  account: required(flow.account, 'flow.account'),
  ...(flow.read
    ? { read: true, devices: required(flow.devices, 'flow.devices') }
    : {}),
});

/**
 * The descriptor as the signer shows and compares it, carrying only the
 * fields its kind binds: a device flow its commitment in lowercase,
 * whichever case the dApp accepted it in, and the account it acts on, an
 * enrolment that delivers the account keys also the joining device's
 * keys and a removal the device entries that keep reading, a revoke its
 * account, its grant id and, when the revocation rotates the encryption
 * key, the read flag with the device entries, an issue the grant with
 * its scope digest and, for a read grant, the device entries, a
 * creation its lock choice and an install the account it upgrades with
 * the operations it installs. A descriptor
 * missing a field its kind binds is refused here with the error the
 * signer would answer, before anything is sent.
 */
const toSignerFlow = (flow: KeySessionFlow): SignerFlow => {
  switch (flow.kind) {
    case 'add-device':
    case 'remove-device':
      return {
        kind: flow.kind,
        commitmentHex: required(
          flow.commitmentHex,
          'flow.commitmentHex',
        ).toLowerCase(),
        account: required(flow.account, 'flow.account'),
        ...(flow.kind === 'add-device' && flow.reader
          ? {
              reader: flow.reader,
              ...(flow.devices ? { devices: flow.devices } : {}),
            }
          : {}),
        ...(flow.kind === 'remove-device'
          ? { devices: required(flow.devices, 'flow.devices') }
          : {}),
      };
    case 'issue-grant':
      return toIssueGrantFlow(flow);
    case 'revoke-grant':
      return {
        kind: flow.kind,
        grantId: required(flow.grantId, 'flow.grantId'),
        ...revokeFields(flow),
      };
    case 'revoke-all-grants':
      return { kind: flow.kind, ...revokeFields(flow) };
    case 'create-account':
      return {
        kind: flow.kind,
        lockAccount: required(flow.lockAccount, 'flow.lockAccount'),
      };
    case 'install-operations':
      return {
        kind: flow.kind,
        account: required(flow.account, 'flow.account'),
        operations: required(flow.operations, 'flow.operations'),
      };
    case 'read-holdings':
    case 'sign-in':
      return { kind: flow.kind };
  }
};

/**
 * A PassportAuthoriser whose device key lives with the Lace signer page.
 * Every call is one request on the channel; only public keys, commitments
 * and signatures come back, encoded as the protocol carries them. The
 * single-counter commitment is the one-element batch, so both take the
 * same path on the signer. `withKeySession` opens the signer's key
 * session for the named flow and closes it once the operation settles,
 * so one Approve inside the signer serves the whole flow; the flow
 * descriptor is what the signer shows before that approval, sent with
 * the fields its kind binds and nothing else, and a session without one,
 * or whose descriptor lacks a field its kind binds, is refused before
 * anything is sent. The close carries the flow's outcome, completed or
 * the code it failed with, so the signer can show how the flow ended. A
 * close that fails after the operation already failed is swallowed, so
 * the operation's own failure is what the flow reports. No storage key
 * is exposed: the account record lives on the signer origin, behind the
 * remote record store.
 */
export const createRemotePassportAuthoriser = (
  client: SignerRequester,
): PassportAuthoriser => {
  const deviceCommitments: NonNullable<
    PassportAuthoriser['deviceCommitments']
  > = async (account, epoch, counters) => {
    const commitments = decodeCommitments(
      await requestSigner(client, 'device-commitments', {
        account,
        epoch: encodeBigInt(epoch),
        counters: counters.map(encodeBigInt),
      }),
      'commitments',
    );
    if (commitments.length !== counters.length) {
      throw new MalformedPayloadError('commitments');
    }
    return commitments;
  };

  return {
    scheme: 'jubjub-schnorr',
    deviceCommitment: async (account, epoch, counter) => {
      const [commitment] = await deviceCommitments(account, epoch, [counter]);
      return commitment;
    },
    deviceCommitments,
    devicePublicKey: async () =>
      decodePoint(
        await requestSigner(client, 'device-public-key', {}),
        'devicePublicKey',
      ),
    authorise: async request =>
      decodeAuthorisation(
        await requestSigner(client, 'authorise', {
          account: request.account,
          circuit: request.circuit,
          args: [...request.args],
          witnessValues: [...request.witnessValues],
          authNonce: encodeBigInt(request.authNonce),
          useCounter: encodeBigInt(request.useCounter),
        }),
        'authorisation',
      ),
    withKeySession: async (operation, flow) => {
      if (!flow) {
        throw new Error('A remote key session must name the flow it serves.');
      }
      await requestSigner(client, 'flow-open', { flow: toSignerFlow(flow) });
      const result = await operation().catch(async (error: unknown) => {
        await requestSigner(client, 'flow-close', {
          outcome: 'failed',
          code: failureCode(error),
        }).catch(() => undefined);
        throw error;
      });
      await requestSigner(client, 'flow-close', { outcome: 'completed' });
      return result;
    },
  };
};
