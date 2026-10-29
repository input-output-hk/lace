import {
  AccountContractMissingError,
  AuthorityNotRetiredError,
  AuthorityRetiredError,
  CreationArtefactMismatchError,
  MaintenanceAuthorityMismatchError,
} from '@lace-contract/passport';
import { HexBytes } from '@lace-lib/util';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { expectedVk, pureCircuits } from '../../src/acc/acc-module';
import {
  accountWitnesses,
  deployAccount,
  readMaintenanceAuthority,
  resumeAccountDeployment,
  submitMaintenanceUpdate,
} from '../../src/acc/deploy';
import { devJubjubAuthoriser } from '../../src/acc/dev-authoriser';
import { createDevSponsor } from '../../src/infra/dev-sponsor';

import type * as AccModule from '../../src/acc/acc-module';
import type {
  AccountPrivateState,
  AccProviders,
  PendingDeployment,
} from '../../src/acc/deploy';
import type * as NetworkId from '@midnight-ntwrk/midnight-js-network-id';
import type * as Ledger from '@midnightntwrk/ledger-v9';

/** Verifier key sizes measured from the vendored artefacts, in bytes. */
const JUBJUB_KEY_BYTES = 2313;
const DEPOSIT_UNSHIELDED_KEY_BYTES = 1353;
const DEPOSIT_SHIELDED_KEY_BYTES = 2121;
const K256_GRANT_KEY_BYTES = 2745;
const VERIFIER_BYTE_BUDGET = 15_000;
const VERIFIER_KEY_HEADER = 'midnight:verifier-key[v7]:';

