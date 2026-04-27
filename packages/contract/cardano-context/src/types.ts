import type { CardanoNetworkId } from './value-objects';
import type {
  Asset,
  Cardano,
  EraSummary,
  ProviderError,
  Serialization,
  SubmitTxArgs,
} from '@cardano-sdk/core';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type {
  AccountKeyDerivationPath,
  GroupedAddress,
} from '@cardano-sdk/key-management';
import type { ActivityType, RewardActivity } from '@lace-contract/activities';
import type {
  AnyAddress,
  AnyBlockchainAddress,
  Address,
} from '@lace-contract/addresses';
import type {
  RawTokenWithoutContext,
  TokenId,
  TokenMetadata,
} from '@lace-contract/tokens';
import type { FeeEntry } from '@lace-contract/tx-executor';
import type { AccountId, InMemoryWallet } from '@lace-contract/wallet-repo';
import type {
  BigNumber,
  HexBytes,
  Milliseconds,
  Result,
  Timestamp,
} from '@lace-sdk/util';
import type { Observable } from 'rxjs';
import type { Logger } from 'ts-log';
import type { Tagged } from 'type-fest';

export type CardanoAddress = Address & Tagged<string, 'CardanoAddress'>;
export type CardanoPaymentAddress = CardanoAddress &
  Tagged<string, 'CardanoPaymentAddress'>;
export type CardanoBaseAddress = CardanoPaymentAddress &
  Tagged<string, 'CardanoBaseAddress'>;
export type CardanoEnterpriseAddress = CardanoPaymentAddress &
  Tagged<string, 'CardanoEnterpriseAddress'>;
export type CardanoRewardAccount = CardanoAddress &
  Tagged<string, 'CardanoRewardAccount'>;

export const CardanoAddress = (address: string) => address as CardanoAddress;
export const CardanoPaymentAddress = (address: string) =>
  address as CardanoPaymentAddress;
export const CardanoBaseAddress = (address: string) =>
  address as CardanoBaseAddress;
export const CardanoEnterpriseAddress = (address: string) =>
  address as CardanoEnterpriseAddress;
export const CardanoRewardAccount = (account: string) =>
  account as CardanoRewardAccount;

export enum ActivityKind {
  Reward = 'reward',
  Transaction = 'transaction',
}

export type CardanoTokenMetadataFile = {
  mediaType: Asset.MediaType;
  src: Asset.Uri;
  name?: string;
  additionalProperties?: Record<string, string>;
};

export type CoinItemProps = {
  amount: string;
  id: number | string;
  logo?: string;
  name: string;
  symbol?: string;
};

export type TxOutputInput = {
  addr: string;
  amount: Cardano.Lovelace;
  assetList?: CoinItemProps[];
};

export interface TxSummary extends Omit<TxOutputInput, 'addr'> {
  addr: string[];
  type: ActivityType;
}

export type TransactionPool = {
  name: string;
  ticker: string;
  id: string;
};

export type TxInput = Pick<Cardano.HydratedTxIn, 'index' | 'txId'> & {
  value?: Cardano.Value;
  address?: Cardano.HydratedTxIn['address'];
};

export type AssetMetadataMap = Map<
  Cardano.AssetId,
  TokenMetadata<CardanoTokenMetadata>
>;

export interface TxMetadata {
  key: string;
  value: unknown[] | string;
}

export type CardanoTransaction = {
  addrInputs: TxOutputInput[];
  addrOutputs: TxOutputInput[];
  certificates?: Cardano.HydratedCertificate[];
  collateral: Cardano.Lovelace;
  deposit: Cardano.Lovelace;
  metadata?: TxMetadata[];
  proposalProcedures?: Cardano.ProposalProcedure[];
  returnedDeposit: Cardano.Lovelace;
  txSummary?: TxSummary[];
  votingProcedures?: Cardano.VotingProcedures;
  pools?: TransactionPool[];
};

export type Reward = {
  epoch: Cardano.EpochNo;
  rewards: BigNumber;
  /*
   * Pool ID is optional, as it will be undefined for rewards that are not associated with a pool
   * (e.g., treasury or reserves)
   * */
  poolId?: Cardano.PoolId;
};

export type CardanoRewardActivity = RewardActivity<Omit<Reward, 'rewards'>>;

export type CardanoTokenMetadata = {
  files?: CardanoTokenMetadataFile[];
  updatedAt: Timestamp;
  policyId?: string;
};

