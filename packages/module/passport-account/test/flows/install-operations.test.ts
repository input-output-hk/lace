import { readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  AccAddress,
  AuthorityRetiredError,
  MaintenanceAuthorityMismatchError,
  MaintenanceUpdateRefusedError,
  OperationNotInstallableError,
} from '@lace-contract/passport';
import { sha256 } from '@lace-lib/crypto';
import { HexBytes } from '@lace-lib/util';
import * as ledger from '@midnightntwrk/ledger-v9';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEPLOYED_OPERATIONS } from '../../src/acc/deployed-operations';
import { devEncryptionKey } from '../../src/acc/dev-encryption-key';
import {
  deviceEnvelopes,
  encodeDevicePublicKey,
} from '../../src/acc/envelopes';
import { GRANTEE_WITHDRAWAL_CIRCUITS } from '../../src/acc/grant-circuits';
import { JubjubDevice } from '../../src/acc/signer';
import { installOperations } from '../../src/flows/install-operations';

import type * as AccModule from '../../src/acc/acc-module';
import type * as Deploy from '../../src/acc/deploy';
import type { submitMaintenanceUpdate } from '../../src/acc/deploy';
import type * as AccountCall from '../../src/flows/account-call';
import type { FlowContext } from '../../src/flows/types';
import type {
  KeySessionFlow,
  MaintenanceVerifyingKey,
  PassportAccountInfo,
  PassportAuthoriser,
  PassportEncryptionKey,
} from '@lace-contract/passport';

const pins = vi.hoisted(() => ({ expectedVk: {} as Record<string, string> }));

const mocks = vi.hoisted(() => ({
  queryAccountLedger: vi.fn(),
  queryAccountOperations: vi.fn(),
  readMaintenanceAuthority: vi.fn(),
  submitMaintenanceUpdate: vi.fn(),
  createMidnightProviders: vi.fn(),
}));

vi.mock('../../src/acc/acc-module', async importOriginal => ({
  ...(await importOriginal<typeof AccModule>()),
  expectedVk: pins.expectedVk,
}));
vi.mock('../../src/acc/deploy', async importOriginal => ({
  ...(await importOriginal<typeof Deploy>()),
  readMaintenanceAuthority: mocks.readMaintenanceAuthority,
  submitMaintenanceUpdate: mocks.submitMaintenanceUpdate,
}));
vi.mock('../../src/flows/account-call', async importOriginal => ({
  ...(await importOriginal<typeof AccountCall>()),
  queryAccountLedger: mocks.queryAccountLedger,
  queryAccountOperations: mocks.queryAccountOperations,
}));
vi.mock('../../src/infra/indexer', () => ({
  createIndexerClient: () => indexer,
}));
vi.mock('../../src/infra/providers', () => ({
  createMidnightProviders: mocks.createMidnightProviders,
}));

const NETWORK = 'undeployed';
const address = 'ac'.repeat(32);
const network = {
  networkId: NETWORK,
  indexerUrl: 'http://indexer.example.com/api/v3/graphql',
  indexerWsUrl: 'ws://indexer.example.com/api/v3/graphql/ws',
  nodeUrl: 'http://node.example.com',
  artefactUrl: 'http://artefacts.example.com/account',
};
const account: PassportAccountInfo = {
  address,
  bindingVersion: '0.1.0-lace.1',
  status: 'ready',
  networkId: NETWORK,
};
const indexer = vi.hoisted(() => ({ tag: 'indexer' }));
const devicePublicKey = encodeDevicePublicKey(new JubjubDevice(31n).pk);
const K256_WITHDRAWALS = GRANTEE_WITHDRAWAL_CIRCUITS['secp256k1-ecdsa'];
const RECOVERY_OPERATION = 'recover_submit';

/**
 * A verifier key the pinned compiler line emits, standing in for every
 * operation's: the test pins its digest for the whole deployed roster.
 */
const verifierKey = new Uint8Array(
  await readFile(
    path.join(__dirname, '..', 'acc', 'fixtures', 'counter-bump.verifier'),
  ),
);
for (const operation of [...DEPLOYED_OPERATIONS, RECOVERY_OPERATION]) {
  pins.expectedVk[operation] = HexBytes.fromByteArray(sha256(verifierKey));
}