const ledgerMocks = vi.hoisted(() => {
  /** The verifying key of the deploy-time authority the pipeline mints. */
  const DEPLOY_VERIFYING_KEY = {
    tag: 'schnorr',
    value: 'verifying-authority-signing-key',
  };
  const gatedBases = [
    'withdraw_unshielded',
    'append_inbox',
    'withdraw_shielded',
    'withdraw_shielded_to_contract',
    'rotate_enc_key',
    'add_device',
    'remove_device',
  ];
  const grantCircuits = [
    'issue_grant_with_jubjub',
    'revoke_grant_with_jubjub',
    'revoke_all_grants_with_jubjub',
    'withdraw_unshielded_with_grant_jubjub',
    'withdraw_shielded_with_grant_jubjub',
    'withdraw_shielded_to_contract_with_grant_jubjub',
    'withdraw_unshielded_with_grant_k256',
    'withdraw_shielded_with_grant_k256',
    'withdraw_shielded_to_contract_with_grant_k256',
  ];
  const allOperations = new Set([
    'deposit_unshielded',
    'deposit_shielded',
    ...['jubjub', 'k256'].flatMap(arm =>
      ['activate_initial_device', ...gatedBases].map(
        base => `${base}_with_${arm}`,
      ),
    ),
    ...grantCircuits,
  ]);
  const fullState = {
    data: { tag: 'charged-state' },
    maintenanceAuthority: {
      committee: ['deploy-authority-key'],
      threshold: 1,
      counter: 0n,
    },
    operation: (name: string) =>
      allOperations.has(name)
        ? { operation: name, verifierKey: new Uint8Array() }
        : undefined,
  };

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

  class ContractOperationVersionedVerifierKey {
    public constructor(readonly version: string, readonly rawVk: Uint8Array) {}
  }

  class VerifierKeyInsert {
    public constructor(
      readonly operation: string,
      readonly vk: ContractOperationVersionedVerifierKey,
    ) {}
  }

  /** The serialised form the public data provider hands back for chain state. */
  const CHAIN_STATE = new Uint8Array([0xc4, 0xa1]);
  /** The compact-runtime data the generated ledger decoder reads. */
  const CHAIN_DATA = { tag: 'chain-data' };

  /**
   * A contract as the chain holds it: applies each submitted deploy or
   * maintenance update, and can hide the advanced counter for a number
   * of reads to stand in for an indexer that lags the block.
   */
  const chain = {
    operations: new Set<string>(),
    authority: { committee: [DEPLOY_VERIFYING_KEY], threshold: 1 } as {
      committee: unknown[];
      threshold: number;
    },
    counter: 0n,
    booted: false,
    hiddenReads: 0,
    lagReads: 0,
    reset: (): void => {
      chain.operations.clear();
      chain.authority = { committee: [DEPLOY_VERIFYING_KEY], threshold: 1 };
      chain.counter = 0n;
      chain.booted = false;
      chain.hiddenReads = 0;
      chain.lagReads = 0;
    },
    apply: (intent: {
      kind: string;
      deploy?: unknown;
      update?: unknown;
    }): void => {
      if (intent.kind === 'deploy-intent') {
        const deploy = intent.deploy as { initialState: ContractState };
        for (const name of deploy.initialState.operations.keys()) {
          chain.operations.add(name);
        }
        return;
      }
      const update = intent.update as MaintenanceUpdate;
      for (const single of update.updates) {
        if (single instanceof VerifierKeyInsert) {
          chain.operations.add(single.operation);
        } else if (single instanceof ReplaceAuthority) {
          chain.authority = single.authority;
        }
      }
      chain.counter += 1n;
      chain.hiddenReads = chain.lagReads;
    },
    snapshot: () => {
      const isHidden = chain.hiddenReads > 0;
      if (isHidden) chain.hiddenReads -= 1;
      return {
        operations: () => [...chain.operations],
        maintenanceAuthority: {
          ...chain.authority,
          counter: isHidden ? chain.counter - 1n : chain.counter,
        },
      };
    },
  };

  class ContractState {
    public static deserialize = vi.fn((raw: Uint8Array) =>
      raw === CHAIN_STATE ? chain.snapshot() : fullState,
    );
    public data: unknown;
    public maintenanceAuthority: unknown;
    public readonly operations = new Map<
      string,
      { operation: string; verifierKey: Uint8Array }
    >();

    public setOperation(
      name: string,
      operation: { operation: string; verifierKey: Uint8Array },
    ): void {
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

  class MaintenanceUpdate {
    public static instances: MaintenanceUpdate[] = [];
    public readonly dataToSign = new Uint8Array([9, 9, 9]);
    public signature?: { index: bigint; signature: unknown };

    public constructor(
      readonly address: string,
      readonly updates: (ReplaceAuthority | VerifierKeyInsert)[],
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
    new: vi.fn((_ttl: Date) => ({
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
  const signatureVerifyingKey = vi.fn(
    (key: { tag: string; value: string }) => ({
      tag: key.tag,
      value: `verifying-${key.value}`,
    }),
  );

  return {
    ContractState,
    ContractDeploy,
    ContractMaintenanceAuthority,
    ContractOperationVersionedVerifierKey,
    VerifierKeyInsert,
    ReplaceAuthority,
    MaintenanceUpdate,
    Intent,
    Transaction,
    signData,
    signatureVerifyingKey,
    fullState,
    chain,
    CHAIN_STATE,
    CHAIN_DATA,
  };
});

const accModuleMocks = vi.hoisted(() => ({
  decodeLedger: vi.fn(() => ({ booted: ledgerMocks.chain.booted })),
}));

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
      options: {
        compiledContract: unknown;
        initialPrivateState: unknown;
        args: unknown[];
      },
    ) => ({
      public: {
        initialContractState: { serialize: () => new Uint8Array([1, 2, 3]) },
      },
      private: {
        signingKey: { tag: 'schnorr', value: 'authority-signing-key' },
        initialPrivateState: options.initialPrivateState,
      },
    }),
  );
  const findDeployedContract = vi.fn(
    async (_providers: unknown, _options: { compiledContract: unknown }) =>
      found,
  );
  const submitTx = vi.fn(
    async (
      _providers: unknown,
      { unprovenTx }: { unprovenTx: { intent: { kind: string } } },
    ) => {
      ledgerMocks.chain.apply(unprovenTx.intent);
      return { status: 'SucceedEntirely', txId: 'tx-id' };
    },
  );
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
vi.mock('../../src/acc/acc-module', async importOriginal => ({
  ...(await importOriginal<typeof AccModule>()),
  ledger: accModuleMocks.decodeLedger,
}));

const sizeOf = (operation: string): number => {
  if (operation === 'deposit_unshielded') return DEPOSIT_UNSHIELDED_KEY_BYTES;
  if (operation === 'deposit_shielded') return DEPOSIT_SHIELDED_KEY_BYTES;
  if (operation.endsWith('_with_grant_k256')) return K256_GRANT_KEY_BYTES;
  return JUBJUB_KEY_BYTES;
};

/** A verifier key of the measured size under the pinned compiler's header. */
const verifierKeyOf = (operation: string): Uint8Array => {
  const key = new Uint8Array(sizeOf(operation));
  key.set(new TextEncoder().encode(VERIFIER_KEY_HEADER));
  key.set(new TextEncoder().encode(operation), VERIFIER_KEY_HEADER.length);
  return key;
};

const getVerifierKey = vi.fn(async (operation: string) =>
  verifierKeyOf(operation),
);
const providedState = async (): Promise<unknown> => ({
  serialize: () => ledgerMocks.CHAIN_STATE,
  data: ledgerMocks.CHAIN_DATA,
});
const queryContractState = vi.fn(providedState);

const providers: AccProviders = {
  publicDataProvider: { queryContractState },
  zkConfigProvider: { getVerifierKey },
  proofProvider: 'proof',
  privateStateProvider: 'private-state',
  walletProvider: 'wallet',
  midnightProvider: 'midnight',
};

const authoriser = devJubjubAuthoriser(7n);
const encPublicKey = new Uint8Array(32).fill(1);
const fixedRandomBytes = vi.fn((length: number) =>
  new Uint8Array(length).fill(7),
);
const sleep = vi.fn(async () => {});
const onDeployed = vi.fn(async () => {});
const authorityKey = {
  tag: 'schnorr' as const,
  value: 'authority-signing-key',
};
const handoverAuthority = {
  tag: 'schnorr' as const,
  value: 'roster-derived-verifying-key',
};

const deployProps = {
  providers,
  authoriser,
  encPublicKey,
  lockAccount: false,
  handoverAuthority,
  onDeployed,
  randomBytes: fixedRandomBytes,
  sleep,
};

const DEPLOYED_OPERATIONS = [
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
  'issue_grant_with_jubjub',
  'revoke_grant_with_jubjub',
  'revoke_all_grants_with_jubjub',
  'withdraw_unshielded_with_grant_jubjub',
  'withdraw_shielded_with_grant_jubjub',
  'withdraw_shielded_to_contract_with_grant_jubjub',
  'withdraw_unshielded_with_grant_k256',
  'withdraw_shielded_with_grant_k256',
  'withdraw_shielded_to_contract_with_grant_k256',
];
const DEPLOY_WAVE = DEPLOYED_OPERATIONS.slice(0, 6);
const SECOND_WAVE = DEPLOYED_OPERATIONS.slice(6, 12);
const THIRD_WAVE = DEPLOYED_OPERATIONS.slice(12, 18);
const FOURTH_WAVE = DEPLOYED_OPERATIONS.slice(18);

/** The sha256 over each roster operation and its pinned verifier key digest. */
const VERIFIER_KEYS_DIGEST = HexBytes.fromByteArray(
  new Uint8Array(
    await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(
        DEPLOYED_OPERATIONS.map(
          operation => `${operation}:${expectedVk[operation]}`,
        ).join('\n'),
      ),
    ),
  ),
);

const pendingDeployment: PendingDeployment = {
  operations: DEPLOYED_OPERATIONS,
  lockAccount: false,
  verifierKeysDigest: VERIFIER_KEYS_DIGEST,
  saltHex: '07'.repeat(32),
  authorityKey,
  handoverAuthority,
  keyEntries: [],
};

const resumeProps = {
  providers,
  authoriser,
  address: 'deployed-address',
  pending: pendingDeployment,
  randomBytes: fixedRandomBytes,
  sleep,
};

const insertedOperations = (
  update: InstanceType<typeof ledgerMocks.MaintenanceUpdate>,
): string[] =>
  update.updates.flatMap(single =>
    single instanceof ledgerMocks.VerifierKeyInsert ? [single.operation] : [],
  );

const replacements = (
  update: InstanceType<typeof ledgerMocks.MaintenanceUpdate>,
): InstanceType<typeof ledgerMocks.ReplaceAuthority>[] =>
  update.updates.flatMap(single =>
    single instanceof ledgerMocks.ReplaceAuthority ? [single] : [],
  );

const verifierBytesOf = (operations: string[]): number =>
  operations.reduce((total, operation) => total + sizeOf(operation), 0);

const submitToChain = contractsMocks.submitTx.getMockImplementation()!;

/** The deploy and wave expiry the node enforces, in milliseconds. */
const DEPLOY_TX_TTL_MS = 60_000;
/** How long the slow sponsor's first wallet sync takes: past the expiry. */
const SPONSOR_SYNC_MS = DEPLOY_TX_TTL_MS + 1000;

/**
 * A development sponsor whose wallet takes {@link SPONSOR_SYNC_MS} to sync
 * on first use, over a frozen clock that only the sync advances.
 */
const slowDevSponsor = () => {
  const wallet = {
    estimateTransactionFee: vi.fn(async () => 1n),
    balanceUnboundTransaction: vi.fn(async () => 'recipe'),
    signRecipe: vi.fn(async () => 'signed-recipe'),
    finalizeRecipe: vi.fn(async () => ({ serialize: () => new Uint8Array() })),
    stop: vi.fn(async () => undefined),
  };
  const createWalletContext = vi.fn(async () => {
    vi.setSystemTime(Date.now() + SPONSOR_SYNC_MS);
    return {
      wallet,
      signSegment: async () => 'signature',
      adoptUnbalanced: () => 'adopted-tx',
    };
  });
  const sponsor = createDevSponsor({
    seedHex: 'ab'.repeat(32),
    networkId: 'undeployed',
    indexerUrl: 'http://localhost:8088/api/v4/graphql',
    indexerWsUrl: 'ws://localhost:8088/api/v4/graphql/ws',
    nodeUrl: 'http://localhost:9944',
    proofServerUrl: 'http://localhost:6300',
    createWalletContext,
  });
  return { sponsor, createWalletContext };
};

/**
 * Submission through a sponsor, as the node sees it: the sponsor balances
 * the transaction, then the node refuses it once its expiry has passed.
 */
const submitThroughSponsor =
  (sponsor: { balanceAndSign: (tx: Uint8Array) => Promise<Uint8Array> }) =>
  async (
    _providers: unknown,
    { unprovenTx }: { unprovenTx: { intent: { kind: string } } },
  ) => {
    const ttl = ledgerMocks.Intent.new.mock.calls.at(-1)?.[0];
    await sponsor.balanceAndSign(new Uint8Array([1]));
    if (!ttl || ttl.getTime() <= Date.now()) {
      throw new Error('IntentTtlExpired (228)');
    }
    ledgerMocks.chain.apply(unprovenTx.intent);
    return { status: 'SucceedEntirely', txId: 'tx-id' };
  };

describe('deployAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryContractState.mockImplementation(providedState);
    ledgerMocks.chain.reset();
    ledgerMocks.ContractDeploy.instances.length = 0;
    ledgerMocks.MaintenanceUpdate.instances.length = 0;
  });

  it('deploys the budgeted prefix of the roster and installs the rest in three maintenance waves', async () => {
    await deployAccount(deployProps);

    expect(ledgerMocks.ContractDeploy.instances).toHaveLength(1);
    const deployed = ledgerMocks.ContractDeploy.instances[0].initialState;
    expect([...deployed.operations.keys()]).toEqual(DEPLOY_WAVE);
    expect(deployed.data).toBe(ledgerMocks.fullState.data);
    expect(deployed.maintenanceAuthority).toBe(
      ledgerMocks.fullState.maintenanceAuthority,
    );

    const updates = ledgerMocks.MaintenanceUpdate.instances;
    expect(updates.map(insertedOperations)).toEqual([
      SECOND_WAVE,
      THIRD_WAVE,
      FOURTH_WAVE,
    ]);
    expect(updates.every(update => update.address === 'deployed-address')).toBe(
      true,
    );
    for (const operations of [
      DEPLOY_WAVE,
      SECOND_WAVE,
      THIRD_WAVE,
      FOURTH_WAVE,
    ]) {
      expect(verifierBytesOf(operations)).toBeLessThanOrEqual(
        VERIFIER_BYTE_BUDGET,
      );
    }
    expect([...ledgerMocks.chain.operations]).toEqual(DEPLOYED_OPERATIONS);
    expect(
      [...ledgerMocks.chain.operations].filter(name => name.includes('k256')),
    ).toEqual([
      'withdraw_unshielded_with_grant_k256',
      'withdraw_shielded_with_grant_k256',
      'withdraw_shielded_to_contract_with_grant_k256',
    ]);

    expect(contractsMocks.submitTx).toHaveBeenCalledTimes(4);
    expect(contractsMocks.submitTx).toHaveBeenNthCalledWith(1, providers, {
      unprovenTx: {
        networkId: 'test-network',
        intent: {
          kind: 'deploy-intent',
          deploy: ledgerMocks.ContractDeploy.instances[0],
        },
      },
    });
    expect(contractsMocks.submitTx).toHaveBeenNthCalledWith(2, providers, {
      unprovenTx: {
        networkId: 'test-network',
        intent: { kind: 'maintenance-intent', update: updates[0] },
      },
    });
    expect(ledgerMocks.Intent.new).toHaveBeenCalledTimes(4);
    expect(ledgerMocks.Intent.new).toHaveBeenCalledWith(expect.any(Date));
  });

  it('deploys only circuits the vendored contract pins a verifier key for', () => {
    for (const operation of DEPLOYED_OPERATIONS) {
      expect(expectedVk[operation]).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('downloads every roster verifier key once and carries the bytes on each operation', async () => {
    await deployAccount(deployProps);

    expect(getVerifierKey.mock.calls.map(([operation]) => operation)).toEqual(
      DEPLOYED_OPERATIONS,
    );
    const deployed = ledgerMocks.ContractDeploy.instances[0].initialState;
    for (const [name, operation] of deployed.operations) {
      expect(operation.verifierKey).toEqual(verifierKeyOf(name));
    }
  });

  it('inserts each verifier key under the v4 versioned wrapper', async () => {
    await deployAccount(deployProps);

    for (const update of ledgerMocks.MaintenanceUpdate.instances) {
      const inserts = update.updates.filter(
        single => !(single instanceof ledgerMocks.ReplaceAuthority),
      );
      for (const single of inserts) {
        expect(single).toBeInstanceOf(ledgerMocks.VerifierKeyInsert);
        const insert = single as InstanceType<
          typeof ledgerMocks.VerifierKeyInsert
        >;
        expect(insert.vk).toBeInstanceOf(
          ledgerMocks.ContractOperationVersionedVerifierKey,
        );
        expect(insert.vk.version).toBe('v4');
        expect(insert.vk.rawVk).toEqual(verifierKeyOf(insert.operation));
      }
    }
  });

  it('reads the maintenance counter from chain before each update and signs with the deploy authority key', async () => {
    await deployAccount(deployProps);

    const updates = ledgerMocks.MaintenanceUpdate.instances;
    expect(updates.map(update => update.counter)).toEqual([0n, 1n, 2n]);
    expect(queryContractState).toHaveBeenCalledWith('deployed-address');
    expect(ledgerMocks.signData).toHaveBeenCalledTimes(3);
    for (const update of updates) {
      expect(ledgerMocks.signData).toHaveBeenCalledWith(
        authorityKey,
        update.dataToSign,
      );
      expect(update.signature).toEqual({
        index: 0n,
        signature: { signedBy: authorityKey, data: update.dataToSign },
      });
    }
  });

  it('records the pending deployment once the deploy landed and before the first wave', async () => {
    onDeployed.mockImplementationOnce(async () => {
      expect(contractsMocks.submitTx).toHaveBeenCalledOnce();
      expect(ledgerMocks.MaintenanceUpdate.instances).toHaveLength(0);
    });

    await deployAccount({ ...deployProps, lockAccount: true });

    expect(onDeployed).toHaveBeenCalledExactlyOnceWith('deployed-address', {
      operations: DEPLOYED_OPERATIONS,
      lockAccount: true,
      verifierKeysDigest: VERIFIER_KEYS_DIGEST,
      saltHex: '07'.repeat(32),
      authorityKey,
      handoverAuthority,
    });
  });

  it('waits for the chain to show the advanced counter before building the next update', async () => {
    ledgerMocks.chain.lagReads = 2;

    await deployAccount(deployProps);

    expect(sleep).toHaveBeenCalledTimes(6);
    expect(sleep).toHaveBeenCalledWith(2000);
    expect(
      ledgerMocks.MaintenanceUpdate.instances.map(update => update.counter),
    ).toEqual([0n, 1n, 2n]);
  });

  it('waits for the indexer to serve the deployed contract before the first wave', async () => {
    queryContractState
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(undefined);

    await deployAccount(deployProps);

    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(2000);
    expect(
      ledgerMocks.MaintenanceUpdate.instances.map(update => update.counter),
    ).toEqual([0n, 1n, 2n]);
    expect(contractsMocks.submitTx).toHaveBeenCalledTimes(4);
  });

  it('throws when the deployed contract never appears in the indexer', async () => {
    queryContractState.mockResolvedValue(null);

    await expect(deployAccount(deployProps)).rejects.toThrow(
      new AccountContractMissingError(
        'The Account Custody Contract deployed at deployed-address never appeared in the indexer.',
      ),
    );
    expect(sleep).toHaveBeenCalledTimes(30);
    expect(onDeployed).toHaveBeenCalledOnce();
    expect(ledgerMocks.MaintenanceUpdate.instances).toHaveLength(0);
  });

  it('retires the authority in the last wave only when lockAccount is true', async () => {
    await deployAccount({ ...deployProps, lockAccount: true });

    const updates = ledgerMocks.MaintenanceUpdate.instances;
    expect(updates).toHaveLength(3);
    expect(replacements(updates[0])).toEqual([]);
    expect(replacements(updates[1])).toEqual([]);
    const [retire] = replacements(updates[2]);
    expect(updates[2].updates.at(-1)).toBe(retire);
    expect(retire.authority).toBeInstanceOf(
      ledgerMocks.ContractMaintenanceAuthority,
    );
    expect(retire.authority.committee).toEqual([]);
    expect(retire.authority.threshold).toBe(1);
    expect(retire.authority.counter).toBe(3n);
    expect(insertedOperations(updates[2])).toEqual(FOURTH_WAVE);
    expect(ledgerMocks.chain.authority.committee).toEqual([]);
  });

  it('hands the authority to the roster-derived key in the last wave when lockAccount is false', async () => {
    await deployAccount(deployProps);

    const updates = ledgerMocks.MaintenanceUpdate.instances;
    expect(updates).toHaveLength(3);
    expect(replacements(updates[0])).toEqual([]);
    expect(replacements(updates[1])).toEqual([]);
    const [handover] = replacements(updates[2]);
    expect(updates[2].updates.at(-1)).toBe(handover);
    expect(handover.authority).toBeInstanceOf(
      ledgerMocks.ContractMaintenanceAuthority,
    );
    expect(handover.authority.committee).toEqual([handoverAuthority]);
    expect(handover.authority.threshold).toBe(1);
    expect(handover.authority.counter).toBe(3n);
    expect(insertedOperations(updates[2])).toEqual(FOURTH_WAVE);
    expect(ledgerMocks.signData).toHaveBeenLastCalledWith(
      authorityKey,
      updates[2].dataToSign,
    );
    expect(ledgerMocks.chain.authority.committee).toEqual([handoverAuthority]);
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
        args: [
          expectedBoot,
          encPublicKey,
          expect.anything(),
          expect.anything(),
          expect.anything(),
        ],
        initialPrivateState: { coins: {} },
      }),
    );
  });

  it('publishes a throwaway recovery: a fresh jubjub key, an empty 64 byte wrap and a three day veto window', async () => {
    await deployAccount(deployProps);
    ledgerMocks.chain.reset();
    await deployAccount(deployProps);

    const recoveries = contractsMocks.createUnprovenDeployTx.mock.calls.map(
      ([, options]) => options.args.slice(2),
    );
    expect(recoveries).toHaveLength(2);
    for (const [recoveryPublicKey, wrap, vetoWindow] of recoveries) {
      const point = recoveryPublicKey as { x: bigint; y: bigint };
      for (const coordinate of [point.x, point.y]) {
        expect(typeof coordinate).toBe('bigint');
        expect(coordinate).toBeGreaterThan(0n);
        expect(coordinate).toBeLessThan(2n ** 256n);
      }
      expect(point).not.toEqual(await authoriser.devicePublicKey());
      expect(wrap).toEqual(new Uint8Array(64));
      expect(vetoWindow).toBe(259_200n);
    }
    expect(recoveries[0][0]).not.toEqual(recoveries[1][0]);
  });

  it('draws randomness only for the boot salt and the private-state id, never for the wrap', async () => {
    await deployAccount(deployProps);

    expect(fixedRandomBytes.mock.calls.map(([length]) => length)).toEqual([
      32, 8,
    ]);
  });

  it('generates a fresh salt on every deploy', async () => {
    const first = await deployAccount({
      ...deployProps,
      randomBytes: undefined,
    });
    ledgerMocks.chain.reset();
    const second = await deployAccount({
      ...deployProps,
      randomBytes: undefined,
    });

    expect(first.salt).toHaveLength(32);
    expect(second.salt).toHaveLength(32);
    expect(first.salt).not.toEqual(second.salt);
  });

  it('finds the deployed contract with the same compiled contract and private state once every wave is in', async () => {
    contractsMocks.findDeployedContract.mockImplementationOnce(async () => {
      expect(contractsMocks.submitTx).toHaveBeenCalledTimes(4);
      return { callTx: { activate_initial_device_with_jubjub: vi.fn() } };
    });

    await deployAccount(deployProps);

    expect(contractsMocks.findDeployedContract).toHaveBeenCalledExactlyOnceWith(
      providers,
      expect.objectContaining({
        contractAddress: 'deployed-address',
        privateStateId: `account-${'07'.repeat(8)}`,
        initialPrivateState: { coins: {} },
      }),
    );
    const [, createOptions] =
      contractsMocks.createUnprovenDeployTx.mock.calls[0];
    const [, findOptions] = contractsMocks.findDeployedContract.mock.calls[0];
    expect(findOptions.compiledContract).toBe(createOptions.compiledContract);
  });

  it('activates through activate_initial_device_with_jubjub with the device key and deploy salt', async () => {
    const account = await deployAccount(deployProps);

    expect(account.isActivated).toBe(false);
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
    expect(onDeployed).not.toHaveBeenCalled();
  });

  it('throws when the deploy transaction finalizes as failed', async () => {
    contractsMocks.submitTx.mockResolvedValueOnce({
      status: 'FailEntirely',
      txId: 'tx-id',
    });

    await expect(deployAccount(deployProps)).rejects.toThrow(
      'Account deploy failed: "FailEntirely"',
    );
    expect(onDeployed).not.toHaveBeenCalled();
  });

  it('throws when a verifier key wave finalizes as failed', async () => {
    contractsMocks.submitTx
      .mockResolvedValueOnce({ status: 'SucceedEntirely', txId: 'tx-id' })
      .mockResolvedValueOnce({ status: 'FailFallible', txId: 'tx-id' });

    await expect(
      deployAccount({ ...deployProps, lockAccount: true }),
    ).rejects.toThrow('Verifier key wave 1 of 3 failed: "FailFallible"');
    expect(contractsMocks.findDeployedContract).not.toHaveBeenCalled();
  });

  it('throws when the chain never shows a wave applied', async () => {
    ledgerMocks.chain.lagReads = 100;

    await expect(deployAccount(deployProps)).rejects.toThrow(
      'The maintenance authority counter of deployed-address never reached 1',
    );
    expect(sleep).toHaveBeenCalledTimes(60);
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

  it('refuses a downloaded key under another header before any wave is submitted', async () => {
    getVerifierKey.mockImplementationOnce(async () => new Uint8Array(2313));

    await expect(deployAccount(deployProps)).rejects.toThrow(
      "The verifier key of 'deposit_unshielded' is not a midnight:verifier-key[v7]: key",
    );
    expect(contractsMocks.submitTx).not.toHaveBeenCalled();
  });

  describe('with a sponsor whose first sync outlasts the transaction expiry', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(1_000_000));
    });

    afterEach(() => {
      vi.useRealTimers();
      contractsMocks.submitTx.mockImplementation(submitToChain);
    });

    it('deploys on the first attempt once the sponsor is ready, stamping every expiry after the sync', async () => {
      const { sponsor, createWalletContext } = slowDevSponsor();
      contractsMocks.submitTx.mockImplementation(submitThroughSponsor(sponsor));

      const account = await deployAccount({
        ...deployProps,
        sponsorReady: async () => sponsor.ready(),
      });

      expect(account.address).toBe('deployed-address');
      expect(createWalletContext).toHaveBeenCalledOnce();
      expect(contractsMocks.submitTx).toHaveBeenCalledTimes(4);
      const syncedAt = 1_000_000 + SPONSOR_SYNC_MS;
      expect(
        ledgerMocks.Intent.new.mock.calls.map(([ttl]) => ttl.getTime()),
      ).toEqual(Array.from({ length: 4 }, () => syncedAt + DEPLOY_TX_TTL_MS));
    });

    it('lets the deploy expire while the sponsor syncs when its readiness is not awaited', async () => {
      const { sponsor } = slowDevSponsor();
      contractsMocks.submitTx.mockImplementation(submitThroughSponsor(sponsor));

      await expect(deployAccount(deployProps)).rejects.toThrow(
        'IntentTtlExpired (228)',
      );
      expect(onDeployed).not.toHaveBeenCalled();
    });

    it('builds every resumed wave once the sponsor is ready', async () => {
      const { sponsor } = slowDevSponsor();
      contractsMocks.submitTx.mockImplementation(submitThroughSponsor(sponsor));
      ledgerMocks.chain.operations.clear();
      for (const operation of DEPLOY_WAVE) {
        ledgerMocks.chain.operations.add(operation);
      }

      await resumeAccountDeployment({
        ...resumeProps,
        sponsorReady: async () => sponsor.ready(),
      });

      expect(contractsMocks.submitTx).toHaveBeenCalledTimes(3);
      expect([...ledgerMocks.chain.operations]).toEqual(DEPLOYED_OPERATIONS);
    });
  });
});

