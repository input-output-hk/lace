/**
 * An Account Custody Contract executed in process over the compact
 * runtime: circuits run against a local query context with no node,
 * indexer, proof server or wallet, so a test can issue and revoke grants
 * through the module's own authoriser and gated call and read the
 * resulting ledger state back. The contract's assertions run exactly as
 * on chain, so a challenge the contract's mirror does not reproduce, or a
 * scope the issue rules refuse, aborts the call here as it would there.
 */
import { AccAddress } from '@lace-contract/passport';
import { ByteArray, HexBytes } from '@lace-lib/util';
import {
  createCircuitContext,
  createConstructorContext,
  sampleContractAddress,
} from '@midnight-ntwrk/compact-runtime';
import * as ledgerV9 from '@midnightntwrk/ledger-v9';

import { Contract, ledger, pureCircuits } from '../../src/acc/acc-module';
import { devJubjubAuthoriser } from '../../src/acc/dev-authoriser';
import { executeGatedCall } from '../../src/acc/gated-call';
import {
  JubjubDevice,
  authArgs,
  randomJubjubScalar,
} from '../../src/acc/signer';
import { resolveUseCounter } from '../../src/acc/use-counter';

import type { Ledger, Witnesses } from '../../src/acc/acc-module';
import type { GatedContractHandle } from '../../src/acc/gated-call';
import type { GrantCircuitCall } from '../../src/acc/grants';
import type {
  MaintenanceVerifyingKey,
  PassportAuthoriser,
  ShieldedCoin,
  UseCounter,
} from '@lace-contract/passport';
import type {
  ChargedState,
  CircuitContext,
  CircuitResults,
} from '@midnight-ntwrk/compact-runtime';

/** A held coin as the contract's witness hands it to a spend. */
type QualifiedCoin = {
  nonce: Uint8Array;
  color: Uint8Array;
  value: bigint;
  mt_index: bigint;
};

/** The coin a shielded spend consumes, present only while one runs. */
type PrivateState = { heldCoin?: QualifiedCoin };
type ImpureCircuit = (
  context: CircuitContext<PrivateState>,
  ...args: unknown[]
) => Promise<CircuitResults<PrivateState, unknown>>;

/**
 * Serves the coin the running spend was given, and refuses a spend
 * outside one, since the simulated account captures no coins of its own.
 */
const witnesses: Witnesses<PrivateState> = {
  held_coin: context => {
    const { heldCoin } = context.privateState;
    if (!heldCoin) throw new Error('The simulated account holds no coins');
    return [context.privateState, heldCoin];
  },
};

/** A fixed block time in POSIX seconds, before any sensible expiry. */
const SIM_BLOCK_TIME = 1_800_000_000;
const VETO_WINDOW_SECONDS = 259_200n;
const SALT_LENGTH = 32;
const ENC_KEY_LENGTH = 32;
const RECOVERY_WRAP_LENGTH = 64;

type CoinPublicKey = { bytes: Uint8Array };

/** A coin the account holds, with the tree index its commitment took. */
type SimHeldCoin = ShieldedCoin & { mtIndex: bigint };

/**
 * The contract maintenance authority as the ledger keeps it: a committee
 * at threshold one and the counter the next update is built against.
 */
type SimAuthority = {
  committee: MaintenanceVerifyingKey[];
  threshold: number;
  counter: bigint;
};

type AccountSimProps = {
  addressHex: string;
  scalar: bigint;
  contract: InstanceType<typeof Contract>;
  state: ChargedState;
  coinPublicKey: CoinPublicKey;
  operations?: readonly string[];
  authority: SimAuthority;
};

type CreateAccountSimOptions = {
  /** The X25519 public key the constructor stores as `enc_key`; random by default. */
  encKey?: Uint8Array;
  /** The initial device's scalar; random by default. */
  scalar?: bigint;
  /**
   * The operations the contract state reports verifier keys for; every
   * impure circuit by default. The sim runs any circuit regardless.
   */
  operations?: readonly string[];
  /** The maintenance committee the deployment leaves; none, a locked account, by default. */
  committee?: MaintenanceVerifyingKey[];
};

