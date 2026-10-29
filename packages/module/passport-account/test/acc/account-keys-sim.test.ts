/**
 * The account keys end to end: the real flows run over an Account Custody
 * Contract executed in process, with a development encryption key and
 * authoriser per device, and only the network infrastructure stood in
 * for: the indexer serves the simulated contract state and the outputs
 * of the deposits made here, and the deployment lands the simulated
 * contract with the `enc_key` the creation drew.
 */
import {
  AccAddress,
  DeviceRosterInvalidError,
  EncryptionKeyMismatchError,
  MaintenanceAuthorityMismatchError,
  TokenColor,
} from '@lace-contract/passport';
import { ByteArray, HexBytes } from '@lace-lib/util';
import * as ledgerV9 from '@midnightntwrk/ledger-v9';
import { x25519 } from '@noble/curves/ed25519.js';
import { jubjub } from '@noble/curves/misc.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { devJubjubAuthoriser } from '../../src/acc/dev-authoriser';
import { devEncryptionKey } from '../../src/acc/dev-encryption-key';
import {
  deviceEnvelopes,
  encodeDevicePublicKey,
  MAX_KEYRING_SECRETS,
  sealDeviceEnvelope,
  sealDeviceRegistration,
} from '../../src/acc/envelopes';
import { sealInboxEntry } from '../../src/acc/inbox';
import { inboxEntries } from '../../src/acc/inbox-walk';
import { maintenanceUpdateOf } from '../../src/acc/maintenance-authority';
import { JubjubDevice, randomJubjubScalar } from '../../src/acc/signer';
import { createAccount } from '../../src/flows/create-account';
import { addDevice, removeDevice } from '../../src/flows/devices';
import { issueGrant, revokeGrant } from '../../src/flows/grants';
import { readShieldedHoldings } from '../../src/flows/holdings';
import { signIn } from '../../src/flows/sign-in';

import { AccountSim } from './account-sim';
import { isLiveSecret, openGrantViewSeal } from './view-seal-reference';

import type * as GatedCall from '../../src/acc/gated-call';
import type { GatedContractHandle } from '../../src/acc/gated-call';
import type {
  AccountRecords,
  FlowAccountState,
  FlowContext,
  PassportAccountRecord,
} from '../../src/flows/types';
import type {
  ContractActionRecord,
  ShieldedOutputRecord,
} from '../../src/infra/indexer';
import type {
  AccountKeyring,
  DeviceReader,
  GrantScopeInput,
  MaintenanceVerifyingKey,
  PassportAccountInfo,
  ShieldedCoin,
} from '@lace-contract/passport';
import type { MaintenanceUpdate, Signature } from '@midnightntwrk/ledger-v9';

const chain = vi.hoisted(() => ({
  sim: undefined as AccountSim | undefined,
  scalar: 0n,
  actions: [] as ContractActionRecord[],
  outputs: new Map<string, ShieldedOutputRecord[]>(),
  afterCall: undefined as ((circuit: string) => Promise<void>) | undefined,
  failCircuit: undefined as string | undefined,
  failMaintenance: false,
}));

const simulated = (): AccountSim => {
  if (!chain.sim) throw new Error('No simulated account is deployed');
  return chain.sim;
};