describe('resumeAccountDeployment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryContractState.mockImplementation(providedState);
    ledgerMocks.chain.reset();
    ledgerMocks.MaintenanceUpdate.instances.length = 0;
    for (const operation of DEPLOY_WAVE) {
      ledgerMocks.chain.operations.add(operation);
    }
  });

  it('installs the operations the chain lacks, in the waves the roster plans, and activates', async () => {
    const account = await resumeAccountDeployment(resumeProps);

    expect(contractsMocks.createUnprovenDeployTx).not.toHaveBeenCalled();
    const updates = ledgerMocks.MaintenanceUpdate.instances;
    expect(updates.map(insertedOperations)).toEqual([
      SECOND_WAVE,
      THIRD_WAVE,
      FOURTH_WAVE,
    ]);
    expect(updates.map(update => update.counter)).toEqual([0n, 1n, 2n]);
    expect([...ledgerMocks.chain.operations]).toEqual(DEPLOYED_OPERATIONS);
    expect(contractsMocks.submitTx).toHaveBeenCalledTimes(3);

    expect(account.address).toBe('deployed-address');
    expect(account.salt).toEqual(new Uint8Array(32).fill(7));
    expect(account.isActivated).toBe(false);
    expect(accModuleMocks.decodeLedger).toHaveBeenCalledWith(
      ledgerMocks.CHAIN_DATA,
    );
    await account.activate();
    expect(contractsMocks.activateCall).toHaveBeenCalledExactlyOnceWith(
      await authoriser.devicePublicKey(),
      new Uint8Array(32).fill(7),
    );
  });

  it('signs the remaining waves with the recorded authority key', async () => {
    const recordedKey = { tag: 'schnorr' as const, value: 'recorded-key' };
    ledgerMocks.chain.authority = {
      committee: [{ tag: 'schnorr', value: 'verifying-recorded-key' }],
      threshold: 1,
    };

    await resumeAccountDeployment({
      ...resumeProps,
      pending: { ...pendingDeployment, authorityKey: recordedKey },
    });

    expect(ledgerMocks.signData).toHaveBeenCalledTimes(3);
    for (const [key] of ledgerMocks.signData.mock.calls) {
      expect(key).toBe(recordedKey);
    }
  });

  it('downloads only the roster the deployment was recorded with', async () => {
    await resumeAccountDeployment(resumeProps);

    expect(getVerifierKey.mock.calls.map(([operation]) => operation)).toEqual(
      DEPLOYED_OPERATIONS,
    );
  });

  it('starts from the wave the chain shows missing, never resending one that landed', async () => {
    for (const operation of SECOND_WAVE) {
      ledgerMocks.chain.operations.add(operation);
    }
    ledgerMocks.chain.counter = 1n;

    await resumeAccountDeployment({
      ...resumeProps,
      pending: { ...pendingDeployment, lockAccount: true },
    });

    const updates = ledgerMocks.MaintenanceUpdate.instances;
    expect(updates.map(insertedOperations)).toEqual([THIRD_WAVE, FOURTH_WAVE]);
    expect(updates.map(update => update.counter)).toEqual([1n, 2n]);
    expect(replacements(updates[0])).toEqual([]);
    expect(replacements(updates[1])[0].authority.counter).toBe(3n);
  });

  it('retires the authority alone when every operation is in but the lock is still due', async () => {
    for (const operation of DEPLOYED_OPERATIONS) {
      ledgerMocks.chain.operations.add(operation);
    }
    ledgerMocks.chain.counter = 2n;

    await resumeAccountDeployment({
      ...resumeProps,
      pending: { ...pendingDeployment, lockAccount: true },
    });

    const updates = ledgerMocks.MaintenanceUpdate.instances;
    expect(updates).toHaveLength(1);
    expect(insertedOperations(updates[0])).toEqual([]);
    expect(replacements(updates[0])).toHaveLength(1);
    expect(updates[0].counter).toBe(2n);
    expect(ledgerMocks.chain.authority.committee).toEqual([]);
  });

  it('hands the authority over alone when every operation is in but the handover is still due', async () => {
    for (const operation of DEPLOYED_OPERATIONS) {
      ledgerMocks.chain.operations.add(operation);
    }
    ledgerMocks.chain.counter = 2n;

    await resumeAccountDeployment(resumeProps);

    const updates = ledgerMocks.MaintenanceUpdate.instances;
    expect(updates).toHaveLength(1);
    expect(insertedOperations(updates[0])).toEqual([]);
    const [handover] = replacements(updates[0]);
    expect(handover.authority.committee).toEqual([handoverAuthority]);
    expect(handover.authority.counter).toBe(3n);
    expect(updates[0].counter).toBe(2n);
    expect(ledgerMocks.signData).toHaveBeenCalledExactlyOnceWith(
      authorityKey,
      updates[0].dataToSign,
    );
  });

  it('hands over to the recorded authority, not one drawn anew', async () => {
    const recorded = { tag: 'schnorr' as const, value: 'recorded-handover' };

    await resumeAccountDeployment({
      ...resumeProps,
      pending: { ...pendingDeployment, handoverAuthority: recorded },
    });

    const updates = ledgerMocks.MaintenanceUpdate.instances;
    const [handover] = replacements(updates[updates.length - 1]);
    expect(handover.authority.committee).toEqual([recorded]);
  });

  it('submits nothing when the handover already landed and only the activation is missing', async () => {
    for (const operation of DEPLOYED_OPERATIONS) {
      ledgerMocks.chain.operations.add(operation);
    }
    ledgerMocks.chain.authority = {
      committee: [handoverAuthority],
      threshold: 1,
    };
    ledgerMocks.chain.counter = 3n;

    const account = await resumeAccountDeployment(resumeProps);

    expect(contractsMocks.submitTx).not.toHaveBeenCalled();
    expect(ledgerMocks.MaintenanceUpdate.instances).toHaveLength(0);
    expect(account.isActivated).toBe(false);
  });

  it('rejects with AuthorityRetiredError when operations are missing after the handover landed', async () => {
    ledgerMocks.chain.authority = {
      committee: [handoverAuthority],
      threshold: 1,
    };

    await expect(resumeAccountDeployment(resumeProps)).rejects.toThrow(
      AuthorityRetiredError,
    );
    expect(contractsMocks.submitTx).not.toHaveBeenCalled();
    expect(contractsMocks.findDeployedContract).not.toHaveBeenCalled();
  });

  it.each([
    [
      'another handover authority',
      false,
      [{ tag: 'schnorr', value: 'other-verifying-key' }],
    ],
    [
      'the handover authority of a locked deployment',
      true,
      [handoverAuthority],
    ],
    ['an empty committee for an unlocked deployment', false, []],
  ])(
    'rejects with MaintenanceAuthorityMismatchError when the chain shows %s',
    async (_case, lockAccount, committee) => {
      ledgerMocks.chain.authority = { committee, threshold: 1 };

      await expect(
        resumeAccountDeployment({
          ...resumeProps,
          pending: { ...pendingDeployment, lockAccount },
        }),
      ).rejects.toThrow(
        new MaintenanceAuthorityMismatchError(
          'The maintenance authority of the account at deployed-address is neither the deploy-time key nor the one its unfinished creation installs, so it cannot be resumed.',
        ),
      );
      expect(getVerifierKey).not.toHaveBeenCalled();
      expect(contractsMocks.submitTx).not.toHaveBeenCalled();
    },
  );

  it('submits nothing when the deployment only missed its activation', async () => {
    for (const operation of DEPLOYED_OPERATIONS) {
      ledgerMocks.chain.operations.add(operation);
    }
    ledgerMocks.chain.authority = { committee: [], threshold: 1 };
    ledgerMocks.chain.counter = 3n;

    const account = await resumeAccountDeployment({
      ...resumeProps,
      pending: { ...pendingDeployment, lockAccount: true },
    });

    expect(contractsMocks.submitTx).not.toHaveBeenCalled();
    expect(ledgerMocks.MaintenanceUpdate.instances).toHaveLength(0);
    await expect(account.activate()).resolves.toEqual({
      txId: 'activation-tx',
    });
  });

  it('installs nothing and returns the account activated when the chain shows the boot commitment consumed', async () => {
    for (const operation of DEPLOYED_OPERATIONS) {
      ledgerMocks.chain.operations.add(operation);
    }
    ledgerMocks.chain.authority = { committee: [], threshold: 1 };
    ledgerMocks.chain.counter = 3n;
    ledgerMocks.chain.booted = true;

    const account = await resumeAccountDeployment({
      ...resumeProps,
      pending: { ...pendingDeployment, lockAccount: true },
    });

    expect(account.isActivated).toBe(true);
    expect(account.address).toBe('deployed-address');
    expect(getVerifierKey).not.toHaveBeenCalled();
    expect(contractsMocks.submitTx).not.toHaveBeenCalled();
    expect(ledgerMocks.MaintenanceUpdate.instances).toHaveLength(0);
    expect(contractsMocks.findDeployedContract).toHaveBeenCalledOnce();
  });

  it('rejects with AuthorityNotRetiredError when a locked deployment shows activated with its authority live', async () => {
    for (const operation of DEPLOYED_OPERATIONS) {
      ledgerMocks.chain.operations.add(operation);
    }
    ledgerMocks.chain.booted = true;

    await expect(
      resumeAccountDeployment({
        ...resumeProps,
        pending: { ...pendingDeployment, lockAccount: true },
      }),
    ).rejects.toThrow(AuthorityNotRetiredError);
    expect(contractsMocks.submitTx).not.toHaveBeenCalled();
    expect(contractsMocks.findDeployedContract).not.toHaveBeenCalled();
  });

  it('rejects with AuthorityNotRetiredError when an unlocked deployment shows activated with its authority live', async () => {
    for (const operation of DEPLOYED_OPERATIONS) {
      ledgerMocks.chain.operations.add(operation);
    }
    ledgerMocks.chain.booted = true;

    await expect(
      resumeAccountDeployment({
        ...resumeProps,
        pending: { ...pendingDeployment, lockAccount: false },
      }),
    ).rejects.toThrow(AuthorityNotRetiredError);
    expect(contractsMocks.submitTx).not.toHaveBeenCalled();
    expect(contractsMocks.findDeployedContract).not.toHaveBeenCalled();
  });

  it('returns an unlocked deployment activated after its handover landed without submitting anything', async () => {
    for (const operation of DEPLOYED_OPERATIONS) {
      ledgerMocks.chain.operations.add(operation);
    }
    ledgerMocks.chain.booted = true;
    ledgerMocks.chain.authority = {
      committee: [handoverAuthority],
      threshold: 1,
    };

    const account = await resumeAccountDeployment({
      ...resumeProps,
      pending: { ...pendingDeployment, lockAccount: false },
    });

    expect(account.isActivated).toBe(true);
    expect(contractsMocks.submitTx).not.toHaveBeenCalled();
    expect(ledgerMocks.MaintenanceUpdate.instances).toHaveLength(0);
  });

  it('rejects with AuthorityRetiredError when operations are missing and the authority is retired', async () => {
    ledgerMocks.chain.authority = { committee: [], threshold: 1 };

    await expect(
      resumeAccountDeployment({
        ...resumeProps,
        pending: { ...pendingDeployment, lockAccount: true },
      }),
    ).rejects.toThrow(AuthorityRetiredError);
    expect(contractsMocks.submitTx).not.toHaveBeenCalled();
    expect(contractsMocks.findDeployedContract).not.toHaveBeenCalled();
  });

  it.each([
    ['other verifier key pins', { verifierKeysDigest: '00'.repeat(32) }],
    ['no verifier key digest', { verifierKeysDigest: undefined }],
    ['no handover authority', { handoverAuthority: undefined }],
  ])(
    'rejects a deployment recorded under %s before reading the chain or sending a wave',
    async (_case, recorded) => {
      await expect(
        resumeAccountDeployment({
          ...resumeProps,
          pending: {
            ...pendingDeployment,
            ...recorded,
          } as unknown as PendingDeployment,
        }),
      ).rejects.toThrow(CreationArtefactMismatchError);
      expect(queryContractState).not.toHaveBeenCalled();
      expect(getVerifierKey).not.toHaveBeenCalled();
      expect(contractsMocks.submitTx).not.toHaveBeenCalled();
      expect(ledgerMocks.MaintenanceUpdate.instances).toHaveLength(0);
    },
  );

  it('rejects with AccountContractMissingError when the address holds no contract', async () => {
    queryContractState.mockResolvedValueOnce(null);

    await expect(resumeAccountDeployment(resumeProps)).rejects.toThrow(
      new AccountContractMissingError(
        'No live Account Custody Contract found at deployed-address.',
      ),
    );
    expect(getVerifierKey).not.toHaveBeenCalled();
  });

  it('throws when a resumed wave finalizes as failed', async () => {
    contractsMocks.submitTx.mockResolvedValueOnce({
      status: 'FailEntirely',
      txId: 'tx-id',
    });

    await expect(resumeAccountDeployment(resumeProps)).rejects.toThrow(
      'Verifier key wave 1 of 3 failed: "FailEntirely"',
    );
  });
});

