/**
 * A device whose live envelope is buried under more envelopes than one
 * request carries, end to end: the real flows run over an Account
 * Custody Contract executed in process, once with the passkey seams on
 * the device and once through the hosted signer serving the same
 * passkey. The per-request cap is lowered for this file, so the codec,
 * the signer handlers and the remote encryption key all page at a few
 * envelopes rather than thousands, and only the network infrastructure
 * is stood in for, as in the account keys simulation.
 */
import { createSignerClient, serveSignerRequests } from '@lace-lib/passkey';
import { HexBytes } from '@lace-lib/util';
import { x25519 } from '@noble/curves/ed25519.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { devJubjubAuthoriser } from '../../src/acc/dev-authoriser';
import { devEncryptionKey } from '../../src/acc/dev-encryption-key';
import { deviceEntryOf } from '../../src/acc/device-readers';
import {
  deviceEnvelopes,
  encodeDevicePublicKey,
  sealDeviceEnvelope,
} from '../../src/acc/envelopes';
import {
  MAX_INBOX_ENTRIES_PER_REQUEST,
  sealInboxEntry,
} from '../../src/acc/inbox';
import { inboxEntries } from '../../src/acc/inbox-walk';
import { randomJubjubScalar } from '../../src/acc/signer';
import { createPasskeyEncryptionKey } from '../../src/ceremony/encryption-key';
import { createPasskeyAuthoriser } from '../../src/ceremony/passkey';
import { createAccount } from '../../src/flows/create-account';
import { addDevice, removeDevice } from '../../src/flows/devices';
import { readShieldedHoldings } from '../../src/flows/holdings';
import { signIn } from '../../src/flows/sign-in';
import { createRemotePassportAuthoriser } from '../../src/remote/remote-authoriser';
import { createRemoteEncryptionKey } from '../../src/remote/remote-encryption-key';
import { createPassportSignerHandlers } from '../../src/remote/signer-handlers';
import {
  createFakePasskey,
  createInMemoryStorage,
} from '../remote/fake-passkey';
import { createWindowPair, SIGNER_URL } from '../remote/fake-windows';

import { AccountSim } from './account-sim';

import type * as GatedCall from '../../src/acc/gated-call';
import type { GatedContractHandle } from '../../src/acc/gated-call';
import type * as Inbox from '../../src/acc/inbox';
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
  MaintenanceVerifyingKey,
  PassportAccountInfo,
  PassportAuthoriser,
  PassportEncryptionKey,
  ShieldedCoin,
} from '@lace-contract/passport';
import type { SignerRequestHandlers } from '@lace-lib/passkey';
import type { MaintenanceUpdate, Signature } from '@midnightntwrk/ledger-v9';

const chain = vi.hoisted(() => ({
  sim: undefined as AccountSim | undefined,
  scalar: 0n,
  actions: [] as ContractActionRecord[],
  outputs: new Map<string, ShieldedOutputRecord[]>(),
}));

const simulated = (): AccountSim => {
  if (!chain.sim) throw new Error('No simulated account is deployed');
  return chain.sim;
};

vi.mock('../../src/acc/inbox', async importOriginal => ({
  ...(await importOriginal<typeof Inbox>()),
  MAX_INBOX_ENTRIES_PER_REQUEST: 4,
}));
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
  connectAccountHandle: async (): Promise<GatedContractHandle> =>
    simulated().handle(),
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
      handoverAuthority,
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

/** The flow context of a device over its two key seams, with its own record store. */
const contextOver = (
  passportAuthoriser: PassportAuthoriser,
  passportEncryptionKey: PassportEncryptionKey,
) => {
  let stored: PassportAccountRecord | undefined;
  const accountRecords: AccountRecords = {
    read: async () => stored,
    write: async record => {
      stored = record;
    },
    presence: async () => {
      if (!stored) return 'absent';
      return stored.deployment ? 'pending' : 'complete';
    },
  };
  const context: FlowContext = {
    seams: {
      passportAuthoriser,
      passportEncryptionKey,
      passportSponsor: { balanceAndSign: vi.fn() },
      passportProver: { prove: vi.fn(), check: vi.fn() },
      passportNetwork: network,
    },
    accountRecords,
    onProgress: vi.fn(),
    rpId: 'lace.io',
  };
  return {
    context,
    adopt: (record: PassportAccountRecord) => {
      stored = record;
    },
  };
};

