import { Cardano, Serialization } from '@cardano-sdk/core';
import { AccountId, WalletId, WalletType } from '@lace-contract/wallet-repo';
import { of } from 'rxjs';
import { vi } from 'vitest';

import {
  CardanoDappConnectorApi,
  COLLATERAL_BLOCK_LOG,
} from '../../src/common/store/dependencies/cardano-dapp-connector-api';

import type { SenderContext } from '../../src/browser/types';
import type { CardanoDappConnectorApiDependencies } from '../../src/common/store/dependencies/cardano-dapp-connector-api';
import type {
  CardanoConfirmationCallback,
  CardanoConfirmationResult,
} from '../../src/common/store/dependencies/create-confirmation-callback';
import type { AnyAddress } from '@lace-contract/addresses';
import type {
  AccountRewardAccountDetailsMap,
  AccountUtxoMap,
  CardanoAccountAddressHistoryMap,
} from '@lace-contract/cardano-context';
import type { AnyAccount, AnyWallet } from '@lace-contract/wallet-repo';

/**
 * One `CardanoDappConnectorApi` fixture for every API-level collateral suite,
 * so a scenario is expressed as a few lines of overrides rather than another
 * 200-line dependency object.
 *
 * Every transaction here is REAL decodable CBOR: `#validateCanSign` decodes
 * unconditionally, before either `partialSign` branch, so an opaque
 * placeholder is not safe.
 */

export const ACCOUNT_ID = AccountId('acc-1');
export const WALLET_ID = WalletId('wallet-1');
export const ORIGIN = 'https://test-dapp.com';

export const OWN_ADDRESS = Cardano.PaymentAddress(
  'addr_test1qrr7pflnkppvp49sl2hjs9v255ydycp8zxuxzfjw03vev9ns6cdlwymh7v9kr8cd8cy5vx8l7h6v9da84ml2cjd90fusnjsh8d',
);
export const FOREIGN_ADDRESS = Cardano.PaymentAddress(
  'addr_test1qruygd02feqeue4hkt67vwgn03p04uuv2k34ed25n4rcwt8pa7kgfet22l6w3078tm72c62p4597urnlpw6v6278cpxs8jxykl',
);

const REWARD_ACCOUNT = Cardano.RewardAccount(
  'stake_test1urpklgzqsh9yqz8pkyuxcw9dlszpe5flnxjtl55epla6ftqktdyfz',
);

export const chainId = {
  networkId: Cardano.NetworkId.Testnet,
  networkMagic: Cardano.NetworkMagics.Preprod,
} as Cardano.ChainId;

export const mockAccount: AnyAccount = {
  accountId: ACCOUNT_ID,
  walletId: WALLET_ID,
  accountIndex: 0,
  accountType: 'InMemory',
  name: 'Test Account',
  blockchainName: 'Cardano',
  blockchainSpecific: {
    accountIndex: 0,
    chainId,
    extendedAccountPublicKey: '0'.repeat(128),
  },
} as unknown as AnyAccount;

export const mockWallet: AnyWallet = {
  walletId: WALLET_ID,
  name: 'Test Wallet',
  type: WalletType.InMemory,
  metadata: {},
  blockchainSpecific: {},
} as unknown as AnyWallet;

export const mockAddresses: AnyAddress[] = [
  {
    address: OWN_ADDRESS,
    accountId: ACCOUNT_ID,
    blockchainName: 'Cardano',
    data: {
      type: 0,
      index: 0,
      networkId: 0,
      accountIndex: 0,
      rewardAccount: REWARD_ACCOUNT,
      stakeKeyDerivationPath: { role: 2, index: 0 },
    },
  } as unknown as AnyAddress,
];

export const utxo = (
  txId: Cardano.TransactionId,
  index: number,
  address: Cardano.PaymentAddress,
): Cardano.Utxo => [
  { txId, index, address },
  { address, value: { coins: 5_000_000n } as unknown as Cardano.Value },
];

const OWN_COLLATERAL_TX_ID = Cardano.TransactionId('a'.repeat(64));
const FOREIGN_COLLATERAL_TX_ID = Cardano.TransactionId('b'.repeat(64));
const CHAINED_COLLATERAL_TX_ID = Cardano.TransactionId('c'.repeat(64));

export const SPEND_INPUT: Cardano.TxIn = {
  txId: Cardano.TransactionId('f'.repeat(64)),
  index: 0,
};
export const OWN_COLLATERAL_INPUT: Cardano.TxIn = {
  txId: OWN_COLLATERAL_TX_ID,
  index: 0,
};
export const FOREIGN_COLLATERAL_INPUT: Cardano.TxIn = {
  txId: FOREIGN_COLLATERAL_TX_ID,
  index: 0,
};
export const CHAINED_COLLATERAL_INPUT: Cardano.TxIn = {
  txId: CHAINED_COLLATERAL_TX_ID,
  index: 0,
};

export const OWN_COLLATERAL_UTXO = utxo(OWN_COLLATERAL_TX_ID, 0, OWN_ADDRESS);
export const CHAINED_COLLATERAL_UTXO = utxo(
  CHAINED_COLLATERAL_TX_ID,
  0,
  OWN_ADDRESS,
);

const txSuffix = { value: 0 };