describe('accountWitnesses.held_coin', () => {
  const witnessContext = (privateState: AccountPrivateState) =>
    ({ privateState } as Parameters<typeof accountWitnesses.held_coin>[0]);

  it('serves the stored qualified coin for a captured color', () => {
    const state: AccountPrivateState = {
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
    const state: AccountPrivateState = { coins: {} };

    expect(() =>
      accountWitnesses.held_coin(witnessContext(state), new Uint8Array([0xaa])),
    ).toThrow('held_coin witness: no coin for color aa in the local store');
  });
});

describe('submitMaintenanceUpdate', () => {
  const ledger = ledgerMocks as unknown as typeof Ledger;
  const networkId = {
    getNetworkId: () => 'test-network',
  } as unknown as typeof NetworkId;
  const signature = { tag: 'schnorr' as const, value: 'replace-signature' };
  const replaceAt = (counter: bigint) =>
    new ledgerMocks.MaintenanceUpdate(
      'deployed-address',
      [
        new ledgerMocks.ReplaceAuthority(
          new ledgerMocks.ContractMaintenanceAuthority(
            [handoverAuthority],
            1,
            counter + 1n,
          ),
        ),
      ],
      counter,
    );

  beforeEach(() => {
    vi.clearAllMocks();
    queryContractState.mockImplementation(providedState);
    ledgerMocks.chain.reset();
    ledgerMocks.MaintenanceUpdate.instances.length = 0;
  });

  it('submits the update with the signature at index 0 and resolves once the chain shows the advanced counter', async () => {
    ledgerMocks.chain.lagReads = 2;
    const update = replaceAt(0n);

    await submitMaintenanceUpdate({
      providers,
      ledger,
      address: 'deployed-address',
      networkId,
      update: update as unknown as Ledger.MaintenanceUpdate,
      signature,
      label: 'Maintenance authority rotation',
      sleep,
    });

    expect(update.signature).toEqual({ index: 0n, signature });
    expect(contractsMocks.submitTx).toHaveBeenCalledExactlyOnceWith(providers, {
      unprovenTx: {
        networkId: 'test-network',
        intent: { kind: 'maintenance-intent', update },
      },
    });
    expect(sleep).toHaveBeenCalledTimes(2);
    await expect(
      readMaintenanceAuthority({
        providers,
        ledger,
        address: 'deployed-address',
      }),
    ).resolves.toMatchObject({ committee: [handoverAuthority], counter: 1n });
  });

  it('rejects an update that lands with a failing status, naming it, without waiting', async () => {
    contractsMocks.submitTx.mockResolvedValueOnce({
      status: 'FailEntirely',
      txId: 'tx-id',
    });

    await expect(
      submitMaintenanceUpdate({
        providers,
        ledger,
        address: 'deployed-address',
        networkId,
        update: replaceAt(0n) as unknown as Ledger.MaintenanceUpdate,
        signature,
        label: 'Maintenance authority rotation',
        sleep,
      }),
    ).rejects.toThrow('Maintenance authority rotation failed: "FailEntirely"');
    expect(queryContractState).not.toHaveBeenCalled();
  });
});