const unsupported = async (): Promise<never> => {
  throw new Error('Not served by the Passport handlers.');
};

/**
 * The seams a dApp holds over the hosted signer serving a passkey, through
 * the real signer client and server, with the pages the signer was asked
 * to find the live envelope in, the keyrings it was asked to sign a
 * maintenance update over, and what closes the connection.
 */
const hostedSigner = async () => {
  const pair = createWindowPair();
  const passport = createPassportSignerHandlers({
    keySource: createFakePasskey().keySource,
    createKeyValueStorage: createInMemoryStorage().createKeyValueStorage,
  });
  const findLiveEnvelope = vi.fn(passport['find-live-envelope']);
  const signMaintenanceUpdate = vi.fn(passport['sign-maintenance-update']);
  const handlers: SignerRequestHandlers = {
    ...passport,
    'find-live-envelope': findLiveEnvelope,
    'sign-maintenance-update': signMaintenanceUpdate,
    'sign-cardano-tx': unsupported,
    'sign-cardano-data': unsupported,
    'cardano-account-public-key': unsupported,
    'cardano-custody-public-key': unsupported,
    'sign-cardano-custody-tx': unsupported,
    'sign-cardano-custody-data': unsupported,
  };
  const client = createSignerClient({
    signerUrl: SIGNER_URL,
    host: pair.dappHost,
  });
  client.open();
  const stop = serveSignerRequests({
    handlers,
    assertOriginAllowed: () => undefined,
    onRequest: async () => 'approve' as const,
    host: pair.signerHost,
  });
  await client.connect();
  return {
    authoriser: createRemotePassportAuthoriser(client),
    encryptionKey: createRemoteEncryptionKey(client),
    pages: () =>
      findLiveEnvelope.mock.calls.map(
        ([{ keyring }]) => keyring.envelopes.length,
      ),
    maintenancePages: () =>
      signMaintenanceUpdate.mock.calls.map(
        ([{ keyring }]) => keyring.envelopes.length,
      ),
    close: () => {
      stop();
      client.close();
    },
  };
};

