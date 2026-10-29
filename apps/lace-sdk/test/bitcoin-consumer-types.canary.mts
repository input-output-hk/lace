import {
  AccountId,
  BITCOIN_FEATURE_FLAG,
  BitcoinTxBuildError,
  BitcoinTxBuildErrorCode,
  BITCOIN_MEMPOOL_FEE_MARKET_FEATURE_FLAG,
  BitcoinNetwork,
  BitcoinNetworkId,
  buildBitcoinTx,
  createBitcoinLazyInMemoryVaultModule,
  createInMemoryWalletEntity,
  createLaceWallet,
  FEATURE_FLAG_NETWORK_TYPE,
  LazyWalletMismatchError,
  m,
  Milliseconds,
  signBitcoinTx,
  submitBitcoinTx,
  waitForBitcoinAccountSync,
  WalletId,
  WalletType,
  type AppConfig,
  type BitcoinFeeMarketProviderConfig,
  type BitcoinFeeRate,
  type BitcoinProviderConfig,
  type BitcoinSignResult,
  type BuildBitcoinTxProps,
  type CreateBitcoinLazyInMemoryVaultModuleProps,
  type CreateInMemoryWalletEntityProps,
  type MaestroConfig,
  type Result,
  type UnsignedBitcoinTx,
  type WithMnemonicWords,
} from '@laceio/sdk/bitcoin';
import * as cardanoEntry from '@laceio/sdk/cardano';
import {
  BITCOIN_FEATURE_FLAG as ROOT_BITCOIN_FEATURE_FLAG,
  BitcoinNetwork as RootBitcoinNetwork,
  BitcoinTxBuildError as RootBitcoinTxBuildError,
  BitcoinTxBuildErrorCode as RootBitcoinTxBuildErrorCode,
  buildBitcoinTx as rootBuildBitcoinTx,
  createBitcoinLazyInMemoryVaultModule as rootCreateBitcoinLazyInMemoryVaultModule,
  m as rootModules,
  signBitcoinTx as rootSignBitcoinTx,
  submitBitcoinTx as rootSubmitBitcoinTx,
  type MaestroConfig as RootMaestroConfig,
} from '@laceio/sdk';

// A consumer that lacks a package the declarations import reads its types as
// `any`, which accepts every value, so each directive below goes unused.
// @ts-expect-error A number is not a Bitcoin network.
0 satisfies BitcoinNetwork;
// @ts-expect-error A number is not a Bitcoin network id.
0 satisfies ReturnType<typeof BitcoinNetworkId>;
// @ts-expect-error A number is not a Maestro configuration.
0 satisfies MaestroConfig;
// @ts-expect-error A number is not a Bitcoin provider configuration.
0 satisfies AppConfig['bitcoinProvider'];

// The Cardano entry carries no Bitcoin exports.
// @ts-expect-error Bitcoin modules are not on the Cardano entry.
void cardanoEntry.m.blockchainBitcoin;
// @ts-expect-error The Bitcoin feature flag is not on the Cardano entry.
void cardanoEntry.BITCOIN_FEATURE_FLAG;
// @ts-expect-error The Bitcoin lazy vault is not on the Cardano entry.
void cardanoEntry.createBitcoinLazyInMemoryVaultModule;
// @ts-expect-error The Bitcoin build error is not on the Cardano entry.
void cardanoEntry.BitcoinTxBuildError;
// @ts-expect-error The Bitcoin transaction helpers are not on the Cardano entry.
void cardanoEntry.buildBitcoinTx;
// @ts-expect-error A custom fee rate needs its rate.
({ feeOption: 'Custom' }) satisfies BitcoinFeeRate;
// @ts-expect-error A custom fee rate is in satoshis per virtual byte.
({ feeOption: 'Custom', customFeeRate: 0.00001 }) satisfies BitcoinFeeRate;
// @ts-expect-error The recovery words source is a function.
0 satisfies CreateBitcoinLazyInMemoryVaultModuleProps['withMnemonicWords'];