export class AccountSim {
  public readonly address: Uint8Array;
  public readonly account: AccAddress;
  public readonly authoriser: PassportAuthoriser;
  private readonly addressHex: string;
  private readonly scalar: bigint;
  private state: ChargedState;
  private readonly contract: InstanceType<typeof Contract>;
  private readonly circuits: Record<string, ImpureCircuit>;
  private readonly coinPublicKey: CoinPublicKey;
  private operations: readonly string[];
  private authority: SimAuthority;

  private constructor({
    addressHex,
    scalar,
    contract,
    state,
    coinPublicKey,
    operations,
    authority,
  }: AccountSimProps) {
    this.addressHex = addressHex;
    this.scalar = scalar;
    this.address = ByteArray.fromHex(HexBytes(addressHex));
    this.account = AccAddress(addressHex);
    this.authoriser = devJubjubAuthoriser(scalar);
    this.contract = contract;
    this.circuits = contract.impureCircuits as unknown as Record<
      string,
      ImpureCircuit
    >;
    this.state = state;
    this.coinPublicKey = coinPublicKey;
    this.operations = operations ?? Object.keys(this.circuits);
    this.authority = authority;
  }

  /** Deploys and activates an account whose initial device is the sim's. */
  public static async create({
    encKey = crypto.getRandomValues(new Uint8Array(ENC_KEY_LENGTH)),
    scalar = randomJubjubScalar(),
    operations,
    committee = [],
  }: CreateAccountSimOptions = {}): Promise<AccountSim> {
    const device = new JubjubDevice(scalar);
    const contract = new Contract<PrivateState>(witnesses);
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const coinPublicKey: CoinPublicKey = {
      bytes: crypto.getRandomValues(new Uint8Array(ENC_KEY_LENGTH)),
    };
    const deployed = await contract.initialState(
      createConstructorContext<PrivateState>({}, coinPublicKey),
      device.bootCommitment(salt),
      encKey,
      JubjubDevice.generate().pk,
      new Uint8Array(RECOVERY_WRAP_LENGTH),
      VETO_WINDOW_SECONDS,
    );
    const sim = new AccountSim({
      addressHex: sampleContractAddress(),
      scalar,
      contract,
      state: deployed.currentContractState.data,
      coinPublicKey,
      operations,
      authority: { committee, threshold: 1, counter: 0n },
    });
    await sim.call('activate_initial_device_with_jubjub', device.pk, salt);
    return sim;
  }

  /**
   * The account as it stands now, as a second sim: calls on either leave
   * the other where it was, so a test can run two histories from one
   * costly state.
   */
  public fork(): AccountSim {
    return new AccountSim({
      addressHex: this.addressHex,
      scalar: this.scalar,
      contract: this.contract,
      state: this.state,
      coinPublicKey: this.coinPublicKey,
      operations: this.operations,
      authority: this.authority,
    });
  }

  /** The maintenance authority the contract holds now. */
  public maintenanceAuthority(): SimAuthority {
    return this.authority;
  }

  /**
   * Applies a maintenance update as the ledger would: it must be built
   * against the current counter and carry, at index 0, a signature of the
   * sole committee member over its data. A replace installs its
   * authority, a verifier key insert adds its operation to those the
   * contract state reports, and the counter advances by one.
   */
  public maintain(update: ledgerV9.MaintenanceUpdate): void {
    const { committee, counter } = this.authority;
    const [[index, signature]] = update.signatures;
    if (
      committee.length !== 1 ||
      index !== 0n ||
      update.counter !== counter ||
      !ledgerV9.verifySignature(committee[0], update.dataToSign, signature)
    ) {
      throw new Error('The simulated contract refuses the maintenance update');
    }
    let next: SimAuthority = { ...this.authority, counter: counter + 1n };
    for (const change of update.updates) {
      if (change instanceof ledgerV9.VerifierKeyInsert) {
        const operation = String(change.operation);
        if (!this.operations.includes(operation)) {
          this.operations = [...this.operations, operation];
        }
      }
      if (change instanceof ledgerV9.ReplaceAuthority) {
        const { committee: installed, threshold } = change.authority;
        next = {
          committee: installed.map(({ tag, value }) => ({ tag, value })),
          threshold,
          counter: change.authority.counter,
        };
      }
    }
    this.authority = next;
  }

  /** The device key behind the sim's authoriser. */
  public device(): JubjubDevice {
    return new JubjubDevice(this.scalar);
  }