export type CardanoAddressData = Pick<
  GroupedAddress,
  'accountIndex' | 'index' | 'networkId' | 'stakeKeyDerivationPath' | 'type'
> & { networkMagic: Cardano.NetworkMagic; rewardAccount: CardanoRewardAccount };

export type CardanoTransactionHistoryItem = {
  txId: Cardano.TransactionId;
  txIndex: Cardano.TxIndex;
  blockNumber: Cardano.BlockNo;
  blockTime: Timestamp;
};

export type CardanoAddressTransactionHistoryMap = Record<
  CardanoPaymentAddress,
  {
    hasLoadedOldestEntry: boolean;
    transactionHistory: CardanoTransactionHistoryItem[];
  }
>;

export type CardanoAccountAddressHistoryMap = Record<
  AccountId,
  CardanoAddressTransactionHistoryMap
>;

export type CardanoAccountTransactionsHistoryMap = Record<
  AccountId,
  CardanoTransactionHistoryItem[]
>;

export type CardanoRewardAccountToRewardMap = Record<
  CardanoRewardAccount,
  Reward[]
>;

export type CardanoAccountToRewardAccountsMap = Record<
  AccountId,
  CardanoRewardAccountToRewardMap
>;

export type CardanoRewardAccountToDelegationMap = Record<
  CardanoRewardAccount,
  (DelegationInfo | RegistrationInfo | WithdrawalInfo)[]
>;

export type CardanoAccountToDelegationAccountsMap = Record<
  AccountId,
  CardanoRewardAccountToDelegationMap
>;

export type CardanoAccountToRewardsMap = Record<AccountId, Reward[]>;

export type CardanoProviderContext = {
  chainId: Cardano.ChainId;
};

export type GetTokensProps = {
  address: CardanoPaymentAddress;
  accountId: AccountId;
};

export type GetAccountRewardsProps = {
  rewardAccount: CardanoRewardAccount;
  page?: number;
  pageSize?: number;
};

export type RewardAccountInfo = {
  poolId?: Cardano.PoolId;
  drepId?: string;
  rewardsSum: BigNumber;
  isActive: boolean;
  isRegistered: boolean;
  controlledAmount: BigNumber;
  withdrawableAmount: BigNumber;
};

export type DelegationInfo = {
  activeEpoch: Cardano.EpochNo;
  txHash: Cardano.TransactionId;
  amount: BigNumber;
  poolId: Cardano.PoolId;
};

export type RegistrationInfo = {
  txHash: Cardano.TransactionId;
  action: 'deregistered' | 'registered';
};

export type WithdrawalInfo = {
  txHash: Cardano.TransactionId;
  amount: BigNumber;
};

export type GetRewardAccountInfoProps = {
  rewardAccount: CardanoRewardAccount;
};

export type RewardAccountDetails = {
  rewardAccountInfo: RewardAccountInfo;
};

export type AccountRewardAccountDetailsMap = Record<
  AccountId,
  RewardAccountDetails
>;

export type DiscoverAddressesProps = {
  xpub: Bip32PublicKeyHex;
  accountIndex: number;
};

export type ExtendedTxDetails = Cardano.HydratedTx & {
  blockTime: number;
};

export type DelegationTransactionDetailsMap = Record<
  CardanoRewardAccount,
  Record<string, ExtendedTxDetails>
>;

export type GetNextTxHistoryPageParams = {
  startAtBlock?: Cardano.BlockNo;
  startAtIndex?: Cardano.TxIndex;
  endAtBlock?: Cardano.BlockNo;
  endAtIndex?: Cardano.TxIndex;
  order?: 'asc' | 'desc';
};

export type GetAddressTransactionHistoryProps = GetNextTxHistoryPageParams & {
  address: CardanoPaymentAddress;
  numberOfItems: number;
};

export interface CardanoProvider {
  /***
   * @return Observable that emits once and completes
   *
   */
  getTip: (
    context: CardanoProviderContext,
  ) => Observable<Result<Cardano.Tip, ProviderError>>;
  /**
   * @returns Observable that emits addresses one by one and completes when the discovery is finished
   * Stops discovery and completes after first error is encountered and emitted.
   */
  discoverAddresses: (
    props: DiscoverAddressesProps,
    context: CardanoProviderContext,
  ) => Observable<
    Result<AnyBlockchainAddress<CardanoAddressData>, ProviderError>
  >;
  /**
   * @return Observable that emits once and completes
   */
  getTokens: (
    props: GetTokensProps,
    context: CardanoProviderContext,
  ) => Observable<Result<RawTokenWithoutContext[], ProviderError>>;
  /**
   * @return Observable that emits once and completes
   */
  getTokenMetadata: (
    props: { tokenId: TokenId },
    context: CardanoProviderContext,
  ) => Observable<Result<TokenMetadata<CardanoTokenMetadata>, ProviderError>>;
  /**
   * @return Observable that emits the sorted (by block time) and paged transactions for given
   * addresses once and completes
   */
  getAddressTransactionHistory: (
    props: GetAddressTransactionHistoryProps,
    context: CardanoProviderContext,
  ) => Observable<Result<CardanoTransactionHistoryItem[], ProviderError>>;

