import {
  AccAddress,
  MaintenanceAuthorityMismatchError,
  MaintenanceUpdateRefusedError,
} from '@lace-contract/passport';
import * as ledger from '@midnightntwrk/ledger-v9';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { devEncryptionKey } from '../../src/acc/dev-encryption-key';
import {
  deviceEnvelopes,
  encodeDevicePublicKey,
} from '../../src/acc/envelopes';
import { JubjubDevice } from '../../src/acc/signer';
import {
  assertHoldsRosterAuthority,
  assertMaintenanceSigner,
  followRosterAuthority,
} from '../../src/flows/maintenance';

import type { submitMaintenanceUpdate } from '../../src/acc/deploy';
import type { IndexerClient } from '../../src/infra/indexer';
import type {
  AccountKeyring,
  MaintenanceVerifyingKey,
  PassportDependencies,
  PassportEncryptionKey,
} from '@lace-contract/passport';

const mocks = vi.hoisted(() => ({
  readMaintenanceAuthority: vi.fn(),
  submitMaintenanceUpdate: vi.fn(),
  createMidnightProviders: vi.fn(),
}));

vi.mock('../../src/acc/deploy', () => ({
  readMaintenanceAuthority: mocks.readMaintenanceAuthority,
  submitMaintenanceUpdate: mocks.submitMaintenanceUpdate,
}));
vi.mock('../../src/infra/providers', () => ({
  createMidnightProviders: mocks.createMidnightProviders,
}));

const NETWORK = 'undeployed';
const address = 'ac'.repeat(32);
const account = AccAddress(address);
const network = {
  networkId: NETWORK,
  indexerUrl: 'http://indexer.example.com/api/v3/graphql',
  indexerWsUrl: 'ws://indexer.example.com/api/v3/graphql/ws',
  nodeUrl: 'http://node.example.com',
  artefactUrl: 'http://artefacts.example.com/account',
};
const providers = {
  tag: 'midnight-providers',
  publicDataProvider: { tag: 'public-data' },
};
const indexer = { tag: 'indexer' } as unknown as IndexerClient;
const devicePublicKey = encodeDevicePublicKey(new JubjubDevice(31n).pk);

/**
 * An account a device created and then rotated with a fresh roster key,
 * with this device's keyring over both envelopes and the authority each
 * roster key derives.
 */
const rotatedAccount = async () => {
  const encryptionKey = devEncryptionKey();
  const readerPublicKey = await encryptionKey.readerPublicKey(NETWORK);
  const keyringOf = (
    encKey: Uint8Array,
    envelopes: readonly Uint8Array[],
  ): AccountKeyring => ({
    account,
    encKey,
    envelopes: deviceEnvelopes(envelopes, readerPublicKey),
  });
  const created = await encryptionKey.createKeys(NETWORK, { devicePublicKey });
  const rotated = await encryptionKey.createKeys(NETWORK, {
    devicePublicKey,
    keyring: keyringOf(created.encKey, created.envelopes),
    registrations: created.registrations,
    rotateRoster: true,
  });
  return {
    encryptionKey,
    previous: created.authority,
    next: rotated.authority,
    keyring: keyringOf(rotated.encKey, [
      ...created.envelopes,
      ...rotated.envelopes,
    ]),
  };
};

const seamsOver = (
  encryptionKey: PassportEncryptionKey,
): PassportDependencies => ({
  passportAuthoriser: {
    scheme: 'jubjub-schnorr',
    devicePublicKey: vi.fn(),
    deviceCommitment: vi.fn(),
    authorise: vi.fn(),
  },
  passportEncryptionKey: encryptionKey,
  passportSponsor: { balanceAndSign: vi.fn() },
  passportProver: { prove: vi.fn(), check: vi.fn() },
  passportNetwork: network,
});

const onChain = (committee: MaintenanceVerifyingKey[], counter = 4n) => {
  mocks.readMaintenanceAuthority.mockResolvedValue({
    committee,
    threshold: 1,
    counter,
  });
};

const withoutSigner = (
  encryptionKey: PassportEncryptionKey,
): PassportEncryptionKey => {
  const { signMaintenanceUpdate: _signer, ...rest } = encryptionKey;
  return rest;
};

type SubmitMaintenanceUpdateProps = Parameters<
  typeof submitMaintenanceUpdate
>[0];

/** The one update submitted, as the flow built it. */
const submitted = (): SubmitMaintenanceUpdateProps => {
  const [[props]] = mocks.submitMaintenanceUpdate.mock.calls as [
    [SubmitMaintenanceUpdateProps],
  ];
  return props;
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createMidnightProviders.mockResolvedValue(providers);
  mocks.submitMaintenanceUpdate.mockResolvedValue(undefined);
});