const maestro: MaestroConfig = {
  clientConfig: {
    baseUrl: 'https://xbt-testnet.gomaestro-api.org',
    apiVersion: 'v0',
    projectId: 'consumer',
  },
  rateLimiterConfig: {
    size: 500,
    increaseAmount: 10,
    increaseInterval: Milliseconds(1000),
  },
};
const rootMaestro: RootMaestroConfig = maestro;
const bitcoinProvider: BitcoinProviderConfig = {
  tipPollFrequency: Milliseconds(60_000),
  historyDepth: 20,
  maestroConfig: { [BitcoinNetwork.Testnet]: rootMaestro },
};
const bitcoinFeeMarketProvider: BitcoinFeeMarketProviderConfig = {
  mempoolSpaceConfig: {
    [RootBitcoinNetwork.Testnet]: { url: 'https://mempool.space/testnet4' },
  },
};
const featureFlags = [
  { key: BITCOIN_FEATURE_FLAG },
  { key: BITCOIN_MEMPOOL_FEE_MARKET_FEATURE_FLAG },
  { key: FEATURE_FLAG_NETWORK_TYPE, payload: 'testnet' },
];
const config: Partial<AppConfig> = {
  bitcoinProvider,
  bitcoinFeeMarketProvider,
  defaultFeatureFlags: featureFlags,
  extraFeatureFlags: [],
};

const withMnemonicWords: WithMnemonicWords = async use =>
  use(['abandon', 'about']);
const lazyVault = createBitcoinLazyInMemoryVaultModule({ withMnemonicWords });
const rootLazyVault = rootCreateBitcoinLazyInMemoryVaultModule({
  withMnemonicWords,
});

const wallet = await createLaceWallet({
  modules: [
    m.featureDev,
    m.storageInMemory,
    m.blockchainBitcoin,
    m.bitcoinProviderMaestro,
    m.bitcoinMempoolFeeMarket,
    lazyVault,
  ] as const,
  environment: 'development',
  featureFlags,
  config,
});
const props: CreateInMemoryWalletEntityProps = {
  mnemonicWords: [],
  walletName: 'Bitcoin',
};
const lazy = await createInMemoryWalletEntity(wallet, props);
const isLazy: boolean = lazy.type === WalletType.LazyInMemory;
const withPassword = await createInMemoryWalletEntity(wallet, {
  ...props,
  password: new Uint8Array(),
});
wallet.dispatch('wallets.addWallet', withPassword);
const accountIds: string[] = withPassword.accounts.map(
  account => account.accountId,
);
const networkId: string = BitcoinNetworkId(BitcoinNetwork.Mainnet);
const sameFlag: boolean = ROOT_BITCOIN_FEATURE_FLAG === BITCOIN_FEATURE_FLAG;
const mismatch: Error = new LazyWalletMismatchError();

const accountId = withPassword.accounts[0].accountId;
await waitForBitcoinAccountSync(wallet, {
  accountId,
  timeout: Milliseconds(30_000),
});
const payment: BuildBitcoinTxProps = {
  accountId,
  recipients: [
    { address: 'tb1qd7spv5q28348xl4myc8zmh983w5jx32cjhkn97', amount: 1000 },
  ],
  feeRate: { feeOption: 'Custom', satsPerVByte: 1 },
  memo: 'consumer',
};
const built: Result<UnsignedBitcoinTx, Error> = await buildBitcoinTx(
  wallet,
  payment,
);
const buildCode: BitcoinTxBuildErrorCode | undefined =
  built.isErr() && built.error instanceof BitcoinTxBuildError
    ? built.error.code
    : undefined;
const sameBuildError: boolean =
  RootBitcoinTxBuildError === BitcoinTxBuildError &&
  RootBitcoinTxBuildErrorCode.InsufficientFunds ===
    BitcoinTxBuildErrorCode.InsufficientFunds;
const fee: bigint | undefined = built.isOk() ? built.value.fee : undefined;
const signed = built.isOk()
  ? await signBitcoinTx(wallet, {
      serializedTx: built.value.serializedTx,
      password: new Uint8Array(),
      accountId,
    })
  : undefined;
const signResult: BitcoinSignResult | undefined = signed?.isOk()
  ? signed.value
  : undefined;
const submitted = signResult
  ? await submitBitcoinTx(wallet, {
      serializedTx: signResult.serializedTx,
      accountId,
    })
  : undefined;
const txId: string | undefined = submitted?.isOk()
  ? submitted.value.txId
  : undefined;
const rootBuilt = await rootBuildBitcoinTx(wallet, {
  recipients: [],
  feeRate: { feeOption: 'Fast' },
});
void [
  isLazy,
  accountIds,
  networkId,
  sameFlag,
  mismatch,
  rootLazyVault,
  buildCode,
  sameBuildError,
  fee,
  txId,
  rootBuilt,
  rootSignBitcoinTx,
  rootSubmitBitcoinTx,
  AccountId,
  WalletId,
  rootModules.blockchainBitcoin,
  rootModules.bitcoinProviderMaestro,
  rootModules.bitcoinMempoolFeeMarket,
];
