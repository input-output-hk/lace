import {
  AccAddress,
  CeremonyCancelledError,
  DeviceEpoch,
  GrantId,
  UseCounter,
} from '@lace-contract/passport';
import { RemoteSignerError } from '@lace-lib/passkey';
import { describe, expect, it, vi } from 'vitest';

import { MalformedPayloadError } from '../../src/remote/codec';
import { createRemotePassportAuthoriser } from '../../src/remote/remote-authoriser';

import { prepareIssueGrantFlow } from './fake-grant';

import type {
  AuthorisationRequest,
  KeySessionFlow,
} from '@lace-contract/passport';

const ACCOUNT = AccAddress('ac'.repeat(32));
const COMMITMENT = 'ab'.repeat(32);
const OTHER_COMMITMENT = 'cd'.repeat(32);
const NEW_ENTRY = new Uint8Array(32).fill(0x5a);

const addDeviceRequest: AuthorisationRequest = {
  account: ACCOUNT,
  circuit: 'add_device_with_jubjub',
  args: [NEW_ENTRY],
  witnessValues: [],
  authNonce: 7n,
  useCounter: UseCounter(3n),
};

const encodedAuthorisation = {
  scheme: 'jubjub-schnorr',
  pk: { x: '1', y: '2' },
  useCounter: '3',
  sigR: { x: '4', y: '5' },
  sigS: '6',
  grindNonce: '7',
};

const setup = (answer: unknown = undefined) => {
  const client = { request: vi.fn(async () => answer) };
  return { client, authoriser: createRemotePassportAuthoriser(client) };
};