/** Deposits a coin sealed to the account's current `enc_key`, as a sender would. */
const deposit = async (value: bigint): Promise<ShieldedCoin> => {
  const sim = simulated();
  const coin: ShieldedCoin = {
    nonce: crypto.getRandomValues(new Uint8Array(32)),
    color: crypto.getRandomValues(new Uint8Array(32)),
    value,
  };
  const commitment = await sim.deposit(
    coin,
    await sealInboxEntry(sim.ledger().enc_key, coin),
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
  return coin;
};

/** Appends any bytes to the inbox through the permissionless deposit, as anyone may. */
const appendThroughDeposit = async (entry: Uint8Array): Promise<void> => {
  await simulated().deposit(
    {
      nonce: crypto.getRandomValues(new Uint8Array(32)),
      color: crypto.getRandomValues(new Uint8Array(32)),
      value: 1n,
    },
    entry,
  );
};

const valuesOf = async (account: PassportAccountInfo, context: FlowContext) =>
  (await readShieldedHoldings({ account }, context)).holdings.map(
    holding => holding.value,
  );

const callInput = (
  state: Pick<FlowAccountState, 'account' | 'devices' | 'localUseCounter'>,
) => ({
  account: state.account,
  devices: state.devices,
  localUseCounter: state.localUseCounter,
});

describe(
  'a device buried under more envelopes than one request carries',
  { timeout: 60_000 },
  () => {
    beforeEach(() => {
      chain.sim = undefined;
      chain.actions = [];
      chain.outputs = new Map();
    });

    it('signs in, reads, rotates and moves the maintenance authority, locally and through the hosted signer', async () => {
      expect(MAX_INBOX_ENTRIES_PER_REQUEST).toBe(4);
      const scalar = randomJubjubScalar();
      chain.scalar = scalar;
      const first = contextOver(
        devJubjubAuthoriser(scalar),
        devEncryptionKey(),
      );
      const created = await createAccount(
        { lockAccount: false },
        first.context,
      );
      const { account } = created;
      const early = await deposit(7n);
      const passkey = createFakePasskey();
      const authoriser = createPasskeyAuthoriser({
        keySource: passkey.keySource,
      });
      const encryptionKey = createPasskeyEncryptionKey(passkey.keySource);
      const readerPublicKey = await encryptionKey.readerPublicKey(
        network.networkId,
      );
      const devicePublicKey = encodeDevicePublicKey(
        await authoriser.devicePublicKey(),
      );
      await addDevice(
        {
          ...callInput(created),
          commitmentHex: deviceEntryOf(
            {
              address: account.address,
              epoch: simulated().ledger().device_epoch,
            },
            devicePublicKey,
            0n,
          )!,
          reader: {
            readerPublicKey: HexBytes.fromByteArray(readerPublicKey),
            devicePublicKey,
          },
        },
        first.context,
      );
      const [live] = deviceEnvelopes(
        inboxEntries(simulated().ledger()),
        readerPublicKey,
      );
      for (let index = 0; index <= MAX_INBOX_ENTRIES_PER_REQUEST; index++) {
        const copied = live.slice();
        copied.set(crypto.getRandomValues(new Uint8Array(126)), 66);
        await appendThroughDeposit(copied);
        await appendThroughDeposit(
          await sealDeviceEnvelope(readerPublicKey, {
            secret: x25519.utils.randomSecretKey(),
            rosterKey: crypto.getRandomValues(new Uint8Array(32)),
          }),
        );
      }
      expect(
        deviceEnvelopes(inboxEntries(simulated().ledger()), readerPublicKey),
      ).toHaveLength(MAX_INBOX_ENTRIES_PER_REQUEST + 2);
      const handedOver = simulated().maintenanceAuthority();
      const buried = {
        sim: simulated().fork(),
        actions: [...chain.actions],
        outputs: new Map(chain.outputs),
      };

      const readsAndRotates = async ({
        context,
        adopt,
      }: ReturnType<typeof contextOver>) => {
        adopt({
          address: account.address,
          bindingVersion: account.bindingVersion,
          localUseCounter: '0',
        });
        const signedIn = await signIn(context);
        expect(signedIn.encKey).toBe(created.encKey);
        await expect(valuesOf(account, context)).resolves.toEqual([
          early.value.toString(),
        ]);
        const removed = await removeDevice(
          {
            ...callInput(signedIn),
            commitmentHex: signedIn.devices.find(row => !row.isLocal)!
              .commitmentHex,
          },
          context,
        );
        expect(removed.encKey).toBe(
          HexBytes.fromByteArray(simulated().ledger().enc_key),
        );
        expect(removed.encKey).not.toBe(created.encKey);
        await expect(valuesOf(account, context)).resolves.toEqual([
          early.value.toString(),
        ]);
        const { committee, counter } = simulated().maintenanceAuthority();
        expect(committee).toHaveLength(1);
        expect(committee).not.toEqual(handedOver.committee);
        expect(counter).toBe(handedOver.counter + 1n);
      };

      await readsAndRotates(contextOver(authoriser, encryptionKey));
      chain.sim = buried.sim;
      chain.actions = buried.actions;
      chain.outputs = buried.outputs;
      expect(HexBytes.fromByteArray(simulated().ledger().enc_key)).toBe(
        created.encKey,
      );
      const signer = await hostedSigner();
      try {
        await readsAndRotates(
          contextOver(signer.authoriser, signer.encryptionKey),
        );
        expect(signer.pages().length).toBeGreaterThan(1);
        expect(
          signer
            .pages()
            .every(length => length <= MAX_INBOX_ENTRIES_PER_REQUEST),
        ).toBe(true);
        expect(signer.maintenancePages().length).toBeGreaterThan(1);
        expect(
          signer
            .maintenancePages()
            .every(length => length <= MAX_INBOX_ENTRIES_PER_REQUEST),
        ).toBe(true);
      } finally {
        signer.close();
      }
    });
  },
);
