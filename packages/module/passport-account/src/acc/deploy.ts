import { ByteArray, HexBytes } from '@lace-lib/util';

import {
  assertSubmitted,
  submitTx,
  submitWithDustRetry,
} from '../infra/submit';

import { Contract, pureCircuits } from './acc-module';

import type { Witnesses } from './acc-module';
import type { EncKeyPair, RandomBytes } from './enc-keys';
import type { PassportAuthoriser } from '@lace-contract/passport';
import type { SigningKey } from '@midnightntwrk/ledger-v9';

/** Gated circuit bases the contract exports once per authorisation arm. */
const GATED_CIRCUIT_BASES = [
  'withdraw_unshielded',
  'append_inbox',
  'withdraw_shielded',
  'withdraw_shielded_to_contract',
  'rotate_enc_key',
  'add_device',
  'remove_device',
] as const;

/** Every impure circuit of the jubjub arm, activation included. */
const JUBJUB_ARM_CIRCUITS = [
  'activate_initial_device',
  ...GATED_CIRCUIT_BASES,
].map(base => `${base}_with_jubjub`);

/** Permissionless deposit circuits shared by all arms. */
const SHARED_CIRCUITS = ['deposit_unshielded', 'deposit_shielded'];

/**
 * The complete operation set this module deploys: the deposits plus the
 * jubjub arm. The compiled contract also carries a k256 arm; its verifier
 * keys are never installed, so on an account deployed here only jubjub
 * devices can ever authorise.
 */
const DEPLOYED_OPERATIONS = [...SHARED_CIRCUITS, ...JUBJUB_ARM_CIRCUITS];

const ACTIVATE_INITIAL_DEVICE_CIRCUIT = 'activate_initial_device_with_jubjub';

const SALT_LENGTH = 32;
const PRIVATE_STATE_ID_LENGTH = 8;
const DEPLOY_TX_TTL_MS = 60_000;

/**
 * The midnight-js providers the deployment runs through, assembled by the
 * caller and treated as opaque here: every member is only passed on to
 * midnight-js itself.
 */
export type AccProviders = {
  publicDataProvider: unknown;
  zkConfigProvider: unknown;
  proofProvider: unknown;
  privateStateProvider: unknown;
  walletProvider: unknown;
  midnightProvider: unknown;
};

/** A wallet-held shielded coin, serialised so any provider can store it. */
type StoredCoin = {
  nonceHex: string;
  colorHex: string;
  value: string;
  mtIndex: string;
};

/**
 * The wallet-local private state behind the contract's `held_coin`
 * witness: the account encryption secret and the captured coins, keyed by
 * color. Coin descriptions live only here and enter proofs as private
 * inputs; they never reach public ledger state.
 */
export type AccountPrivateState = {
  encSecretKeyHex: string | null;
  coins: Record<string, StoredCoin>;
};

/**
 * The contract's witness implementations over {@link AccountPrivateState}.
 * `held_coin` serves the exact qualified coin a shielded spend consumes;
 * a color the store has not captured cannot be spent by a conforming
 * client, so the witness refuses it.
 */
export const accountWitnesses: Witnesses<AccountPrivateState> = {
  held_coin: (context, color) => {
    const key = HexBytes.fromByteArray(color);
    const stored = context.privateState.coins[key];
    if (!stored) {
      throw new Error(
        `held_coin witness: no coin for color ${key} in the local store`,
      );
    }
    return [
      context.privateState,
      {
        nonce: ByteArray.fromHex(HexBytes(stored.nonceHex)),
        color: ByteArray.fromHex(HexBytes(stored.colorHex)),
        value: BigInt(stored.value),
        mt_index: BigInt(stored.mtIndex),
      },
    ];
  },
};

const emptyAccountPrivateState = (
  encSecretKey: Uint8Array,
): AccountPrivateState => ({
  encSecretKeyHex: HexBytes.fromByteArray(encSecretKey),
  coins: {},
});

/**
 * The slice of the unproven-deploy pipeline result this flow reads: the
 * constructor's full contract state (bridged by serialisation between the
 * compact-runtime and ledger classes) and the freshly minted maintenance
 * authority key.
 */
type UnprovenAccountDeploy = {
  public: { initialContractState: { serialize: () => Uint8Array } };
  private: {
    signingKey: SigningKey;
    initialPrivateState: AccountPrivateState;
  };
};

type CreateUnprovenAccountDeployTx = (
  providers: AccProviders,
  options: {
    compiledContract: unknown;
    initialPrivateState: AccountPrivateState;
    args: [Uint8Array, Uint8Array];
  },
) => Promise<UnprovenAccountDeploy>;

/** The found-contract handle surface the activation call goes through. */
type AccContractHandle = {
  callTx: Record<string, (...args: unknown[]) => Promise<unknown>>;
};

type FindDeployedAccountContract = (
  providers: AccProviders,
  options: {
    contractAddress: string;
    compiledContract: unknown;
    privateStateId: string;
    initialPrivateState: AccountPrivateState;
  },
) => Promise<AccContractHandle>;

export type DeployAccountProps = {
  providers: AccProviders;
  /** The initial device; its public key seeds the boot commitment. */
  authoriser: PassportAuthoriser;
  /** Account encryption keypair; the public key becomes `enc_key`. */
  encKeyPair: EncKeyPair;
  /**
   * Whether to retire the contract maintenance authority right after the
   * deploy. Required with no default: the choice trades upgradability for
   * custody and must be made explicitly. See {@link deployAccount}.
   */
  lockAccount: boolean;
  /** Randomness for the boot salt and private-state id; defaults to Web Crypto. */
  randomBytes?: RandomBytes;
};

