import { ByteArray, HexBytes } from '@lace-lib/util';

import { sealInboxEntry } from '../acc/inbox';

import { createDevWalletBalancer } from './dev-sponsor';
import { createMidnightProviders } from './providers';
import { assertSubmitted, submitWithDustRetry } from './submit';

import type { DevSponsorConfig, DevTokenKind } from './dev-sponsor';
import type { GatedContractHandle } from '../acc/gated-call';
import type {
  PassportNetworkConfig,
  PassportProver,
} from '@lace-contract/passport';

/** The network id of the Passport reference localnet, the only one a dev deposit runs on. */
const LOCALNET_NETWORK_ID = 'undeployed';

/** The raw colour of NIGHT, shielded and unshielded alike. */
const NIGHT_COLOR = '00'.repeat(32);

const COLOR_PATTERN = /^[\da-f]{64}$/i;
const COIN_NONCE_LENGTH = 32;
const VALUE_MAX = (1n << 128n) - 1n;

/** Raised when a dev deposit is configured for any network but the localnet. */
class DevDepositNetworkError extends Error {
  public constructor(networkId: string) {
    super(
      `Dev deposits run only on the localnet (network id "${LOCALNET_NETWORK_ID}"), not on "${networkId}".`,
    );
    this.name = 'DevDepositNetworkError';
  }
}

/**
 * Raised for an unshielded NIGHT deposit. On ledger 9 the funding leg a
 * NIGHT deposit needs, a NIGHT input paired with its NIGHT change output,
 * prices above the dismissal time the node allows for its size, so the
 * ledger refuses it before submission; non-native colours pass.
 */
class UnshieldedNightDepositError extends Error {
  public constructor() {
    super(
      "Unshielded NIGHT deposits exceed ledger 9's dismissal limit; deposit shielded NIGHT or a non-native colour instead.",
    );
    this.name = 'UnshieldedNightDepositError';
  }
}

/** How `createDevDeposit` reaches the localnet and the wallet it funds from. */
export type DevDepositConfig = {
  /** Hex seed of the funded development wallet the deposits come from. */
  seedHex: string;
  /** The localnet the account lives on; any other network id is refused. */
  network: PassportNetworkConfig;
  /** Prover the deposit circuit is proved with. */
  prover: PassportProver;
  /** Proof server endpoint the wallet proves its own spends against. */
  proofServerUrl: string;
  /** Wallet factory; injected for tests. */
  createWalletContext?: DevSponsorConfig['createWalletContext'];
};

/** One deposit into a Passport account. */
export type DevDepositRequest = {
  /** Address of the Passport account receiving the deposit. */
  address: string;
  /** Amount in the token's smallest unit; positive and at most 2^128 - 1. */
  amount: bigint;
  /** Raw token colour as 64 hex characters; NIGHT when omitted. */
  color?: string;
};

/** What a landed deposit left: the id of its transaction. */
export type DevDepositResult = { txId: string };

/** Funds Passport accounts on the localnet from the development wallet. */
export type DevDeposit = {
  /**
   * Sends a fresh shielded coin to the account through `deposit_shielded`,
   * with its InboxEntry v1 sealed to the account's current ledger
   * `enc_key`, so the account's holdings read finds it.
   */
  depositShielded(request: DevDepositRequest): Promise<DevDepositResult>;
  /**
   * Sends unshielded tokens to the account through `deposit_unshielded`.
   * NIGHT is refused before anything is built, as ledger 9 refuses it.
   */
  depositUnshielded(request: DevDepositRequest): Promise<DevDepositResult>;
  /** Releases the wallet the first deposit started. */
  stop(): Promise<void>;
};

type DepositCircuit = 'deposit_shielded' | 'deposit_unshielded';

type FinalizedDeposit = { public: { txId: string } };

/** One deposit circuit call and the token kinds its balancing covers. */
type DepositCall = {
  address: string;
  circuit: DepositCircuit;
  args: readonly unknown[];
  tokenKinds: DevTokenKind[];
};

const parseColor = (color: string): Uint8Array => {
  if (!COLOR_PATTERN.test(color)) {
    throw new Error(
      `A deposit colour must be 64 hex characters, got "${color}".`,
    );
  }
  return ByteArray.fromHex(HexBytes(color.toLowerCase()));
};

const assertAmount = (amount: bigint): void => {
  if (amount <= 0n || amount > VALUE_MAX) {
    throw new RangeError(
      `A deposit amount must be positive and fit 128 bits, got ${amount}.`,
    );
  }
};

/**
 * A development deposit over the funded localnet wallet, the sender side
 * of the Account Custody Contract's permissionless deposits. The wallet
 * proves the deposit circuit, balances the transaction from its own funds
 * in the deposited kind and in dust, pays, and submits; no device of the
 * account signs anything.
 *
 * It runs its own wallet next to the fee sponsor's. Both spend the same
 * seed's dust, so a transaction built while the other's is in flight can
 * be refused for a spent dust output; the submission retries those.
 *
 * @throws DevDepositNetworkError for any network but the localnet.
 */
export const createDevDeposit = ({
  seedHex,
  network,
  prover,
  proofServerUrl,
  createWalletContext,
}: DevDepositConfig): DevDeposit => {
  if (network.networkId !== LOCALNET_NETWORK_ID) {
    throw new DevDepositNetworkError(network.networkId);
  }
  const balancer = createDevWalletBalancer({
    seedHex,
    networkId: network.networkId,
    indexerUrl: network.indexerUrl,
    indexerWsUrl: network.indexerWsUrl,
    nodeUrl: network.nodeUrl,
    proofServerUrl,
    ...(createWalletContext ? { createWalletContext } : {}),
  });

  const submitDeposit = async ({
    address,
    circuit,
    args,
    tokenKinds,
  }: DepositCall): Promise<DevDepositResult> => {
    const providers = await createMidnightProviders({
      network,
      prover,
      sponsor: {
        balanceAndSign: async unbalancedTx =>
          balancer.balanceAndSign(unbalancedTx, tokenKinds),
      },
    });
    const { connectAccountHandle } = await import('../acc/gated-call');
    const handle: GatedContractHandle = await connectAccountHandle(
      providers,
      address,
    );
    const finalized = (await submitWithDustRetry(async () =>
      handle.callTx[circuit](...args),
    )) as FinalizedDeposit;
    assertSubmitted(`Deposit to ${address}`, finalized);
    return { txId: finalized.public.txId };
  };

  return {
    depositShielded: async ({ address, amount, color = NIGHT_COLOR }) => {
      assertAmount(amount);
      const coin = {
        nonce: crypto.getRandomValues(new Uint8Array(COIN_NONCE_LENGTH)),
        color: parseColor(color),
        value: amount,
      };
      const { readAccountLedger } = await import('../flows/account-call');
      const { ledgerState } = await readAccountLedger(address, network);
      const entry = await sealInboxEntry(ledgerState.enc_key, coin);
      return submitDeposit({
        address,
        circuit: 'deposit_shielded',
        args: [coin, entry],
        tokenKinds: ['shielded', 'dust'],
      });
    },
    depositUnshielded: async ({ address, amount, color = NIGHT_COLOR }) => {
      assertAmount(amount);
      const colorBytes = parseColor(color);
      if (color.toLowerCase() === NIGHT_COLOR) {
        throw new UnshieldedNightDepositError();
      }
      return submitDeposit({
        address,
        circuit: 'deposit_unshielded',
        args: [colorBytes, amount],
        tokenKinds: ['unshielded', 'dust'],
      });
    },
    stop: async () => balancer.stop(),
  };
};