vi.mock('../../src/infra/indexer', () => ({
  createIndexerClient: () => ({
    queryContractState: async () => simulated().contractState(),
    enumerateContractActions: async () => chain.actions,
    queryShieldedEvents: async (txHash: string) => ({
      outputs: chain.outputs.get(txHash) ?? [],
      nullifiers: [],
    }),
  }),
}));
vi.mock('../../src/infra/providers', () => ({
  createMidnightProviders: async () => ({}),
}));
vi.mock('../../src/acc/gated-call', async importOriginal => ({
  ...(await importOriginal<typeof GatedCall>()),
  connectAccountHandle: async (): Promise<GatedContractHandle> => {
    const { callTx } = simulated().handle();
    return {
      callTx: Object.fromEntries(
        Object.entries(callTx).map(([circuit, call]) => [
          circuit,
          async (...args: unknown[]) => {
            if (chain.failCircuit === circuit) {
              chain.failCircuit = undefined;
              throw new Error(`The ${circuit} call was interrupted`);
            }
            const result = await call(...args);
            const hook = chain.afterCall;
            if (hook) {
              chain.afterCall = undefined;
              await hook(circuit);
            }
            return result;
          },
        ]),
      ),
    };
  },
}));
vi.mock('../../src/acc/deploy', () => ({
  deployAccount: async ({
    encPublicKey,
    lockAccount,
    handoverAuthority,
    onDeployed,
  }: {
    encPublicKey: Uint8Array;
    lockAccount: boolean;
    handoverAuthority: MaintenanceVerifyingKey;
    onDeployed: (address: string, pending: unknown) => Promise<void>;
  }) => {
    chain.sim = await AccountSim.create({
      encKey: encPublicKey,
      scalar: chain.scalar,
      committee: lockAccount ? [] : [handoverAuthority],
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
  readMaintenanceAuthority: async () => simulated().maintenanceAuthority(),
  submitMaintenanceUpdate: async ({
    update,
    signature,
  }: {
    update: MaintenanceUpdate;
    signature: Signature;
  }) => {
    if (chain.failMaintenance) {
      chain.failMaintenance = false;
      throw new Error('The maintenance update was interrupted');
    }
    simulated().maintain(update.addSignature(0n, signature));
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

/** A record store in memory, which a test can empty to lose the record. */
const memoryRecords = () => {
  let stored: PassportAccountRecord | undefined;
  const records: AccountRecords = {
    read: async () => stored,
    write: async record => {
      stored = record;
    },
    presence: async () => {
      if (!stored) return 'absent';
      return stored.deployment ? 'pending' : 'complete';
    },
  };
  return {
    records,
    lose: () => {
      stored = undefined;
    },
    adopt: (record: PassportAccountRecord) => {
      stored = record;
    },
  };
};

/** One device: its own key, its own authoriser and its own record store. */
const device = () => {
  const scalar = randomJubjubScalar();
  const encryptionKey = devEncryptionKey();
  const store = memoryRecords();
  const context: FlowContext = {
    seams: {
      passportAuthoriser: devJubjubAuthoriser(scalar),
      passportEncryptionKey: encryptionKey,
      passportSponsor: { balanceAndSign: vi.fn() },
      passportProver: { prove: vi.fn(), check: vi.fn() },
      passportNetwork: network,
    },
    accountRecords: store.records,
    onProgress: vi.fn(),
    rpId,
  };
  return {
    scalar,
    jubjub: new JubjubDevice(scalar),
    encryptionKey,
    store,
    context,
  };
};

type Device = ReturnType<typeof device>;

const coin = (value: bigint): ShieldedCoin => ({
  nonce: crypto.getRandomValues(new Uint8Array(32)),
  color: crypto.getRandomValues(new Uint8Array(32)),
  value,
});

/** Deposits a coin sealed to the account's current `enc_key`, as a sender would. */
const deposit = async (value: bigint): Promise<ShieldedCoin> => {
  const sim = simulated();
  const deposited = coin(value);
  const commitment = await sim.deposit(
    deposited,
    await sealInboxEntry(sim.ledger().enc_key, deposited),
  );
  const txHash = `deposit-${chain.actions.length}`;
  chain.actions.push({
    kind: 'ContractCall',
    entryPoint: 'deposit_shielded',
    txHash,
    identifiers: [],
    blockHeight: 1,
  });
  chain.outputs.set(txHash, [
    {
      commitment,
      contractAddress: HexBytes.fromByteArray(sim.address),
      index: BigInt(chain.actions.length),
    },
  ]);
  return deposited;
};

/** Appends any bytes to the inbox through the permissionless deposit, as anyone may. */
const appendThroughDeposit = async (entry: Uint8Array): Promise<void> => {
  await simulated().deposit(coin(1n), entry);
};

/** This device's keys as the roster names them. */
const readerOf = async (owner: Device): Promise<DeviceReader> => ({
  readerPublicKey: HexBytes.fromByteArray(
    await owner.encryptionKey.readerPublicKey(network.networkId),
  ),
  devicePublicKey: encodeDevicePublicKey(owner.jubjub.pk),
});

/**
 * A registration an enrolled device writes under the live roster key it
 * opens from its own envelopes, naming whatever keys it likes.
 */
const plantedRegistration = async (
  planter: Device,
  account: PassportAccountInfo,
  named: DeviceReader,
): Promise<Uint8Array> => {
  const ledger = simulated().ledger();
  const { registration } = await planter.encryptionKey.sealToDevice(
    network.networkId,
    {
      account: AccAddress(account.address),
      encKey: ledger.enc_key,
      envelopes: deviceEnvelopes(
        inboxEntries(ledger),
        ByteArray.fromHex(HexBytes((await readerOf(planter)).readerPublicKey)),
      ),
    },
    { ...named, epoch: ledger.device_epoch, counter: 0n },
  );
  return registration;
};

/** A device's keyring over the account as the chain holds it, at `encKey` or the live one. */
const keyringOf = async (
  owner: Device,
  account: PassportAccountInfo,
  encKey = simulated().ledger().enc_key,
): Promise<AccountKeyring> => ({
  account: AccAddress(account.address),
  encKey,
  envelopes: deviceEnvelopes(
    inboxEntries(simulated().ledger()),
    ByteArray.fromHex(HexBytes((await readerOf(owner)).readerPublicKey)),
  ),
});

/**
 * Signs and applies the replace that keeps the authority a device's live
 * roster key derives, as proof the device holds the authority.
 */
const maintainAs = async (
  owner: Device,
  account: PassportAccountInfo,
  encKey?: Uint8Array,
): Promise<void> => {
  const { committee, counter } = simulated().maintenanceAuthority();
  const [authority] = committee;
  const changes = { kind: 'replace-authority', authority } as const;
  const { signature } = await owner.encryptionKey.signMaintenanceUpdate(
    network.networkId,
    {
      keyring: await keyringOf(owner, account, encKey),
      authority,
      counter,
      changes,
    },
  );
  simulated().maintain(
    maintenanceUpdateOf(ledgerV9, {
      address: AccAddress(account.address),
      counter,
      changes,
    }).addSignature(0n, signature),
  );
};

/** The entry a device's key derives at use counter 0 on the account. */
const firstEntryOf = (owner: Device, account: PassportAccountInfo): string =>
  HexBytes.fromByteArray(
    owner.jubjub.entryAt(
      ByteArray.fromHex(HexBytes(account.address)),
      simulated().ledger().device_epoch,
      0n,
    ),
  );

/**
 * Creates an account on `first` and enrols `second` with its keys handed
 * over, then signs both in from their own records.
 */
const twoDeviceAccount = async (first: Device, second: Device) => {
  chain.scalar = first.scalar;
  const created = await createAccount({ lockAccount: false }, first.context);
  await addDevice(
    {
      ...callInput(created),
      commitmentHex: firstEntryOf(second, created.account),
      reader: await readerOf(second),
    },
    first.context,
  );
  second.store.adopt(freshRecord(created.account));
  return {
    account: created.account,
    firstIn: await signIn(first.context),
    secondIn: await signIn(second.context),
  };
};

/** Adds `third` to an account `first` created, with its keys handed over. */
const addThird = async (
  first: Device,
  third: Device,
  account: PassportAccountInfo,
): Promise<void> => {
  await addDevice(
    {
      ...callInput(await signIn(first.context)),
      commitmentHex: firstEntryOf(third, account),
      reader: await readerOf(third),
    },
    first.context,
  );
  third.store.adopt(freshRecord(account));
};

/** A reader key nobody holds, paired with a live device's key. */
const strangerFor = (owner: Device): DeviceReader => ({
  readerPublicKey: HexBytes.fromByteArray(
    x25519.getPublicKey(x25519.utils.randomSecretKey()),
  ),
  devicePublicKey: encodeDevicePublicKey(owner.jubjub.pk),
});

const valuesOf = async (account: PassportAccountInfo, owner: Device) =>
  (await readShieldedHoldings({ account }, owner.context)).holdings
    .map(holding => holding.value)
    .sort();

/** The record a device holds before its first sign-in: the account alone. */
const freshRecord = (account: PassportAccountInfo): PassportAccountRecord => ({
  address: account.address,
  bindingVersion: account.bindingVersion,
  localUseCounter: '0',
});

const callInput = (
  state: Pick<FlowAccountState, 'account' | 'devices' | 'localUseCounter'>,
) => ({
  account: state.account,
  devices: state.devices,
  localUseCounter: state.localUseCounter,
});

const readSecret = new Uint8Array(32).fill(0x51);
const grantee = new JubjubDevice(55n);
const readScope: GrantScopeInput = {
  grantee: {
    scheme: 'jubjub-schnorr',
    publicKey: HexBytes.fromByteArray(
      jubjub.Point.fromAffine(grantee.pk).toBytes(),
    ),
  },
  operations: ['withdraw-unshielded', 'withdraw-shielded'],
  color: TokenColor('00'.repeat(32)),
  recipient: { kind: 'any' },
  maxCoinValue: '300',
  perCallCap: '300',
  cap: '450',
  expiresAt: null,
  read: true,
  rpId,
  readPublicKey: HexBytes.fromByteArray(x25519.getPublicKey(readSecret)),
};

describe(
  'account keys over the simulated contract',
  { timeout: 60_000 },
  () => {
    beforeEach(() => {
      chain.sim = undefined;
      chain.actions = [];
      chain.outputs = new Map();
      chain.failMaintenance = false;
    });

    it('delivers the keys to a joining device, survives record loss, rebuilds grants and drops a removed device', async () => {
      const first = device();
      const second = device();
      chain.scalar = first.scalar;

      const created = await createAccount(
        { lockAccount: false },
        first.context,
      );
      const { account } = created;
      expect(created.encKey).toBe(
        HexBytes.fromByteArray(simulated().ledger().enc_key),
      );
      const early = await deposit(7n);

      const secondCommitment = HexBytes.fromByteArray(
        second.jubjub.entryAt(
          ByteArray.fromHex(HexBytes(account.address)),
          simulated().ledger().device_epoch,
          0n,
        ),
      );
      const added = await addDevice(
        {
          ...callInput(created),
          commitmentHex: secondCommitment,
          reader: {
            readerPublicKey: HexBytes.fromByteArray(
              await second.encryptionKey.readerPublicKey(network.networkId),
            ),
            devicePublicKey: encodeDevicePublicKey(second.jubjub.pk),
          },
        },
        first.context,
      );
      expect(added.devices).toHaveLength(2);

      first.store.lose();
      second.store.adopt(freshRecord(account));
      const secondIn = await signIn(second.context);
      expect(secondIn.encKey).toBe(created.encKey);
      expect(secondIn.devices.filter(row => row.isLocal)).toHaveLength(1);
      await expect(valuesOf(account, second)).resolves.toEqual([
        early.value.toString(),
      ]);

      first.store.adopt(freshRecord(account));
      const firstIn = await signIn(first.context);
      const issued = await issueGrant(
        { ...callInput(firstIn), scope: readScope },
        first.context,
      );
      expect(issued.unsealedGrantIds).toEqual([]);
      expect(issued.encKey).not.toBe(created.encKey);
      await expect(valuesOf(account, second)).resolves.toEqual([
        early.value.toString(),
      ]);

      first.store.lose();
      first.store.adopt(freshRecord(account));
      const rebuilt = await signIn(first.context);
      const grant = rebuilt.grants.find(record => record.id === issued.grantId);
      expect(grant?.opening).toMatchObject({
        granteePublicKey: readScope.grantee.publicKey,
        origin: rpId,
        color: readScope.color,
        recipient: readScope.recipient,
        maxCoinValue: readScope.maxCoinValue,
        view: {
          readPublicKey: readScope.readPublicKey,
          sealedEncKey: issued.encKey,
        },
      });
      const sealed = await openGrantViewSeal(
        readSecret,
        ByteArray.fromHex(HexBytes(grant?.opening?.view?.seal ?? '')),
        { grantId: issued.grantId, account: account.address as never },
      );
      expect(isLiveSecret(sealed, simulated().ledger().enc_key)).toBe(true);

      const secondAgain = await signIn(second.context);
      const firstRow = secondAgain.devices.find(row => !row.isLocal);
      const removed = await removeDevice(
        { ...callInput(secondAgain), commitmentHex: firstRow!.commitmentHex },
        second.context,
      );
      expect(removed.devices).toHaveLength(1);
      expect(removed.encKey).toBe(
        HexBytes.fromByteArray(simulated().ledger().enc_key),
      );
      const late = await deposit(9n);

      await expect(valuesOf(account, second)).resolves.toEqual(
        [early.value.toString(), late.value.toString()].sort(),
      );
      await expect(signIn(second.context)).resolves.toMatchObject({
        encKey: removed.encKey,
      });
      await expect(valuesOf(account, first)).rejects.toBeInstanceOf(
        EncryptionKeyMismatchError,
      );
      await expect(signIn(first.context)).rejects.toBeInstanceOf(
        EncryptionKeyMismatchError,
      );
    });

    it('leaves a device enrolled without its reader key unable to read', async () => {
      const first = device();
      const second = device();
      chain.scalar = first.scalar;
      const created = await createAccount(
        { lockAccount: false },
        first.context,
      );
      await addDevice(
        {
          ...callInput(created),
          commitmentHex: HexBytes.fromByteArray(
            second.jubjub.entryAt(
              ByteArray.fromHex(HexBytes(created.account.address)),
              simulated().ledger().device_epoch,
              0n,
            ),
          ),
        },
        first.context,
      );
      second.store.adopt(freshRecord(created.account));

      await expect(signIn(second.context)).rejects.toBeInstanceOf(
        EncryptionKeyMismatchError,
      );
      await expect(valuesOf(created.account, second)).resolves.toEqual([]);
      await deposit(3n);
      await expect(valuesOf(created.account, second)).rejects.toBeInstanceOf(
        EncryptionKeyMismatchError,
      );
    });

    it('seals nothing to a removed device that planted its reader for another live device', async () => {
      const first = device();
      const second = device();
      const { account, secondIn } = await twoDeviceAccount(first, second);
      await appendThroughDeposit(
        await plantedRegistration(first, account, {
          readerPublicKey: (await readerOf(first)).readerPublicKey,
          devicePublicKey: encodeDevicePublicKey(second.jubjub.pk),
        }),
      );
      const firstRow = secondIn.devices.find(row => !row.isLocal);

      const removed = await removeDevice(
        { ...callInput(secondIn), commitmentHex: firstRow!.commitmentHex },
        second.context,
      );

      expect(removed.droppedDevices).toEqual([]);
      expect(removed.encKey).toBe(
        HexBytes.fromByteArray(simulated().ledger().enc_key),
      );
      await expect(signIn(first.context)).rejects.toBeInstanceOf(
        EncryptionKeyMismatchError,
      );
      await expect(signIn(second.context)).resolves.toMatchObject({
        encKey: removed.encKey,
      });
    });

    it('drops a device whose registration another planted a conflict for, and still removes', async () => {
      const first = device();
      const second = device();
      const third = device();
      const { account } = await twoDeviceAccount(first, second);
      await addThird(first, third, account);
      const thirdEntry = (await signIn(third.context)).devices.find(
        row => row.isLocal,
      )!.commitmentHex;
      await appendThroughDeposit(
        await plantedRegistration(second, account, strangerFor(third)),
      );
      const firstIn = await signIn(first.context);
      const secondRow = firstIn.devices.find(
        row => !row.isLocal && row.commitmentHex !== thirdEntry,
      );

      const removed = await removeDevice(
        { ...callInput(firstIn), commitmentHex: secondRow!.commitmentHex },
        first.context,
      );

      expect(removed.droppedDevices).toEqual([thirdEntry]);
      await expect(signIn(second.context)).rejects.toBeInstanceOf(
        EncryptionKeyMismatchError,
      );
      await expect(signIn(third.context)).rejects.toBeInstanceOf(
        EncryptionKeyMismatchError,
      );
      await expect(signIn(first.context)).resolves.toMatchObject({
        encKey: removed.encKey,
      });
    });

    it('issues and revokes a read grant over a planted conflict, dropping the device in conflict', async () => {
      const first = device();
      const second = device();
      const { account, firstIn } = await twoDeviceAccount(first, second);
      const secondEntry = firstIn.devices.find(
        row => !row.isLocal,
      )!.commitmentHex;
      await appendThroughDeposit(
        await plantedRegistration(first, account, strangerFor(second)),
      );

      const issued = await issueGrant(
        { ...callInput(firstIn), scope: readScope },
        first.context,
      );
      expect(issued.droppedDevices).toEqual([secondEntry]);

      const revoked = await revokeGrant(
        {
          account,
          devices: issued.devices,
          localUseCounter: issued.localUseCounter,
          grantId: issued.grantId,
        },
        first.context,
      );
      expect(revoked.droppedDevices).toEqual([secondEntry]);
      expect(revoked.encKey).toBe(
        HexBytes.fromByteArray(simulated().ledger().enc_key),
      );
      await expect(signIn(second.context)).rejects.toBeInstanceOf(
        EncryptionKeyMismatchError,
      );
      await expect(signIn(first.context)).resolves.toMatchObject({
        encKey: revoked.encKey,
      });
    });

    it('rotates through junk registrations landing while it runs', async () => {
      const first = device();
      const second = device();
      const { firstIn } = await twoDeviceAccount(first, second);
      const junk = crypto.getRandomValues(new Uint8Array(192));
      junk[0] = 0xd2;
      junk[1] = 0x02;
      chain.afterCall = async circuit => {
        if (circuit === 'append_inbox_with_jubjub') {
          await appendThroughDeposit(junk);
        }
      };

      const issued = await issueGrant(
        { ...callInput(firstIn), scope: readScope },
        first.context,
      );

      expect(issued.encKey).toBe(
        HexBytes.fromByteArray(simulated().ledger().enc_key),
      );
      await expect(signIn(second.context)).resolves.toMatchObject({
        encKey: issued.encKey,
      });
    });

    it('seals nothing to a removed device that planted its reader under a key of nobody', async () => {
      const first = device();
      const second = device();
      const { account, secondIn } = await twoDeviceAccount(first, second);
      await appendThroughDeposit(
        await plantedRegistration(first, account, {
          readerPublicKey: (await readerOf(first)).readerPublicKey,
          devicePublicKey: encodeDevicePublicKey(JubjubDevice.generate().pk),
        }),
      );
      const firstRow = secondIn.devices.find(row => !row.isLocal);

      const removed = await removeDevice(
        { ...callInput(secondIn), commitmentHex: firstRow!.commitmentHex },
        second.context,
      );

      expect(removed.encKey).toBe(
        HexBytes.fromByteArray(simulated().ledger().enc_key),
      );
      await expect(signIn(first.context)).rejects.toBeInstanceOf(
        EncryptionKeyMismatchError,
      );
      await expect(signIn(second.context)).resolves.toMatchObject({
        encKey: removed.encKey,
      });
    });

    it('refuses a rotation whose roster gained a registration before enc_key was replaced', async () => {
      const first = device();
      const second = device();
      const joiner = device();
      const { account, firstIn } = await twoDeviceAccount(first, second);
      const before = HexBytes.fromByteArray(simulated().ledger().enc_key);
      const landed = await plantedRegistration(
        second,
        account,
        await readerOf(joiner),
      );
      chain.afterCall = async circuit => {
        if (circuit === 'append_inbox_with_jubjub') {
          await appendThroughDeposit(landed);
        }
      };

      await expect(
        issueGrant({ ...callInput(firstIn), scope: readScope }, first.context),
      ).rejects.toBeInstanceOf(DeviceRosterInvalidError);
      expect(HexBytes.fromByteArray(simulated().ledger().enc_key)).toBe(before);
    });

    it('hands an interrupted enrolment its keys once it lands, a rotation in between passing it over', async () => {
      const first = device();
      const second = device();
      const joiner = device();
      const { account, firstIn } = await twoDeviceAccount(first, second);
      const joinerCommitment = firstEntryOf(joiner, account);
      chain.failCircuit = 'add_device_with_jubjub';

      await expect(
        addDevice(
          {
            ...callInput(firstIn),
            commitmentHex: joinerCommitment,
            reader: await readerOf(joiner),
          },
          first.context,
        ),
      ).rejects.toThrow('interrupted');
      expect(
        simulated()
          .ledger()
          .devices.member(ByteArray.fromHex(HexBytes(joinerCommitment))),
      ).toBe(false);

      const rotated = await issueGrant(
        { ...callInput(await signIn(first.context)), scope: readScope },
        first.context,
      );
      expect(rotated.encKey).toBe(
        HexBytes.fromByteArray(simulated().ledger().enc_key),
      );

      joiner.store.adopt(freshRecord(account));
      await expect(signIn(joiner.context)).rejects.toBeInstanceOf(
        EncryptionKeyMismatchError,
      );

      const refreshed = await signIn(first.context);
      const added = await addDevice(
        {
          ...callInput(refreshed),
          commitmentHex: joinerCommitment,
          reader: await readerOf(joiner),
        },
        first.context,
      );
      expect(added.encKey).toBe(
        HexBytes.fromByteArray(simulated().ledger().enc_key),
      );
      expect(added.encKey).not.toBe(rotated.encKey);
      const held = await deposit(11n);

      await expect(signIn(joiner.context)).resolves.toMatchObject({
        encKey: added.encKey,
      });
      await expect(valuesOf(account, joiner)).resolves.toEqual([
        held.value.toString(),
      ]);
    });

    it('hands a joining device a fresh secret while a read grant is live, so an envelope a grantee sealed with the live secret ahead of it captures nothing', async () => {
      const first = device();
      const joiner = device();
      chain.scalar = first.scalar;
      const created = await createAccount(
        { lockAccount: false },
        first.context,
      );
      const { account } = created;
      const issued = await issueGrant(
        { ...callInput(created), scope: readScope },
        first.context,
      );
      const grant = issued.grants.find(record => record.id === issued.grantId);
      const liveSecret = await openGrantViewSeal(
        readSecret,
        ByteArray.fromHex(HexBytes(grant?.opening?.view?.seal ?? '')),
        { grantId: issued.grantId, account: account.address as never },
      );
      expect(isLiveSecret(liveSecret, simulated().ledger().enc_key)).toBe(true);
      const joinerReader = await readerOf(joiner);
      const forgedRoster = crypto.getRandomValues(new Uint8Array(32));
      const attacker: DeviceReader = {
        readerPublicKey: HexBytes.fromByteArray(
          x25519.getPublicKey(x25519.utils.randomSecretKey()),
        ),
        devicePublicKey: encodeDevicePublicKey(joiner.jubjub.pk),
      };
      await appendThroughDeposit(
        await sealDeviceEnvelope(
          ByteArray.fromHex(HexBytes(joinerReader.readerPublicKey)),
          { secret: liveSecret, rosterKey: forgedRoster },
        ),
      );
      await appendThroughDeposit(
        await sealDeviceRegistration(forgedRoster, attacker),
      );

      const added = await addDevice(
        {
          ...callInput(await signIn(first.context)),
          commitmentHex: firstEntryOf(joiner, account),
          reader: joinerReader,
        },
        first.context,
      );
      expect(added.encKey).toBe(
        HexBytes.fromByteArray(simulated().ledger().enc_key),
      );
      expect(added.encKey).not.toBe(issued.encKey);
      joiner.store.adopt(freshRecord(account));
      const joinerIn = await signIn(joiner.context);
      expect(joinerIn.encKey).toBe(added.encKey);
      await expect(maintainAs(joiner, account)).resolves.toBeUndefined();

      const revoked = await revokeGrant(
        { ...callInput(joinerIn), grantId: issued.grantId },
        joiner.context,
      );
      const attackerKey = ByteArray.fromHex(HexBytes(attacker.readerPublicKey));
      expect(
        deviceEnvelopes(inboxEntries(simulated().ledger()), attackerKey),
      ).toEqual([]);
      expect(revoked.encKey).toBe(
        HexBytes.fromByteArray(simulated().ledger().enc_key),
      );
      await expect(signIn(first.context)).resolves.toMatchObject({
        encKey: revoked.encKey,
      });
    });

    it('moves the maintenance authority to the new roster key on a removal, out of reach of the removed device', async () => {
      const first = device();
      const second = device();
      const { account, firstIn } = await twoDeviceAccount(first, second);
      const before = simulated().maintenanceAuthority();
      const encKeyBefore = simulated().ledger().enc_key;
      await maintainAs(second, account);
      const secondRow = firstIn.devices.find(row => !row.isLocal);

      await removeDevice(
        { ...callInput(firstIn), commitmentHex: secondRow!.commitmentHex },
        first.context,
      );

      const after = simulated().maintenanceAuthority();
      expect(after.committee).toHaveLength(1);
      expect(after.committee).not.toEqual(before.committee);
      expect(after.counter).toBe(before.counter + 2n);
      await expect(maintainAs(first, account)).resolves.toBeUndefined();
      await expect(
        maintainAs(second, account, encKeyBefore),
      ).rejects.toBeInstanceOf(MaintenanceAuthorityMismatchError);
    });

    it('moves the maintenance authority on a removal however many envelopes anyone sealed to the remover', async () => {
      const first = device();
      const second = device();
      const { account, firstIn } = await twoDeviceAccount(first, second);
      const readerPublicKey = ByteArray.fromHex(
        HexBytes((await readerOf(first)).readerPublicKey),
      );
      for (let index = 0; index <= MAX_KEYRING_SECRETS; index++) {
        await appendThroughDeposit(
          await sealDeviceEnvelope(readerPublicKey, {
            secret: x25519.utils.randomSecretKey(),
            rosterKey: crypto.getRandomValues(new Uint8Array(32)),
          }),
        );
      }
      const before = simulated().maintenanceAuthority();
      const secondRow = firstIn.devices.find(row => !row.isLocal);

      await removeDevice(
        { ...callInput(firstIn), commitmentHex: secondRow!.commitmentHex },
        first.context,
      );

      const after = simulated().maintenanceAuthority();
      expect(after.committee).not.toEqual(before.committee);
      expect(after.counter).toBe(before.counter + 1n);
      await expect(maintainAs(first, account)).resolves.toBeUndefined();
    });

    it('completes a removal run again after its maintenance update failed', async () => {
      const first = device();
      const second = device();
      const { account, firstIn } = await twoDeviceAccount(first, second);
      const before = simulated().maintenanceAuthority();
      const commitmentHex = firstIn.devices.find(
        row => !row.isLocal,
      )!.commitmentHex;
      chain.failMaintenance = true;

      await expect(
        removeDevice({ ...callInput(firstIn), commitmentHex }, first.context),
      ).rejects.toThrow('interrupted');
      expect(simulated().maintenanceAuthority()).toEqual(before);

      await removeDevice(
        { ...callInput(await signIn(first.context)), commitmentHex },
        first.context,
      );

      const after = simulated().maintenanceAuthority();
      expect(after.committee).not.toEqual(before.committee);
      expect(after.counter).toBe(before.counter + 1n);
      await expect(maintainAs(first, account)).resolves.toBeUndefined();
      expect(
        simulated()
          .ledger()
          .devices.member(ByteArray.fromHex(HexBytes(commitmentHex))),
      ).toBe(false);
    });

    it('completes a removal run again after the authority moved but the device stayed', async () => {
      const first = device();
      const second = device();
      const { account, firstIn } = await twoDeviceAccount(first, second);
      const before = simulated().maintenanceAuthority();
      const commitmentHex = firstIn.devices.find(
        row => !row.isLocal,
      )!.commitmentHex;
      chain.failCircuit = 'remove_device_with_jubjub';

      await expect(
        removeDevice({ ...callInput(firstIn), commitmentHex }, first.context),
      ).rejects.toThrow('interrupted');
      const moved = simulated().maintenanceAuthority();
      expect(moved.committee).not.toEqual(before.committee);
      expect(moved.counter).toBe(before.counter + 1n);

      await removeDevice(
        { ...callInput(await signIn(first.context)), commitmentHex },
        first.context,
      );

      const after = simulated().maintenanceAuthority();
      expect(after.committee).not.toEqual(moved.committee);
      expect(after.counter).toBe(before.counter + 2n);
      await expect(maintainAs(first, account)).resolves.toBeUndefined();
      expect(
        simulated()
          .ledger()
          .devices.member(ByteArray.fromHex(HexBytes(commitmentHex))),
      ).toBe(false);
    });

    it('leaves the empty committee of a locked account alone on a removal', async () => {
      const first = device();
      const second = device();
      chain.scalar = first.scalar;
      const created = await createAccount({ lockAccount: true }, first.context);
      await addDevice(
        {
          ...callInput(created),
          commitmentHex: firstEntryOf(second, created.account),
          reader: await readerOf(second),
        },
        first.context,
      );
      const firstIn = await signIn(first.context);
      const secondRow = firstIn.devices.find(row => !row.isLocal);

      await removeDevice(
        { ...callInput(firstIn), commitmentHex: secondRow!.commitmentHex },
        first.context,
      );

      expect(simulated().maintenanceAuthority()).toEqual({
        committee: [],
        threshold: 1,
        counter: 0n,
      });
    });
  },
);
