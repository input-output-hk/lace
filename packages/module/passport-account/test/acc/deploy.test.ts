import { beforeEach, describe, expect, it, vi } from 'vitest';

import { pureCircuits } from '../../src/acc/acc-module';
import { accountWitnesses, deployAccount } from '../../src/acc/deploy';
import { devJubjubAuthoriser } from '../../src/acc/dev-authoriser';

import type { AccountPrivateState, AccProviders } from '../../src/acc/deploy';

const ledgerMocks = vi.hoisted(() => {
  const gatedBases = [
    'withdraw_unshielded',
    'append_inbox',
    'withdraw_shielded',
    'withdraw_shielded_to_contract',
    'rotate_enc_key',
    'add_device',
    'remove_device',
  ];
  const allOperations = new Set([
    'deposit_unshielded',
    'deposit_shielded',
    ...['jubjub', 'k256'].flatMap(arm =>
      ['activate_initial_device', ...gatedBases].map(
        base => `${base}_with_${arm}`,
      ),
    ),
  ]);
  const fullState = {
    data: { tag: 'charged-state' },
    maintenanceAuthority: {
      committee: ['deploy-authority-key'],
      threshold: 1,
      counter: 0n,
    },
    operation: (name: string) =>
      allOperations.has(name) ? { operation: name } : undefined,
  };

  class ContractState {
    public static deserialize = vi.fn(() => fullState);
    public data: unknown;
    public maintenanceAuthority: unknown;
    public readonly operations = new Map<string, unknown>();

    public setOperation(name: string, operation: unknown): void {
      this.operations.set(name, operation);
    }

    public operation(name: string): unknown {
      return this.operations.get(name);
    }
  }

  class ContractDeploy {
    public static instances: ContractDeploy[] = [];
    public readonly address = 'deployed-address';

    public constructor(readonly initialState: ContractState) {
      ContractDeploy.instances.push(this);
    }
  }

  class ContractMaintenanceAuthority {
    public constructor(
      readonly committee: unknown[],
      readonly threshold: number,
      readonly counter: bigint,
    ) {}
  }

  class ReplaceAuthority {
    public constructor(readonly authority: ContractMaintenanceAuthority) {}
  }

  class MaintenanceUpdate {
    public static instances: MaintenanceUpdate[] = [];
    public readonly dataToSign = new Uint8Array([9, 9, 9]);
    public signature?: { index: bigint; signature: unknown };

    public constructor(
      readonly address: string,
      readonly updates: unknown[],
      readonly counter: bigint,
    ) {
      MaintenanceUpdate.instances.push(this);
    }

    public addSignature(index: bigint, signature: unknown): MaintenanceUpdate {
      this.signature = { index, signature };
      return this;
    }
  }

  const Intent = {
    new: vi.fn(() => ({
      addDeploy: (deploy: unknown) => ({ kind: 'deploy-intent', deploy }),
      addMaintenanceUpdate: (update: unknown) => ({
        kind: 'maintenance-intent',
        update,
      }),
    })),
  };
  const Transaction = {
    fromParts: vi.fn((...parts: unknown[]) => ({
      networkId: parts[0],
      intent: parts[3],
    })),
  };
  const signData = vi.fn((key: unknown, data: unknown) => ({
    signedBy: key,
    data,
  }));

  return {
    ContractState,
    ContractDeploy,
    ContractMaintenanceAuthority,
    ReplaceAuthority,
    MaintenanceUpdate,
    Intent,
    Transaction,
    signData,
    fullState,
  };
});

const contractsMocks = vi.hoisted(() => {
  const activateCall = vi.fn(
    async (): Promise<unknown> => ({ txId: 'activation-tx' }),
  );
  const found = {
    callTx: { activate_initial_device_with_jubjub: activateCall },
  };
  const createUnprovenDeployTx = vi.fn(
    async (
      _providers: unknown,
      options: { compiledContract: unknown; initialPrivateState: unknown },
    ) => ({
      public: {
        initialContractState: { serialize: () => new Uint8Array([1, 2, 3]) },
      },
      private: {
        signingKey: { tag: 'signature', value: 'authority-signing-key' },
        initialPrivateState: options.initialPrivateState,
      },
    }),
  );
  const findDeployedContract = vi.fn(
    async (_providers: unknown, _options: { compiledContract: unknown }) =>
      found,
  );
  const submitTx = vi.fn(async () => ({
    status: 'SucceedEntirely',
    txId: 'tx-id',
  }));
  return {
    createUnprovenDeployTx,
    findDeployedContract,
    submitTx,
    activateCall,
  };
});

vi.mock('@midnightntwrk/ledger-v9', () => ledgerMocks);
vi.mock('@midnight-ntwrk/midnight-js-contracts', () => contractsMocks);
vi.mock('@midnight-ntwrk/midnight-js-network-id', () => ({
  getNetworkId: () => 'test-network',
}));