/** Builds a real, decodable tx CBOR with the given collateral shape. */
export const buildTx = ({
  collaterals,
  collateralReturnAddress,
}: {
  collaterals: Cardano.TxIn[];
  collateralReturnAddress?: Cardano.PaymentAddress;
}): string => {
  txSuffix.value += 1;
  const id = Cardano.TransactionId(`${txSuffix.value}`.padStart(64, '0'));
  return Serialization.Transaction.fromCore({
    id,
    body: {
      inputs: [SPEND_INPUT],
      outputs: [
        {
          address: OWN_ADDRESS,
          value: { coins: 1_000_000n } as unknown as Cardano.Value,
        },
      ],
      fee: 170_000n,
      collaterals,
      ...(collateralReturnAddress
        ? {
            collateralReturn: {
              address: collateralReturnAddress,
              value: { coins: 2_000_000n } as unknown as Cardano.Value,
            },
          }
        : {}),
    } as Cardano.TxBody,
    witness: { signatures: new Map() },
  } as Cardano.Tx).toCbor() as string;
};

/** All-own collateral, own return. */
export const CASE_A_TX_CBOR = buildTx({
  collaterals: [OWN_COLLATERAL_INPUT],
  collateralReturnAddress: OWN_ADDRESS,
});
/** All-own collateral, FOREIGN return -- the transaction this guard exists for. */
export const CASE_B_TX_CBOR = buildTx({
  collaterals: [OWN_COLLATERAL_INPUT],
  collateralReturnAddress: FOREIGN_ADDRESS,
});
/** dApp-sponsored collateral: the wallet owns none, so the return is never inspected. */
export const CASE_C_TX_CBOR = buildTx({
  collaterals: [FOREIGN_COLLATERAL_INPUT],
  collateralReturnAddress: FOREIGN_ADDRESS,
});
/** Own collateral beside collateral the wallet does not hold, own return: allowed. */
export const MIXED_OWN_RETURN_TX_CBOR = buildTx({
  collaterals: [OWN_COLLATERAL_INPUT, FOREIGN_COLLATERAL_INPUT],
  collateralReturnAddress: OWN_ADDRESS,
});
/** All-own collateral, no `collateralReturn` at all. */
export const CASE_E_TX_CBOR = buildTx({
  collaterals: [OWN_COLLATERAL_INPUT],
});

export const senderContext: SenderContext = {
  sender: { url: ORIGIN, tab: { id: 1 } } as SenderContext['sender'],
};

/**
 * The dApp-facing refusal copy, pinned verbatim and independently of
 * `assert-collateral-ownership.ts`, so this suite reds if the two drift.
 */
export const CASE_B_MESSAGE =
  "if the smart contract fails, this transaction would send this wallet's funds to an address this wallet doesn't own; Lace won't sign it.";

export type CollateralApiHarness = {
  api: CardanoDappConnectorApi;
  userConfirmationRequest: ReturnType<typeof vi.fn>;
  signTransaction: ReturnType<typeof vi.fn>;
  logger: { warn: ReturnType<typeof vi.fn> };
};

/** The WARN messages an API instance emitted, in order. */
export const warnMessages = (logger: {
  warn: ReturnType<typeof vi.fn>;
}): string[] => logger.warn.mock.calls.map(call => String(call[0]));

/**
 * The block-path stages an instance logged, in order. A `stage` on the
 * payload rather than a distinct sentence per state, so an assertion cannot
 * drift when the message is copy-edited.
 */
export const blockStages = (logger: {
  warn: ReturnType<typeof vi.fn>;
}): string[] =>
  logger.warn.mock.calls
    .filter(call => call[0] === COLLATERAL_BLOCK_LOG)
    .map(call => String((call[1] as { stage?: string })?.stage));

/**
 * A real API instance whose ownership authority holds
 * {@link OWN_COLLATERAL_UTXO} and whose `accountUtxos$` (the available view)
 * holds nothing -- the production relationship between the two.
 */
export const createCollateralApi = (
  overrides: Partial<CardanoDappConnectorApiDependencies> = {},
  confirmation: () => Promise<CardanoConfirmationResult> = async () => ({
    outcome: 'confirmed',
  }),
): CollateralApiHarness => {
  const userConfirmationRequest = vi.fn(confirmation);
  const signTransaction = vi.fn().mockResolvedValue('witness-set-cbor');
  const logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    trace: vi.fn(),
  };
  const api = new CardanoDappConnectorApi({
    logger,
    accountUtxos$: of({} as AccountUtxoMap),
    ownershipUtxos$: of({
      [ACCOUNT_ID]: [OWN_COLLATERAL_UTXO],
    } as unknown as AccountUtxoMap),
    accountUnspendableUtxos$: of({} as AccountUtxoMap),
    rewardAccountDetails$: of({} as AccountRewardAccountDetailsMap),
    addresses$: of(mockAddresses),
    accountTransactionHistory$: of({} as CardanoAccountAddressHistoryMap),
    chainId$: of(chainId),
    allAccounts$: of([mockAccount]),
    allWallets$: of([mockWallet]),
    getAccountIdForOrigin: (origin: string) =>
      origin === ORIGIN ? ACCOUNT_ID : undefined,
    resolveChainedInputs: (): Cardano.Utxo[] => [],
    userConfirmationRequest:
      userConfirmationRequest as unknown as CardanoConfirmationCallback,
    signTransaction,
    submitTransaction: vi.fn(),
    ...overrides,
  });
  return { api, userConfirmationRequest, signTransaction, logger };
};