export type DeployedAccount = {
  /** Hex address of the deployed Account Custody Contract. */
  address: string;
  /** Boot salt the activation must present alongside the device key. */
  salt: Uint8Array;
  /**
   * Submits `activate_initial_device_with_jubjub` with the authoriser's
   * public key and the deploy salt, installing the initial device entry.
   * Rejects when the transaction lands with a failing status, so a
   * circuit abort is never read as an activated account.
   */
  activate: () => Promise<unknown>;
};

const transactionTtl = (): Date => new Date(Date.now() + DEPLOY_TX_TTL_MS);

/**
 * Deploys a fresh Account Custody Contract carrying only the jubjub arm
 * and returns its address, the boot salt, and the activation call.
 *
 * The constructor cannot insert the initial device entry (the contract
 * address does not exist yet inside it), so it stores a salted boot
 * commitment over the authoriser's public key with no device entry yet;
 * `activate` presents the same key and salt to install the real entry
 * immediately after.
 *
 * Deploying mints a contract maintenance authority whose signing key is
 * total custody: it can replace any operation's verifier key and release
 * the account's assets around the device seam. `lockAccount` decides its
 * fate, explicitly:
 *
 * - `true`: one maintenance update follows the deploy, replacing the
 *   authority with an unsatisfiable one (empty committee at threshold 1).
 *   No maintenance update can ever be signed again, so the device seam
 *   becomes the only way to move the account's assets. The cost is that
 *   the account can never receive a future arm's circuits.
 * - `false`: the deploy-time authority stays live on-chain, but this
 *   implementation discards its signing key when the deploy returns; the
 *   key is held only in memory for the duration of the flow and is never
 *   persisted. Keeping the authority live is the caller's informed
 *   choice, accepted knowing the key amounts to full custody wherever it
 *   survives.
 */
export const deployAccount = async ({
  providers,
  authoriser,
  encKeyPair,
  lockAccount,
  randomBytes = length => crypto.getRandomValues(new Uint8Array(length)),
}: DeployAccountProps): Promise<DeployedAccount> => {
  const [contracts, ledger, networkIdModule, CompiledContract] =
    await Promise.all([
      import('@midnight-ntwrk/midnight-js-contracts'),
      import('@midnightntwrk/ledger-v9'),
      import('@midnight-ntwrk/midnight-js-network-id'),
      import('@midnight-ntwrk/compact-js/effect/CompiledContract'),
    ]);

  const publicKey = await authoriser.devicePublicKey();
  const salt = randomBytes(SALT_LENGTH);
  const bootCommitment = pureCircuits.derive_boot_commitment_with_jubjub(
    salt,
    publicKey,
  );
  const privateStateId = `account-${HexBytes.fromByteArray(
    randomBytes(PRIVATE_STATE_ID_LENGTH),
  )}`;
  const initialPrivateState = emptyAccountPrivateState(encKeyPair.secretKey);
  const compiledContract = CompiledContract.make('account', Contract).pipe(
    CompiledContract.withWitnesses(accountWitnesses),
  );

  const createDeployTransaction =
    contracts.createUnprovenDeployTx as unknown as CreateUnprovenAccountDeployTx;
  const deployData = await createDeployTransaction(providers, {
    compiledContract,
    initialPrivateState,
    args: [bootCommitment, encKeyPair.publicKey],
  });
  const fullState = ledger.ContractState.deserialize(
    deployData.public.initialContractState.serialize(),
  );

  const deployedState = new ledger.ContractState();
  deployedState.data = fullState.data;
  deployedState.maintenanceAuthority = fullState.maintenanceAuthority;
  for (const name of DEPLOYED_OPERATIONS) {
    const operation = fullState.operation(name);
    if (!operation) {
      throw new Error(`Compiled account contract has no operation '${name}'`);
    }
    deployedState.setOperation(name, operation);
  }

  const deploy = new ledger.ContractDeploy(deployedState);
  const address = String(deploy.address);
  const deployTx = ledger.Transaction.fromParts(
    networkIdModule.getNetworkId(),
    undefined,
    undefined,
    ledger.Intent.new(transactionTtl()).addDeploy(deploy),
  );
  assertSubmitted(
    'Account deploy',
    await submitTx(providers, { unprovenTx: deployTx }),
  );

  if (lockAccount) {
    // The authority counter is the one the deploy carried: its signing key
    // exists only in this closure, so nothing can have advanced it since.
    const authorityCounter = fullState.maintenanceAuthority.counter;
    const retire = new ledger.ReplaceAuthority(
      new ledger.ContractMaintenanceAuthority([], 1, authorityCounter + 1n),
    );
    const update = new ledger.MaintenanceUpdate(
      address,
      [retire],
      authorityCounter,
    );
    const signed = update.addSignature(
      0n,
      ledger.signData(deployData.private.signingKey, update.dataToSign),
    );
    const retireTx = ledger.Transaction.fromParts(
      networkIdModule.getNetworkId(),
      undefined,
      undefined,
      ledger.Intent.new(transactionTtl()).addMaintenanceUpdate(signed),
    );
    assertSubmitted(
      'Authority retirement',
      await submitTx(providers, { unprovenTx: retireTx }),
    );
  }

  const findContract =
    contracts.findDeployedContract as unknown as FindDeployedAccountContract;
  const found = await findContract(providers, {
    contractAddress: address,
    compiledContract,
    privateStateId,
    initialPrivateState,
  });

  return {
    address,
    salt,
    activate: async () => {
      const finalized = await submitWithDustRetry(async () =>
        found.callTx[ACTIVATE_INITIAL_DEVICE_CIRCUIT](publicKey, salt),
      );
      assertSubmitted('Account activation', finalized);
      return finalized;
    },
  };
};