describe('createRemotePassportAuthoriser', () => {
  it('implements the jubjub-schnorr scheme without a storage key', () => {
    const { authoriser } = setup();

    expect(authoriser.scheme).toBe('jubjub-schnorr');
    expect(authoriser.storageKey).toBeUndefined();
  });

  it('decodes the device public key from its decimal coordinates', async () => {
    const { client, authoriser } = setup({ x: '10', y: '20' });

    await expect(authoriser.devicePublicKey()).resolves.toEqual({
      x: 10n,
      y: 20n,
    });
    expect(client.request).toHaveBeenCalledExactlyOnceWith(
      'device-public-key',
      {},
    );
  });

  it('requests a commitment batch with the epoch and counters as decimals', async () => {
    const { client, authoriser } = setup([COMMITMENT, OTHER_COMMITMENT]);

    await expect(
      authoriser.deviceCommitments!(ACCOUNT, DeviceEpoch(2n), [
        UseCounter(0n),
        UseCounter(1n),
      ]),
    ).resolves.toEqual([COMMITMENT, OTHER_COMMITMENT]);
    expect(client.request).toHaveBeenCalledExactlyOnceWith(
      'device-commitments',
      { account: ACCOUNT, epoch: '2', counters: ['0', '1'] },
    );
  });

  it('requests a single commitment as a one-counter batch', async () => {
    const { client, authoriser } = setup([COMMITMENT]);

    await expect(
      authoriser.deviceCommitment(ACCOUNT, DeviceEpoch(0n), UseCounter(5n)),
    ).resolves.toBe(COMMITMENT);
    expect(client.request).toHaveBeenCalledExactlyOnceWith(
      'device-commitments',
      { account: ACCOUNT, epoch: '0', counters: ['5'] },
    );
  });

  it('refuses a commitment batch of the wrong length', async () => {
    const { authoriser } = setup([COMMITMENT]);

    await expect(
      authoriser.deviceCommitments!(ACCOUNT, DeviceEpoch(0n), [
        UseCounter(0n),
        UseCounter(1n),
      ]),
    ).rejects.toThrow(new MalformedPayloadError('commitments'));
  });

  it('encodes the request bigints and decodes the authorisation', async () => {
    const { client, authoriser } = setup(encodedAuthorisation);

    await expect(authoriser.authorise(addDeviceRequest)).resolves.toEqual({
      scheme: 'jubjub-schnorr',
      pk: { x: 1n, y: 2n },
      useCounter: 3n,
      sigR: { x: 4n, y: 5n },
      sigS: 6n,
      grindNonce: 7n,
    });
    expect(client.request).toHaveBeenCalledExactlyOnceWith('authorise', {
      account: ACCOUNT,
      circuit: 'add_device_with_jubjub',
      args: [NEW_ENTRY],
      witnessValues: [],
      authNonce: '7',
      useCounter: '3',
    });
  });

  it('opens the flow before the operation and closes it after', async () => {
    const { client, authoriser } = setup();
    const operation = vi.fn(async () => {
      expect(client.request).toHaveBeenCalledExactlyOnceWith('flow-open', {
        flow: {
          kind: 'add-device',
          commitmentHex: COMMITMENT,
          account: ACCOUNT,
        },
      });
      return 7;
    });

    await expect(
      authoriser.withKeySession!(operation, {
        kind: 'add-device',
        commitmentHex: COMMITMENT,
        account: ACCOUNT,
      }),
    ).resolves.toBe(7);
    expect(client.request).toHaveBeenLastCalledWith('flow-close', {
      outcome: 'completed',
    });
    expect(client.request).toHaveBeenCalledTimes(2);
  });

  it('sends the descriptor with its commitment lowercase and the account it acts on', async () => {
    const { client, authoriser } = setup();

    await authoriser.withKeySession!(async () => undefined, {
      kind: 'remove-device',
      commitmentHex: COMMITMENT.toUpperCase(),
      account: ACCOUNT,
      devices: ['11'.repeat(32)],
    });

    expect(client.request).toHaveBeenNthCalledWith(1, 'flow-open', {
      flow: {
        kind: 'remove-device',
        commitmentHex: COMMITMENT,
        account: ACCOUNT,
        devices: ['11'.repeat(32)],
      },
    });
  });

  it('refuses a removal without the device entries that keep reading before anything is sent', async () => {
    const { client, authoriser } = setup();

    await expect(
      authoriser.withKeySession!(async () => undefined, {
        kind: 'remove-device',
        commitmentHex: COMMITMENT,
        account: ACCOUNT,
      }),
    ).rejects.toThrow(new MalformedPayloadError('flow.devices'));
    expect(client.request).not.toHaveBeenCalled();
  });

  it('sends the joining device keys an enrolment delivers the account keys to', async () => {
    const { client, authoriser } = setup();
    const reader = {
      readerPublicKey: '12'.repeat(32),
      devicePublicKey: '34'.repeat(32),
    };

    await authoriser.withKeySession!(async () => undefined, {
      kind: 'add-device',
      commitmentHex: COMMITMENT,
      account: ACCOUNT,
      reader,
    });

    expect(client.request).toHaveBeenNthCalledWith(1, 'flow-open', {
      flow: {
        kind: 'add-device',
        commitmentHex: COMMITMENT,
        account: ACCOUNT,
        reader,
      },
    });
  });

  it('closes the flow as failed with unexpected when the operation fails without a code, and rejects with that failure', async () => {
    const { client, authoriser } = setup();

    await expect(
      authoriser.withKeySession!(
        async () => {
          throw new Error('node unreachable');
        },
        { kind: 'sign-in' },
      ),
    ).rejects.toThrow('node unreachable');
    expect(client.request).toHaveBeenLastCalledWith('flow-close', {
      outcome: 'failed',
      code: 'unexpected',
    });
  });

  it('closes the flow as failed with the code the operation failure carries', async () => {
    const { client, authoriser } = setup();
    const failure = Object.assign(new Error('node unreachable'), {
      code: 'network-error',
    });

    await expect(
      authoriser.withKeySession!(
        async () => {
          throw failure;
        },
        { kind: 'create-account', lockAccount: true },
      ),
    ).rejects.toBe(failure);
    expect(client.request).toHaveBeenLastCalledWith('flow-close', {
      outcome: 'failed',
      code: 'network-error',
    });
  });

  it('reports the operation failure when the close fails as well', async () => {
    const { client, authoriser } = setup();
    client.request
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new RemoteSignerError('unexpected', 'gone'));

    await expect(
      authoriser.withKeySession!(
        async () => {
          throw new Error('node unreachable');
        },
        { kind: 'sign-in' },
      ),
    ).rejects.toThrow('node unreachable');
    expect(client.request).toHaveBeenLastCalledWith('flow-close', {
      outcome: 'failed',
      code: 'unexpected',
    });
  });

  it('reports a failing close when the operation succeeded', async () => {
    const { client, authoriser } = setup();
    client.request
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new RemoteSignerError('unexpected', 'gone'));

    await expect(
      authoriser.withKeySession!(async () => 7, { kind: 'sign-in' }),
    ).rejects.toThrow('gone');
  });

  it('does not run the operation when the flow is not opened', async () => {
    const { client, authoriser } = setup();
    client.request.mockRejectedValueOnce(
      new RemoteSignerError('ceremony-cancelled', 'dismissed'),
    );
    const operation = vi.fn(async () => 7);

    await expect(
      authoriser.withKeySession!(operation, { kind: 'sign-in' }),
    ).rejects.toBeInstanceOf(CeremonyCancelledError);
    expect(operation).not.toHaveBeenCalled();
    expect(client.request).toHaveBeenCalledTimes(1);
  });

  it('refuses a key session that names no flow', async () => {
    const { client, authoriser } = setup();

    await expect(authoriser.withKeySession!(async () => 7)).rejects.toThrow(
      'A remote key session must name the flow it serves.',
    );
    expect(client.request).not.toHaveBeenCalled();
  });

  describe('grant flows', () => {
    it('sends an issue-grant descriptor with the account, scope, slot, salt and digest the flow prepared', async () => {
      const { flow } = await prepareIssueGrantFlow('dapp.example');
      const { client, authoriser } = setup();

      await expect(
        authoriser.withKeySession!(async () => 7, flow),
      ).resolves.toBe(7);

      expect(client.request).toHaveBeenNthCalledWith(1, 'flow-open', {
        flow,
      });
      expect(client.request).toHaveBeenLastCalledWith('flow-close', {
        outcome: 'completed',
      });
    });

    it('forwards the device entries a read grant issue names', async () => {
      const { flow } = await prepareIssueGrantFlow('dapp.example');
      const { client, authoriser } = setup();
      const devices = ['11'.repeat(32)];

      await authoriser.withKeySession!(async () => undefined, {
        ...flow,
        devices,
      });

      expect(client.request).toHaveBeenNthCalledWith(1, 'flow-open', {
        flow: { ...flow, devices },
      });
    });

    it('sends a revoke-grant descriptor with its grant id and account, and revoke-all-grants with its account', async () => {
      const { flow } = await prepareIssueGrantFlow('dapp.example');
      const { client, authoriser } = setup();

      await authoriser.withKeySession!(async () => undefined, {
        kind: 'revoke-grant',
        grantId: flow.grantId,
        account: ACCOUNT,
      });
      await authoriser.withKeySession!(async () => undefined, {
        kind: 'revoke-all-grants',
        account: ACCOUNT,
      });

      expect(client.request).toHaveBeenNthCalledWith(1, 'flow-open', {
        flow: { kind: 'revoke-grant', grantId: flow.grantId, account: ACCOUNT },
      });
      expect(client.request).toHaveBeenNthCalledWith(3, 'flow-open', {
        flow: { kind: 'revoke-all-grants', account: ACCOUNT },
      });
    });

    it('sends a create-account descriptor with its lock choice, and refuses one without it before anything is sent', async () => {
      const { client, authoriser } = setup();

      await authoriser.withKeySession!(async () => undefined, {
        kind: 'create-account',
        lockAccount: false,
      });
      await expect(
        authoriser.withKeySession!(async () => undefined, {
          kind: 'create-account',
        }),
      ).rejects.toThrow(new MalformedPayloadError('flow.lockAccount'));

      expect(client.request).toHaveBeenCalledTimes(2);
      expect(client.request).toHaveBeenNthCalledWith(1, 'flow-open', {
        flow: { kind: 'create-account', lockAccount: false },
      });
    });

    it('sends an install-operations descriptor with its account and operations, and refuses one without operations before anything is sent', async () => {
      const { client, authoriser } = setup();
      const operations = ['withdraw_unshielded_with_grant_k256'];

      await authoriser.withKeySession!(async () => undefined, {
        kind: 'install-operations',
        account: ACCOUNT,
        operations,
      });
      await expect(
        authoriser.withKeySession!(async () => undefined, {
          kind: 'install-operations',
          account: ACCOUNT,
        }),
      ).rejects.toThrow(new MalformedPayloadError('flow.operations'));

      expect(client.request).toHaveBeenCalledTimes(2);
      expect(client.request).toHaveBeenNthCalledWith(1, 'flow-open', {
        flow: { kind: 'install-operations', account: ACCOUNT, operations },
      });
    });

    it('sends the read flag of a revoke descriptor only when the revocation rotates the key', async () => {
      const { flow } = await prepareIssueGrantFlow('dapp.example');
      const { client, authoriser } = setup();

      await authoriser.withKeySession!(async () => undefined, {
        kind: 'revoke-grant',
        grantId: flow.grantId,
        read: true,
        account: ACCOUNT,
        devices: ['11'.repeat(32)],
      });
      await authoriser.withKeySession!(async () => undefined, {
        kind: 'revoke-all-grants',
        read: true,
        account: ACCOUNT,
        devices: ['11'.repeat(32)],
      });
      await authoriser.withKeySession!(async () => undefined, {
        kind: 'revoke-all-grants',
        read: false,
        account: ACCOUNT,
      });

      expect(client.request).toHaveBeenNthCalledWith(1, 'flow-open', {
        flow: {
          kind: 'revoke-grant',
          grantId: flow.grantId,
          read: true,
          account: ACCOUNT,
          devices: ['11'.repeat(32)],
        },
      });
      expect(client.request).toHaveBeenNthCalledWith(3, 'flow-open', {
        flow: {
          kind: 'revoke-all-grants',
          read: true,
          account: ACCOUNT,
          devices: ['11'.repeat(32)],
        },
      });
      expect(client.request).toHaveBeenNthCalledWith(5, 'flow-open', {
        flow: { kind: 'revoke-all-grants', account: ACCOUNT },
      });
    });

    it('refuses a revoke descriptor without the account, and a rotating one without devices, before anything is sent', async () => {
      const { client, authoriser } = setup();

      await expect(
        authoriser.withKeySession!(async () => undefined, {
          kind: 'revoke-all-grants',
          read: true,
        }),
      ).rejects.toThrow(new MalformedPayloadError('flow.account'));
      await expect(
        authoriser.withKeySession!(async () => undefined, {
          kind: 'revoke-grant',
          grantId: GrantId('ab'.repeat(32)),
        }),
      ).rejects.toThrow(new MalformedPayloadError('flow.account'));
      await expect(
        authoriser.withKeySession!(async () => undefined, {
          kind: 'revoke-all-grants',
          read: true,
          account: ACCOUNT,
        }),
      ).rejects.toThrow(new MalformedPayloadError('flow.devices'));
      expect(client.request).not.toHaveBeenCalled();
    });

    it('sends a read-holdings descriptor with the kind alone', async () => {
      const { client, authoriser } = setup();

      await authoriser.withKeySession!(async () => undefined, {
        kind: 'read-holdings',
      });

      expect(client.request).toHaveBeenNthCalledWith(1, 'flow-open', {
        flow: { kind: 'read-holdings' },
      });
    });

    it.each([
      'account',
      'grantId',
      'scope',
      'slot',
      'scopeSalt',
      'scopeDigest',
    ] as const)(
      'refuses an issue-grant session without %s before anything is sent',
      async field => {
        const { flow } = await prepareIssueGrantFlow('dapp.example');
        const { client, authoriser } = setup();
        const operation = vi.fn(async () => 7);

        await expect(
          authoriser.withKeySession!(operation, {
            ...flow,
            [field]: undefined,
          } as KeySessionFlow),
        ).rejects.toThrow(new MalformedPayloadError(`flow.${field}`));
        expect(operation).not.toHaveBeenCalled();
        expect(client.request).not.toHaveBeenCalled();
      },
    );

    it('refuses a revoke-grant session without a grant id, and a device session without a commitment or an account', async () => {
      const { client, authoriser } = setup();

      await expect(
        authoriser.withKeySession!(async () => 7, { kind: 'revoke-grant' }),
      ).rejects.toThrow(new MalformedPayloadError('flow.grantId'));
      await expect(
        authoriser.withKeySession!(async () => 7, { kind: 'add-device' }),
      ).rejects.toThrow(new MalformedPayloadError('flow.commitmentHex'));
      await expect(
        authoriser.withKeySession!(async () => 7, {
          kind: 'remove-device',
          commitmentHex: COMMITMENT,
        }),
      ).rejects.toThrow(new MalformedPayloadError('flow.account'));
      expect(client.request).not.toHaveBeenCalled();
    });
  });
});