  /**
   * @return Observable that emits the sorted (by block time) and paged transactions for given
   * addresses once and completes
   */
  getAccountRewards: (
    props: GetAccountRewardsProps,
    context: CardanoProviderContext,
  ) => Observable<Result<Reward[], ProviderError>>;

  /**
   * @return Observable that emits account delegations history once and completes
   */
  getAccountDelegations: (
    props: GetAccountRewardsProps,
    context: CardanoProviderContext,
  ) => Observable<Result<DelegationInfo[], ProviderError>>;

  /**
   * @return Observable that emits account registrations history once and completes
   */
  getAccountRegistrations: (
    props: GetAccountRewardsProps,
    context: CardanoProviderContext,
  ) => Observable<Result<RegistrationInfo[], ProviderError>>;

  /**
   * @return Observable that emits account withdrawals history once and completes
   */
  getAccountWithdrawals: (
    props: GetAccountRewardsProps,
    context: CardanoProviderContext,
  ) => Observable<Result<WithdrawalInfo[], ProviderError>>;

  /**
   * @return Observable that emits account UTxOs once and completes
   */
  getAccountUtxos: (
    props: GetAccountRewardsProps,
    context: CardanoProviderContext,
  ) => Observable<Result<Cardano.Utxo[], ProviderError>>;

  /**
   * @return Observable that emits reward account info (rewards sum and controlled amount) once and completes
   */
  getRewardAccountInfo: (
    props: GetRewardAccountInfoProps,
    context: CardanoProviderContext,
  ) => Observable<Result<RewardAccountInfo, ProviderError>>;

  /**
   * @return Observable that emits the total number of transactions for the given stake address once and completes
   */
  getTotalAccountTransactionCount: (
    props: GetAccountRewardsProps,
    context: CardanoProviderContext,
  ) => Observable<Result<number, ProviderError>>;

  /**
   * @return Observable that emits transaction details for given id once and completes
   */
  getTransactionDetails: (
    txId: Cardano.TransactionId,
    context: CardanoProviderContext,
  ) => Observable<Result<ExtendedTxDetails, ProviderError>>;

  /**
   * @return Observable that emits a Result with latest Cardano protocol parameters once and completes
   */
  getProtocolParameters: (
    context: CardanoProviderContext,
  ) => Observable<Result<Cardano.ProtocolParameters, ProviderError>>;

  getEraSummaries: (
    context: CardanoProviderContext,
  ) => Observable<Result<EraSummary[], ProviderError>>;

  /**
   * @return Observable that emits a Result with resolved input from Blockfrost once and completes
   */
  resolveInput: (
    txIn: Cardano.TxIn,
    context: CardanoProviderContext,
  ) => Observable<Result<Cardano.TxOut | null, ProviderError>>;

  /**
   * @return Observable that emits the transaction ID once and completes
   */
  submitTx: (
    props: SubmitTxArgs,
    context: CardanoProviderContext,
  ) => Observable<Result<Cardano.TransactionId, ProviderError>>;
}

export interface CardanoProviderDependencies {
  cardanoProvider: CardanoProvider;
}

export interface CardanoProviderConfig {
  tipPollFrequency: Milliseconds;
}

type CommonCardanoAccountProps = {
  chainId: Cardano.ChainId;
  networkId?: CardanoNetworkId;
};
export type CardanoBip32AccountProps = CommonCardanoAccountProps & {
  accountIndex: number;
  extendedAccountPublicKey: Bip32PublicKeyHex;
};
export type CardanoMultiSigAccountProps = CommonCardanoAccountProps & {
  /**
   * All own signers must use the same key path
   */
  paymentKeyPath: AccountKeyDerivationPath;
  /**
   * All own signers must use the same key path
   */
  stakingKeyPath: AccountKeyDerivationPath;
  paymentScript: Cardano.NativeScript;
  stakingScript: Cardano.NativeScript;
};