const getVerifierKey = vi.fn(async (_operation: string) => verifierKey);
const publicDataProvider = { tag: 'public-data' };
const providers = { publicDataProvider, zkConfigProvider: { getVerifierKey } };

/** The maintenance authority as the simulated chain holds it. */
const chain = {
  committee: [] as MaintenanceVerifyingKey[],
  counter: 4n,
};

/** The account ledger the indexer serves for a live secret and an inbox. */
const ledgerOf = (encKey: Uint8Array, inbox: readonly Uint8Array[]) => ({
  enc_key: encKey,
  inbox_count: BigInt(inbox.length),
  inbox: {
    member: (ordinal: bigint) => ordinal < BigInt(inbox.length),
    lookup: (ordinal: bigint) => inbox[Number(ordinal)],
  },
});

/**
 * An account this device created, its envelopes the whole inbox, with
 * the authority its roster key derives and the ledger the indexer
 * serves for it.
 */
const createdAccount = async () => {
  const encryptionKey = devEncryptionKey();
  const created = await encryptionKey.createKeys(NETWORK, { devicePublicKey });
  mocks.queryAccountLedger.mockResolvedValue(
    ledgerOf(created.encKey, created.envelopes),
  );
  return { encryptionKey, created };
};

const withoutSigner = (
  encryptionKey: PassportEncryptionKey,
): PassportEncryptionKey => {
  const { signMaintenanceUpdate: _signer, ...rest } = encryptionKey;
  return rest;
};

const withKeySession = vi.fn(
  async (operation: () => Promise<unknown>, _flow?: KeySessionFlow) =>
    operation(),
);

const contextOver = (encryptionKey: PassportEncryptionKey): FlowContext => ({
  seams: {
    passportAuthoriser: {
      scheme: 'jubjub-schnorr',
      devicePublicKey: vi.fn(),
      deviceCommitment: vi.fn(),
      authorise: vi.fn(),
      withKeySession: withKeySession as PassportAuthoriser['withKeySession'],
    },
    passportEncryptionKey: encryptionKey,
    passportSponsor: { balanceAndSign: vi.fn() },
    passportProver: { prove: vi.fn(), check: vi.fn() },
    passportNetwork: network,
  },
  accountRecords: {
    read: vi.fn(),
    write: vi.fn(),
    presence: vi.fn(),
  },
  onProgress: vi.fn(),
  rpId: undefined,
});

/** The operations an account holds when it lacks `missing` of the roster. */
const installedWithout = (missing: readonly string[]): string[] =>
  DEPLOYED_OPERATIONS.filter(operation => !missing.includes(operation));

type SubmitMaintenanceUpdateProps = Parameters<
  typeof submitMaintenanceUpdate
>[0];

/** The updates submitted, in order. */
const submittedUpdates = (): ledger.MaintenanceUpdate[] =>
  (
    mocks.submitMaintenanceUpdate.mock.calls as [SubmitMaintenanceUpdateProps][]
  ).map(([{ update }]) => update);

/** The operations each submitted update installs. */
const installedPerUpdate = (): string[][] =>
  submittedUpdates().map(update =>
    update.updates.map(single =>
      String((single as ledger.VerifierKeyInsert).operation),
    ),
  );

beforeEach(() => {
  vi.clearAllMocks();
  chain.counter = 4n;
  mocks.createMidnightProviders.mockResolvedValue(providers);
  mocks.readMaintenanceAuthority.mockImplementation(async () => ({
    committee: chain.committee,
    threshold: 1,
    counter: chain.counter,
  }));
  mocks.submitMaintenanceUpdate.mockImplementation(
    async ({ update }: SubmitMaintenanceUpdateProps) => {
      chain.counter = update.counter + 1n;
    },
  );
});