describe('followRosterAuthority', () => {
  it('signs the replace with the previous roster key and installs the one the new live roster key derives', async () => {
    const { encryptionKey, previous, next, keyring } = await rotatedAccount();
    const seams = seamsOver(encryptionKey);
    const onProgress = vi.fn();
    onChain([previous]);

    await followRosterAuthority({
      address,
      seams,
      keyring,
      authority: next,
      onProgress,
    });

    expect(mocks.readMaintenanceAuthority).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        providers: { publicDataProvider: providers.publicDataProvider },
        address,
      }),
    );
    expect(mocks.createMidnightProviders).toHaveBeenCalledExactlyOnceWith({
      network,
      prover: seams.passportProver,
      sponsor: seams.passportSponsor,
      onStage: onProgress,
    });
    expect(mocks.submitMaintenanceUpdate).toHaveBeenCalledOnce();
    const { update, signature, ...rest } = submitted();
    expect(rest).toMatchObject({ providers, address });
    expect(update.address).toBe(address);
    expect(update.counter).toBe(4n);
    expect(ledger.verifySignature(previous, update.dataToSign, signature)).toBe(
      true,
    );
    expect(ledger.verifySignature(next, update.dataToSign, signature)).toBe(
      false,
    );
    const [replace] = update.updates;
    expect(replace).toBeInstanceOf(ledger.ReplaceAuthority);
    const { authority } = replace as ledger.ReplaceAuthority;
    expect(authority.committee).toEqual([next]);
    expect(authority.threshold).toBe(1);
    expect(authority.counter).toBe(5n);
  });

  it('submits nothing for a locked account, whose committee is empty', async () => {
    const { encryptionKey, next, keyring } = await rotatedAccount();
    const signMaintenanceUpdate = vi.spyOn(
      encryptionKey,
      'signMaintenanceUpdate',
    );
    onChain([]);

    await followRosterAuthority({
      address,
      seams: seamsOver(encryptionKey),
      keyring,
      authority: next,
      onProgress: vi.fn(),
    });

    expect(signMaintenanceUpdate).not.toHaveBeenCalled();
    expect(mocks.submitMaintenanceUpdate).not.toHaveBeenCalled();
  });

  it('skips a locked account even over an encryption key that cannot sign', async () => {
    const { encryptionKey, next, keyring } = await rotatedAccount();
    onChain([]);

    await expect(
      followRosterAuthority({
        address,
        seams: seamsOver(withoutSigner(encryptionKey)),
        keyring,
        authority: next,
        onProgress: vi.fn(),
      }),
    ).resolves.toBeUndefined();
  });

  it('refuses an on-chain authority no roster key of the keyring derives, submitting nothing', async () => {
    const { encryptionKey, next, keyring } = await rotatedAccount();
    const stranger = await rotatedAccount();
    onChain([stranger.previous]);

    await expect(
      followRosterAuthority({
        address,
        seams: seamsOver(encryptionKey),
        keyring,
        authority: next,
        onProgress: vi.fn(),
      }),
    ).rejects.toBeInstanceOf(MaintenanceAuthorityMismatchError);
    expect(mocks.submitMaintenanceUpdate).not.toHaveBeenCalled();
  });

  it('refuses a committee of more than one key, submitting nothing', async () => {
    const { encryptionKey, previous, next, keyring } = await rotatedAccount();
    onChain([previous, next]);

    await expect(
      followRosterAuthority({
        address,
        seams: seamsOver(encryptionKey),
        keyring,
        authority: next,
        onProgress: vi.fn(),
      }),
    ).rejects.toBeInstanceOf(MaintenanceAuthorityMismatchError);
    expect(mocks.submitMaintenanceUpdate).not.toHaveBeenCalled();
  });

  it('fails clearly over an encryption key that cannot sign while the authority is live', async () => {
    const { encryptionKey, previous, next, keyring } = await rotatedAccount();
    onChain([previous]);

    await expect(
      followRosterAuthority({
        address,
        seams: seamsOver(withoutSigner(encryptionKey)),
        keyring,
        authority: next,
        onProgress: vi.fn(),
      }),
    ).rejects.toThrow(MaintenanceUpdateRefusedError);
    expect(mocks.submitMaintenanceUpdate).not.toHaveBeenCalled();
  });

  it('rejects with the failure of the submission', async () => {
    const { encryptionKey, previous, next, keyring } = await rotatedAccount();
    const failure = new Error(
      'The maintenance authority counter never reached 5',
    );
    onChain([previous]);
    mocks.submitMaintenanceUpdate.mockRejectedValue(failure);

    await expect(
      followRosterAuthority({
        address,
        seams: seamsOver(encryptionKey),
        keyring,
        authority: next,
        onProgress: vi.fn(),
      }),
    ).rejects.toBe(failure);
  });
});