  /** Runs one circuit against the current state and keeps the result. */
  public async call(circuit: string, ...args: unknown[]): Promise<unknown> {
    return (await this.run(circuit, ...args)).result;
  }

  /**
   * Deposits a shielded coin with its inbox entry through the
   * permissionless circuit, as any depositor may, and returns the coin
   * commitment the contract claimed for it: what the chain would carry as
   * the output's commitment.
   */
  public async deposit(coin: ShieldedCoin, entry: Uint8Array): Promise<string> {
    const results = await this.run('deposit_shielded', coin, entry);
    const [commitment] =
      results.context.callContext.currentQueryContext.effects
        .claimedShieldedReceives;
    if (commitment === undefined) {
      throw new Error('The simulated deposit claimed no coin');
    }
    return commitment;
  }

  /**
   * Spends a held coin in full to a user through the device-gated
   * shielded withdrawal, signed by the sim's device as the module's
   * authoriser would sign it, and returns the nullifier the contract
   * claimed for the spend: what the chain would record for the input.
   */
  public async withdrawShielded(
    coin: SimHeldCoin,
    recipient: Uint8Array,
  ): Promise<string> {
    const ledgerState = this.ledger();
    const { useCounter } = await resolveUseCounter({
      ledgerState,
      authoriser: this.authoriser,
      address: this.account,
    });
    const device = this.device();
    const held: QualifiedCoin = {
      nonce: coin.nonce,
      color: coin.color,
      value: coin.value,
      mt_index: coin.mtIndex,
    };
    const authorisation = device.sign(
      (sigR, grindNonce) =>
        pureCircuits.challenge_withdraw_shielded_with_jubjub(
          { bytes: this.address },
          sigR,
          device.pk,
          { bytes: recipient },
          coin.color,
          coin.value,
          held,
          ledgerState.auth_nonce,
          grindNonce,
        ),
      useCounter,
    );
    const results = await this.runWith(
      { heldCoin: held },
      'withdraw_shielded_with_jubjub',
      { bytes: recipient },
      coin.color,
      coin.value,
      ...authArgs(authorisation),
    );
    const [nullifier] =
      results.context.callContext.currentQueryContext.effects.claimedNullifiers;
    if (nullifier === undefined) {
      throw new Error('The simulated withdrawal claimed no nullifier');
    }
    return nullifier;
  }

  public ledger(): Ledger {
    return ledger(this.state);
  }

  /** The contract state as an indexer would serve it. */
  public contractState(): {
    data: ChargedState;
    operations: () => string[];
  } {
    return { data: this.state, operations: () => [...this.operations] };
  }

  /** The found-contract handle shape, over every circuit of the contract. */
  public handle(): GatedContractHandle {
    return {
      callTx: Object.fromEntries(
        Object.keys(this.circuits).map(circuit => [
          circuit,
          async (...args: unknown[]) => {
            await this.call(circuit, ...args);
            return { txId: `simulated-${circuit}` };
          },
        ]),
      ),
    };
  }

  /** Submits a gated call through the module's gate, as a flow would. */
  public async gated(
    call: GrantCircuitCall,
    knownUseCounter?: UseCounter,
  ): Promise<UseCounter> {
    return executeGatedCall({
      handle: this.handle(),
      authoriser: this.authoriser,
      circuit: call.circuit,
      args: call.args,
      address: this.account,
      ledgerState: this.ledger(),
      knownUseCounter,
    });
  }

  private async run(
    circuit: string,
    ...args: unknown[]
  ): Promise<CircuitResults<PrivateState, unknown>> {
    return this.runWith({}, circuit, ...args);
  }

  private async runWith(
    privateState: PrivateState,
    circuit: string,
    ...args: unknown[]
  ): Promise<CircuitResults<PrivateState, unknown>> {
    const impure = this.circuits[circuit];
    if (!impure)
      throw new Error(`Simulated contract has no circuit ${circuit}`);
    const context = createCircuitContext<PrivateState>({
      circuitId: circuit,
      contractAddress: this.addressHex,
      coinPublicKeyOrZswapState: this.coinPublicKey,
      contractState: this.state,
      privateState,
      time: SIM_BLOCK_TIME,
    });
    const results = await impure(context, ...args);
    this.state = results.context.callContext.currentQueryContext.state;
    return results;
  }
}