describe('installOperations', () => {
  it('installs the missing secp256k1 grantee withdrawals in one update the derived authority signs', async () => {
    const {
      encryptionKey,
      created: { authority },
    } = await createdAccount();
    chain.committee = [authority];
    mocks.queryAccountOperations.mockResolvedValue(
      installedWithout(K256_WITHDRAWALS),
    );
    const context = contextOver(encryptionKey);

    await expect(
      installOperations({ account, operations: K256_WITHDRAWALS }, context),
    ).resolves.toEqual({ operations: K256_WITHDRAWALS, alreadyInstalled: [] });

    expect(mocks.queryAccountOperations).toHaveBeenCalledExactlyOnceWith(
      indexer,
      address,
    );
    expect(withKeySession).toHaveBeenCalledExactlyOnceWith(
      expect.any(Function),
      {
        kind: 'install-operations',
        account: AccAddress(address),
        operations: K256_WITHDRAWALS,
      },
    );
    expect(mocks.createMidnightProviders).toHaveBeenCalledExactlyOnceWith({
      network,
      prover: context.seams.passportProver,
      sponsor: context.seams.passportSponsor,
      onStage: context.onProgress,
    });
    expect(installedPerUpdate()).toEqual([K256_WITHDRAWALS]);
    const [update] = submittedUpdates();
    expect(update.address).toBe(address);
    expect(update.counter).toBe(4n);
    const [[{ signature, providers: submittedThrough }]] = mocks
      .submitMaintenanceUpdate.mock.calls as [[SubmitMaintenanceUpdateProps]];
    expect(submittedThrough).toBe(providers);
    expect(mocks.readMaintenanceAuthority).toHaveBeenCalledWith(
      expect.objectContaining({ providers: { publicDataProvider } }),
    );
    expect(
      ledger.verifySignature(authority, update.dataToSign, signature),
    ).toBe(true);
  });

  it('follows a rotation that lands while the verifier keys download, signing with the new roster key', async () => {
    const { encryptionKey, created } = await createdAccount();
    chain.committee = [created.authority];
    mocks.queryAccountOperations.mockResolvedValue(
      installedWithout(K256_WITHDRAWALS),
    );
    const readerPublicKey = await encryptionKey.readerPublicKey(NETWORK);
    const rotated = await encryptionKey.createKeys(NETWORK, {
      devicePublicKey,
      keyring: {
        account: AccAddress(address),
        encKey: created.encKey,
        envelopes: deviceEnvelopes(created.envelopes, readerPublicKey),
      },
      registrations: created.registrations,
      rotateRoster: true,
    });
    getVerifierKey.mockImplementationOnce(async () => {
      chain.committee = [rotated.authority];
      mocks.queryAccountLedger.mockResolvedValue(
        ledgerOf(rotated.encKey, [...created.envelopes, ...rotated.envelopes]),
      );
      return verifierKey;
    });

    await installOperations(
      { account, operations: K256_WITHDRAWALS },
      contextOver(encryptionKey),
    );

    const [[{ update, signature }]] = mocks.submitMaintenanceUpdate.mock
      .calls as [[SubmitMaintenanceUpdateProps]];
    expect(
      ledger.verifySignature(rotated.authority, update.dataToSign, signature),
    ).toBe(true);
  });

  it('installs in roster order whatever order the operations are named in', async () => {
    const {
      encryptionKey,
      created: { authority },
    } = await createdAccount();
    chain.committee = [authority];
    const reversed = [...K256_WITHDRAWALS].reverse();
    mocks.queryAccountOperations.mockResolvedValue(
      installedWithout(K256_WITHDRAWALS),
    );

    await expect(
      installOperations(
        { account, operations: reversed },
        contextOver(encryptionKey),
      ),
    ).resolves.toEqual({ operations: K256_WITHDRAWALS, alreadyInstalled: [] });
    expect(installedPerUpdate()).toEqual([K256_WITHDRAWALS]);
  });

  it('splits many missing operations into budgeted waves, each built against the counter the last one left', async () => {
    const {
      encryptionKey,
      created: { authority },
    } = await createdAccount();
    chain.committee = [authority];
    const missing = DEPLOYED_OPERATIONS.slice(2);
    mocks.queryAccountOperations.mockResolvedValue(
      DEPLOYED_OPERATIONS.slice(0, 2),
    );

    await installOperations(
      { account, operations: missing },
      contextOver(encryptionKey),
    );

    const perUpdate = installedPerUpdate();
    expect(perUpdate.length).toBeGreaterThan(1);
    expect(perUpdate.flat()).toEqual(missing);
    for (const operations of perUpdate) {
      expect(operations.length * verifierKey.length).toBeLessThanOrEqual(
        15_000,
      );
    }
    const updates = submittedUpdates();
    expect(updates.map(update => update.counter)).toEqual(
      updates.map((_update, index) => 4n + BigInt(index)),
    );
    const calls = mocks.submitMaintenanceUpdate.mock.calls as [
      SubmitMaintenanceUpdateProps,
    ][];
    for (const [{ update, signature }] of calls) {
      expect(
        ledger.verifySignature(authority, update.dataToSign, signature),
      ).toBe(true);
    }
  });

  it('refuses operations outside the deployed roster, naming them, before any prompt', async () => {
    const {
      encryptionKey,
      created: { authority },
    } = await createdAccount();
    chain.committee = [authority];
    mocks.queryAccountOperations.mockResolvedValue(
      installedWithout(K256_WITHDRAWALS),
    );

    const install = installOperations(
      {
        account,
        operations: [
          K256_WITHDRAWALS[0],
          RECOVERY_OPERATION,
          'add_device_with_k256',
        ],
      },
      contextOver(encryptionKey),
    );

    await expect(install).rejects.toBeInstanceOf(OperationNotInstallableError);
    await expect(install).rejects.toThrow(
      'Not operations this module deploys: recover_submit, add_device_with_k256.',
    );
    expect(withKeySession).not.toHaveBeenCalled();
    expect(mocks.submitMaintenanceUpdate).not.toHaveBeenCalled();
  });

  it('skips the operations the account already holds and installs the rest', async () => {
    const {
      encryptionKey,
      created: { authority },
    } = await createdAccount();
    chain.committee = [authority];
    mocks.queryAccountOperations.mockResolvedValue(
      installedWithout(K256_WITHDRAWALS.slice(1)),
    );

    await expect(
      installOperations(
        { account, operations: K256_WITHDRAWALS },
        contextOver(encryptionKey),
      ),
    ).resolves.toEqual({
      operations: K256_WITHDRAWALS.slice(1),
      alreadyInstalled: K256_WITHDRAWALS.slice(0, 1),
    });
    expect(withKeySession).toHaveBeenCalledExactlyOnceWith(
      expect.any(Function),
      {
        kind: 'install-operations',
        account: AccAddress(address),
        operations: K256_WITHDRAWALS.slice(1),
      },
    );
    expect(installedPerUpdate()).toEqual([K256_WITHDRAWALS.slice(1)]);
  });

  it('finishes an install interrupted after its first wave by installing only the waves that did not land', async () => {
    const {
      encryptionKey,
      created: { authority },
    } = await createdAccount();
    chain.committee = [authority];
    const missing = DEPLOYED_OPERATIONS.slice(2);
    const held = [...DEPLOYED_OPERATIONS.slice(0, 2)];
    mocks.queryAccountOperations.mockImplementation(async () => [...held]);
    mocks.submitMaintenanceUpdate
      .mockImplementationOnce(
        async ({ update }: SubmitMaintenanceUpdateProps) => {
          chain.counter = update.counter + 1n;
          held.push(
            ...update.updates.map(single =>
              String((single as ledger.VerifierKeyInsert).operation),
            ),
          );
        },
      )
      .mockRejectedValueOnce(new Error('The second wave was dropped.'));

    await expect(
      installOperations(
        { account, operations: missing },
        contextOver(encryptionKey),
      ),
    ).rejects.toThrow('The second wave was dropped.');
    const [landed] = installedPerUpdate();
    mocks.submitMaintenanceUpdate.mockClear();

    await expect(
      installOperations(
        { account, operations: missing },
        contextOver(encryptionKey),
      ),
    ).resolves.toEqual({
      operations: missing.filter(operation => !landed.includes(operation)),
      alreadyInstalled: landed,
    });
    expect(installedPerUpdate().flat()).toEqual(
      missing.filter(operation => !landed.includes(operation)),
    );
  });

  it('succeeds with nothing submitted and no prompt when the account already holds every operation', async () => {
    const { encryptionKey } = await createdAccount();
    chain.committee = [];
    mocks.queryAccountOperations.mockResolvedValue(DEPLOYED_OPERATIONS);
    const reversed = [...K256_WITHDRAWALS].reverse();

    await expect(
      installOperations(
        { account, operations: reversed },
        contextOver(withoutSigner(encryptionKey)),
      ),
    ).resolves.toEqual({ operations: [], alreadyInstalled: K256_WITHDRAWALS });
    expect(withKeySession).not.toHaveBeenCalled();
    expect(mocks.readMaintenanceAuthority).not.toHaveBeenCalled();
    expect(mocks.createMidnightProviders).not.toHaveBeenCalled();
    expect(mocks.submitMaintenanceUpdate).not.toHaveBeenCalled();
  });

  it('still refuses an operation outside the roster beside ones already installed', async () => {
    const {
      encryptionKey,
      created: { authority },
    } = await createdAccount();
    chain.committee = [authority];
    mocks.queryAccountOperations.mockResolvedValue(DEPLOYED_OPERATIONS);

    await expect(
      installOperations(
        { account, operations: [K256_WITHDRAWALS[0], RECOVERY_OPERATION] },
        contextOver(encryptionKey),
      ),
    ).rejects.toThrow(
      new OperationNotInstallableError(
        `Not operations this module deploys: ${RECOVERY_OPERATION}.`,
      ),
    );
    expect(withKeySession).not.toHaveBeenCalled();
    expect(mocks.submitMaintenanceUpdate).not.toHaveBeenCalled();
  });

  it('refuses a request naming no operation', async () => {
    const { encryptionKey } = await createdAccount();
    mocks.queryAccountOperations.mockResolvedValue(DEPLOYED_OPERATIONS);

    await expect(
      installOperations(
        { account, operations: [] },
        contextOver(encryptionKey),
      ),
    ).rejects.toBeInstanceOf(OperationNotInstallableError);
    expect(withKeySession).not.toHaveBeenCalled();
  });

  it('refuses a locked account, whose committee is empty, before any prompt', async () => {
    const { encryptionKey } = await createdAccount();
    chain.committee = [];
    mocks.queryAccountOperations.mockResolvedValue(
      installedWithout(K256_WITHDRAWALS),
    );

    const install = installOperations(
      { account, operations: K256_WITHDRAWALS },
      contextOver(encryptionKey),
    );

    await expect(install).rejects.toBeInstanceOf(AuthorityRetiredError);
    await expect(install).rejects.toThrow(
      `The account at ${address} is locked`,
    );
    expect(withKeySession).not.toHaveBeenCalled();
    expect(mocks.createMidnightProviders).not.toHaveBeenCalled();
    expect(mocks.submitMaintenanceUpdate).not.toHaveBeenCalled();
  });

  it('refuses an encryption key that cannot sign maintenance updates before any prompt', async () => {
    const {
      encryptionKey,
      created: { authority },
    } = await createdAccount();
    chain.committee = [authority];
    mocks.queryAccountOperations.mockResolvedValue(
      installedWithout(K256_WITHDRAWALS),
    );

    await expect(
      installOperations(
        { account, operations: K256_WITHDRAWALS },
        contextOver(withoutSigner(encryptionKey)),
      ),
    ).rejects.toThrow(MaintenanceUpdateRefusedError);
    expect(withKeySession).not.toHaveBeenCalled();
    expect(mocks.submitMaintenanceUpdate).not.toHaveBeenCalled();
  });

  it('refuses an authority no roster key of this device derives, submitting nothing', async () => {
    const { encryptionKey } = await createdAccount();
    const stranger = await devEncryptionKey().createKeys(NETWORK, {
      devicePublicKey,
    });
    chain.committee = [stranger.authority];
    mocks.queryAccountOperations.mockResolvedValue(
      installedWithout(K256_WITHDRAWALS),
    );

    await expect(
      installOperations(
        { account, operations: K256_WITHDRAWALS },
        contextOver(encryptionKey),
      ),
    ).rejects.toBeInstanceOf(MaintenanceAuthorityMismatchError);
    expect(mocks.submitMaintenanceUpdate).not.toHaveBeenCalled();
  });

  it('refuses a verifier key that is not the pinned one, submitting nothing', async () => {
    const {
      encryptionKey,
      created: { authority },
    } = await createdAccount();
    chain.committee = [authority];
    mocks.queryAccountOperations.mockResolvedValue(
      installedWithout(K256_WITHDRAWALS),
    );
    const tampered = verifierKey.slice();
    tampered[tampered.length - 1] ^= 1;
    getVerifierKey.mockResolvedValueOnce(tampered);

    await expect(
      installOperations(
        { account, operations: K256_WITHDRAWALS },
        contextOver(encryptionKey),
      ),
    ).rejects.toThrow(MaintenanceUpdateRefusedError);
    expect(mocks.submitMaintenanceUpdate).not.toHaveBeenCalled();
  });
});