describe('assertMaintenanceSigner', () => {
  it('reads nothing for an encryption key that signs maintenance updates', async () => {
    const { encryptionKey } = await rotatedAccount();

    await assertMaintenanceSigner({ address, indexer, encryptionKey });

    expect(mocks.readMaintenanceAuthority).not.toHaveBeenCalled();
  });

  it('refuses an encryption key that cannot sign over a live authority', async () => {
    const { encryptionKey, previous } = await rotatedAccount();
    onChain([previous]);

    await expect(
      assertMaintenanceSigner({
        address,
        indexer,
        encryptionKey: withoutSigner(encryptionKey),
      }),
    ).rejects.toThrow(
      `The encryption key held here cannot sign maintenance updates, so the maintenance authority of the account at ${address} cannot follow its roster.`,
    );
  });

  it('accepts an encryption key that cannot sign over a locked account', async () => {
    const { encryptionKey } = await rotatedAccount();
    onChain([]);

    await expect(
      assertMaintenanceSigner({
        address,
        indexer,
        encryptionKey: withoutSigner(encryptionKey),
      }),
    ).resolves.toBeUndefined();
  });
});

describe('assertHoldsRosterAuthority', () => {
  it.each([
    ['the live roster key', 'next'],
    ['an earlier roster key', 'previous'],
  ] as const)(
    'accepts an authority %s of the keyring derives',
    async (_label, held) => {
      const rotated = await rotatedAccount();
      const holdsMaintenanceAuthority = vi.spyOn(
        rotated.encryptionKey,
        'holdsMaintenanceAuthority',
      );
      onChain([rotated[held]]);

      await expect(
        assertHoldsRosterAuthority({
          address,
          seams: seamsOver(rotated.encryptionKey),
          indexer,
          keyring: rotated.keyring,
        }),
      ).resolves.toBeUndefined();
      expect(holdsMaintenanceAuthority).toHaveBeenCalledExactlyOnceWith(
        NETWORK,
        rotated.keyring,
        rotated[held],
      );
    },
  );

  it('refuses an authority no roster key of the keyring derives', async () => {
    const { encryptionKey, keyring } = await rotatedAccount();
    const stranger = await rotatedAccount();
    onChain([stranger.previous]);

    await expect(
      assertHoldsRosterAuthority({
        address,
        seams: seamsOver(encryptionKey),
        indexer,
        keyring,
      }),
    ).rejects.toThrow(
      new MaintenanceAuthorityMismatchError(
        `No roster key this device holds derives the maintenance authority of the account at ${address}, so the roster cannot rotate.`,
      ),
    );
  });

  it('refuses a committee of more than one key', async () => {
    const { encryptionKey, previous, next, keyring } = await rotatedAccount();
    onChain([previous, next]);

    await expect(
      assertHoldsRosterAuthority({
        address,
        seams: seamsOver(encryptionKey),
        indexer,
        keyring,
      }),
    ).rejects.toBeInstanceOf(MaintenanceAuthorityMismatchError);
  });

  it('asks nothing for a locked account, whose committee is empty', async () => {
    const { encryptionKey, keyring } = await rotatedAccount();
    const holdsMaintenanceAuthority = vi.spyOn(
      encryptionKey,
      'holdsMaintenanceAuthority',
    );
    onChain([]);

    await expect(
      assertHoldsRosterAuthority({
        address,
        seams: seamsOver(encryptionKey),
        indexer,
        keyring,
      }),
    ).resolves.toBeUndefined();
    expect(holdsMaintenanceAuthority).not.toHaveBeenCalled();
  });

  it('reads nothing for an encryption key that cannot answer', async () => {
    const { encryptionKey, keyring } = await rotatedAccount();
    const { holdsMaintenanceAuthority: _holds, ...rest } = encryptionKey;

    await expect(
      assertHoldsRosterAuthority({
        address,
        seams: seamsOver(rest),
        indexer,
        keyring,
      }),
    ).resolves.toBeUndefined();
    expect(mocks.readMaintenanceAuthority).not.toHaveBeenCalled();
  });
});