export type CardanoAnyAccountProps =
  | CardanoBip32AccountProps
  | CardanoMultiSigAccountProps;

export type CardanoHardwareWalletProps = object;
export type CardanoMultiSigWalletProps = object;

export type CardanoSpecificInMemoryWalletData = {
  encryptedRootPrivateKey: HexBytes;
};

export type AddCardanoInMemoryWalletAccountProps = {
  password: Uint8Array;
  accountIndex: number;
  chainId: Cardano.ChainId;
  wallet: InMemoryWallet<CardanoAnyAccountProps>;
  logger: Logger;
};

export type CardanoSideEffectsDependencies = {
  addCardanoInMemoryWalletAccount: (
    props: AddCardanoInMemoryWalletAccountProps,
  ) => Observable<InMemoryWallet<CardanoAnyAccountProps>>;
  txExecutorCardano: {
    cardanoProtocolParameters$: Observable<
      RequiredProtocolParameters | undefined
    >;
    cardanoNetworkMagic$: Observable<Cardano.NetworkMagic | undefined>;
    cardanoAccountUtxos$: Observable<AccountUtxoMap>;
    cardanoAccountUnspendableUtxos$: Observable<AccountUtxoMap>;
    cardanoAddresses$: Observable<AnyAddress[]>;
    cardanoChainId$: Observable<Cardano.ChainId | undefined>;
    cardanoRewardAccountDetails$: Observable<AccountRewardAccountDetailsMap>;
  };
};

export type RequiredProtocolParameters = Pick<
  Cardano.ProtocolParameters,
  // NOTE: when this changes, create a redux store migration that deletes old parameters
  | 'coinsPerUtxoByte'
  | 'collateralPercentage'
  | 'desiredNumberOfPools'
  | 'dRepDeposit'
  | 'maxCollateralInputs'
  | 'maxTxSize'
  | 'maxValueSize'
  | 'minFeeCoefficient'
  | 'minFeeConstant'
  | 'minFeeRefScriptCostPerByte'
  | 'monetaryExpansion'
  | 'poolDeposit'
  | 'poolInfluence'
  | 'prices'
  | 'stakeKeyDeposit'
>;

export type AccountUtxoMap = Record<AccountId, Cardano.Utxo[]>;

export type AccountUnspendableUtxoMap = Record<AccountId, Cardano.Utxo[]>;

export type CardanoBlockchainSpecificTxData = {
  memo: string;
};

export type BuildDelegationTxParams = {
  accountId: AccountId;
  poolId: Cardano.PoolId;
};

export type BuildDelegationTxResult =
  | {
      success: false;
      error: Error;
    }
  | {
      success: true;
      serializedTx: string;
      fees: FeeEntry[];
      deposit: string;
    };

export type BuildDelegationTx = (
  params: BuildDelegationTxParams,
) => Observable<BuildDelegationTxResult>;

export type MakeBuildDelegationTx<TDependencies = unknown> = (
  dependencies: TDependencies,
) => BuildDelegationTx;

export type BuildDeregistrationTxParams = {
  accountId: AccountId;
};

export type BuildDeregistrationTxResult =
  | {
      success: false;
      error: Error;
    }
  | {
      success: true;
      serializedTx: string;
      fees: FeeEntry[];
      /** Deposit return in lovelace as string (positive value) */
      depositReturn: string;
    };

export type BuildDeregistrationTx = (
  params: BuildDeregistrationTxParams,
) => Observable<BuildDeregistrationTxResult>;

export type MakeBuildDeregistrationTx<TDependencies = unknown> = (
  dependencies: TDependencies,
) => BuildDeregistrationTx;

// In-memory signing types (ADR 19 compliant)
export type SigningError = { code: 'SIGNING_FAILED'; message: string };

export interface SignInMemoryTransactionProps {
  tx: Serialization.Transaction;
  authSecret: Uint8Array;
  accountIndex: number;
  chainId: Cardano.ChainId;
  extendedAccountPublicKey: Bip32PublicKeyHex;
  encryptedRootPrivateKey: HexBytes;
  knownAddresses: GroupedAddress[];
  utxo: Cardano.Utxo[];
}

export interface CardanoInMemorySigningDependencies {
  cardanoInMemorySigning: {
    /**
     * Signs an in-memory Cardano transaction using the provided auth secret.
     * @returns Observable that emits the signed transaction once and completes
     */
    signTransaction: (
      props: SignInMemoryTransactionProps,
    ) => Observable<Result<Serialization.Transaction, SigningError>>;
  };
}