const providers: AccProviders = {
  publicDataProvider: 'public-data',
  zkConfigProvider: 'zk-config',
  proofProvider: 'proof',
  privateStateProvider: 'private-state',
  walletProvider: 'wallet',
  midnightProvider: 'midnight',
};

const authoriser = devJubjubAuthoriser(7n);
const encKeyPair = {
  publicKey: new Uint8Array(32).fill(1),
  secretKey: new Uint8Array(32).fill(2),
};
const fixedRandomBytes = (length: number) => new Uint8Array(length).fill(7);

const deployProps = {
  providers,
  authoriser,
  encKeyPair,
  lockAccount: false,
  randomBytes: fixedRandomBytes,
};

const JUBJUB_ONLY_OPERATIONS = [
  'deposit_unshielded',
  'deposit_shielded',
  'activate_initial_device_with_jubjub',
  'withdraw_unshielded_with_jubjub',
  'append_inbox_with_jubjub',
  'withdraw_shielded_with_jubjub',
  'withdraw_shielded_to_contract_with_jubjub',
  'rotate_enc_key_with_jubjub',
  'add_device_with_jubjub',
  'remove_device_with_jubjub',
];

describe('deployAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ledgerMocks.ContractDeploy.instances.length = 0;
    ledgerMocks.MaintenanceUpdate.instances.length = 0;
  });

  it('deploys the deposit and jubjub arm operations and nothing else', async () => {
    await deployAccount(deployProps);

    expect(ledgerMocks.ContractDeploy.instances).toHaveLength(1);
    const deployed = ledgerMocks.ContractDeploy.instances[0].initialState;
    expect([...deployed.operations.keys()]).toEqual(JUBJUB_ONLY_OPERATIONS);
    expect(
      [...deployed.operations.keys()].some(name => name.includes('k256')),
    ).toBe(false);
    expect(deployed.data).toBe(ledgerMocks.fullState.data);
    expect(deployed.maintenanceAuthority).toBe(
      ledgerMocks.fullState.maintenanceAuthority,
    );

    expect(ledgerMocks.Intent.new).toHaveBeenCalledWith(expect.any(Date));
    expect(contractsMocks.submitTx).toHaveBeenCalledExactlyOnceWith(providers, {
      unprovenTx: {
        networkId: 'test-network',
        intent: {
          kind: 'deploy-intent',
          deploy: ledgerMocks.ContractDeploy.instances[0],
        },
      },
    });
  });

  it('derives the boot commitment from the authoriser key and the fresh salt', async () => {
    const account = await deployAccount(deployProps);

    const expectedSalt = new Uint8Array(32).fill(7);
    const expectedBoot = pureCircuits.derive_boot_commitment_with_jubjub(
      expectedSalt,
      await authoriser.devicePublicKey(),
    );
    expect(account.salt).toEqual(expectedSalt);
    expect(
      contractsMocks.createUnprovenDeployTx,
    ).toHaveBeenCalledExactlyOnceWith(
      providers,
      expect.objectContaining({
        args: [expectedBoot, encKeyPair.publicKey],
        initialPrivateState: { encSecretKeyHex: '02'.repeat(32), coins: {} },
      }),
    );
  });

  it('generates a fresh salt on every deploy', async () => {
    const first = await deployAccount({
      ...deployProps,
      randomBytes: undefined,
    });
    const second = await deployAccount({
      ...deployProps,
      randomBytes: undefined,
    });

    expect(first.salt).toHaveLength(32);
    expect(second.salt).toHaveLength(32);
    expect(first.salt).not.toEqual(second.salt);
  });

  it('submits exactly one retire-only maintenance update when lockAccount is true', async () => {
    await deployAccount({ ...deployProps, lockAccount: true });

    expect(ledgerMocks.MaintenanceUpdate.instances).toHaveLength(1);
    const update = ledgerMocks.MaintenanceUpdate.instances[0];
    expect(update.address).toBe('deployed-address');
    expect(update.counter).toBe(0n);
    expect(update.updates).toHaveLength(1);

    const retire = update.updates[0] as InstanceType<
      typeof ledgerMocks.ReplaceAuthority
    >;
    expect(retire).toBeInstanceOf(ledgerMocks.ReplaceAuthority);
    expect(retire.authority.committee).toEqual([]);
    expect(retire.authority.threshold).toBe(1);
    expect(retire.authority.counter).toBe(1n);

    expect(ledgerMocks.signData).toHaveBeenCalledExactlyOnceWith(
      { tag: 'signature', value: 'authority-signing-key' },
      update.dataToSign,
    );
    expect(update.signature).toEqual({
      index: 0n,
      signature: {
        signedBy: { tag: 'signature', value: 'authority-signing-key' },
        data: update.dataToSign,
      },
    });

    expect(contractsMocks.submitTx).toHaveBeenCalledTimes(2);
    expect(contractsMocks.submitTx).toHaveBeenLastCalledWith(providers, {
      unprovenTx: {
        networkId: 'test-network',
        intent: { kind: 'maintenance-intent', update },
      },
    });
  });

  it('submits no maintenance update when lockAccount is false', async () => {
    await deployAccount(deployProps);

    expect(ledgerMocks.MaintenanceUpdate.instances).toHaveLength(0);
    expect(ledgerMocks.signData).not.toHaveBeenCalled();
    expect(contractsMocks.submitTx).toHaveBeenCalledTimes(1);
  });

  it('finds the deployed contract with the same compiled contract and private state', async () => {
    await deployAccount(deployProps);

    expect(contractsMocks.findDeployedContract).toHaveBeenCalledExactlyOnceWith(
      providers,
      expect.objectContaining({
        contractAddress: 'deployed-address',
        privateStateId: `account-${'07'.repeat(8)}`,
        initialPrivateState: { encSecretKeyHex: '02'.repeat(32), coins: {} },
      }),
    );
    const [, createOptions] =
      contractsMocks.createUnprovenDeployTx.mock.calls[0];
    const [, findOptions] = contractsMocks.findDeployedContract.mock.calls[0];
    expect(findOptions.compiledContract).toBe(createOptions.compiledContract);
  });

  it('activates through activate_initial_device_with_jubjub with the device key and deploy salt', async () => {
    const account = await deployAccount(deployProps);

    await expect(account.activate()).resolves.toEqual({
      txId: 'activation-tx',
    });
    expect(contractsMocks.activateCall).toHaveBeenCalledExactlyOnceWith(
      await authoriser.devicePublicKey(),
      account.salt,
    );
  });

  it('propagates a deploy submission failure', async () => {
    contractsMocks.submitTx.mockRejectedValueOnce(
      new Error('proof verification failed'),
    );

    await expect(deployAccount(deployProps)).rejects.toThrow(
      'proof verification failed',
    );
  });

  it('throws when the deploy transaction finalizes as failed', async () => {
    contractsMocks.submitTx.mockResolvedValueOnce({
      status: 'FailEntirely',
      txId: 'tx-id',
    });

    await expect(deployAccount(deployProps)).rejects.toThrow(
      'Account deploy failed: "FailEntirely"',
    );
  });

  it('throws when the retirement update finalizes as failed', async () => {
    contractsMocks.submitTx
      .mockResolvedValueOnce({ status: 'SucceedEntirely', txId: 'tx-id' })
      .mockResolvedValueOnce({ status: 'FailFallible', txId: 'tx-id' });

    await expect(
      deployAccount({ ...deployProps, lockAccount: true }),
    ).rejects.toThrow('Authority retirement failed: "FailFallible"');
  });

  it('propagates an activation failure', async () => {
    const account = await deployAccount(deployProps);
    contractsMocks.activateCall.mockRejectedValueOnce(new Error('ttl expired'));

    await expect(account.activate()).rejects.toThrow('ttl expired');
  });

  it('throws when the activation transaction finalizes as failed', async () => {
    const account = await deployAccount(deployProps);
    contractsMocks.activateCall.mockResolvedValueOnce({
      public: { status: 'FailEntirely' },
    });

    await expect(account.activate()).rejects.toThrow(
      'Account activation failed: "FailEntirely"',
    );
  });

  it('resolves when the activation transaction finalizes as succeeded', async () => {
    const account = await deployAccount(deployProps);
    const finalized = { public: { status: 'SucceedEntirely' } };
    contractsMocks.activateCall.mockResolvedValueOnce(finalized);

    await expect(account.activate()).resolves.toBe(finalized);
  });

  it('throws when the compiled contract misses a deployed operation', async () => {
    ledgerMocks.ContractState.deserialize.mockReturnValueOnce({
      ...ledgerMocks.fullState,
      operation: () => undefined,
    });

    await expect(deployAccount(deployProps)).rejects.toThrow(
      "Compiled account contract has no operation 'deposit_unshielded'",
    );
  });
});

describe('accountWitnesses.held_coin', () => {
  const witnessContext = (privateState: AccountPrivateState) =>
    ({ privateState } as Parameters<typeof accountWitnesses.held_coin>[0]);

  it('serves the stored qualified coin for a captured color', () => {
    const state: AccountPrivateState = {
      encSecretKeyHex: '02'.repeat(32),
      coins: {
        '0a0b': {
          nonceHex: '01ff',
          colorHex: '0a0b',
          value: '25',
          mtIndex: '3',
        },
      },
    };

    const [nextState, coin] = accountWitnesses.held_coin(
      witnessContext(state),
      new Uint8Array([0x0a, 0x0b]),
    );

    expect(nextState).toBe(state);
    expect(coin).toEqual({
      nonce: new Uint8Array([0x01, 0xff]),
      color: new Uint8Array([0x0a, 0x0b]),
      value: 25n,
      mt_index: 3n,
    });
  });

  it('refuses a color the store has not captured', () => {
    const state: AccountPrivateState = {
      encSecretKeyHex: null,
      coins: {},
    };

    expect(() =>
      accountWitnesses.held_coin(witnessContext(state), new Uint8Array([0xaa])),
    ).toThrow('held_coin witness: no coin for color aa in the local store');
  });
});
