import * as midnight from '@laceio/sdk/midnight';
import {
  buildMidnightTransfer,
  discardMidnightTx,
  type DiscardMidnightTxProps,
  observeMidnightBalances,
  submitMidnightTx,
  MidnightAccountNotFoundError,
  MidnightNetworkNotConfiguredError,
  MidnightNothingToRegisterError,
  MidnightWalletNotReadyError,
  isForbiddenTokenName,
  isTakenTokenName,
  Ok,
  Err,
  type MidnightAccountSelection,
  type MidnightBalances,
  type MidnightErrorCode,
  type BuildMidnightTransferProps,
  type SignMidnightTxProps,
  type ProveMidnightTxProps,
  type SubmitMidnightTxProps,
  type MidnightFinalizedTx,
  balanceMidnightSealedTransaction,
  balanceMidnightUnsealedTransaction,
  makeMidnightTransfer,
  makeMidnightIntent,
  type DesiredInput,
  type DesiredOutput,
  type MidnightBalanceProps,
  type MidnightMakeTransferProps,
  type MidnightMakeIntentProps,
  buildMidnightTransfers,
  estimateMidnightFee,
  registerMidnightDust,
  type MidnightTransferBatch,
  type MidnightFeeRequest,
  type WalletWithMidnight,
  createInMemoryWalletEntity,
  createLaceWallet,
  createMidnightModule,
  createMidnightAccounts,
  createTemenosAttestedProver,
  getMidnightProvingProvider,
  type GetMidnightProvingProviderProps,
  proveMidnightTx,
  type AttestationProgressEvent,
  type CreateAttestedProver,
  type KeyMaterialProvider,
  type ProvingProvider,
  type TemenosTrustRoots,
  type TemenosVerifier,
  type MidnightTxRecipe,
  createMidnightPasskeyWalletEntity,
  createPasskeyKeySource,
  FEATURE_FLAG_MIDNIGHT,
  FEATURE_FLAG_MIDNIGHT_UNSHIELDED,
  FEATURE_FLAG_NETWORK_TYPE,
  m,
  MIDNIGHT_LOCAL_PROOF_SERVER_URL,
  MidnightSDKNetworkIds,
  MidnightAccountId,
  MidnightNetworkId,
  isTokenFullNameValid,
  isTokenShortNameValid,
  selectMidnightNetwork,
  signMidnightTx,
  signMidnightData,
  type SignMidnightDataProps,
  type SignDataOptions,
  type Signature,
  type Result,
  type AppConfig,
  type CreateMidnightModuleProps,
  type MidnightAccountProps,
  type MidnightNetworkConfig,
  type MidnightSDKNetworkId,
  type BlockchainNetworkId,
} from '@laceio/sdk/midnight';

const password = new TextEncoder().encode('consumer');
const moduleProps: CreateMidnightModuleProps = {
  password,
  proofServerUrl: MIDNIGHT_LOCAL_PROOF_SERVER_URL,
  networks: {
    [MidnightSDKNetworkIds.PreProd]: { nodeAddress: 'https://node' },
  },
  batchUpdates: { size: 12, spacing: 4 },
};
const featureFlags = [
  { key: FEATURE_FLAG_MIDNIGHT },
  { key: FEATURE_FLAG_MIDNIGHT_UNSHIELDED },
  { key: FEATURE_FLAG_NETWORK_TYPE, payload: 'testnet' },
];
const config: Partial<AppConfig> = {
  defaultFeatureFlags: featureFlags,
  extraFeatureFlags: [],
  defaultMidnightTestnetNetworkId: MidnightSDKNetworkIds.Preview,
};

export const run = async () => {
  const wallet = await createLaceWallet({
    modules: [
      m.featureDev,
      m.storageInMemory,
      createMidnightModule(moduleProps),
    ] as const,
    environment: 'development',
    featureFlags,
    config,
  });
  const entity = await createInMemoryWalletEntity(wallet, {
    mnemonicWords: ['abandon'],
    password,
    walletName: 'consumer',
  });
  const targetNetworks = new Set<BlockchainNetworkId>([
    MidnightNetworkId(MidnightSDKNetworkIds.Preview),
  ]);
  const updated = await createMidnightAccounts(wallet, {
    wallet: entity,
    password,
    accountIndex: 7,
    targetNetworks,
  });
  wallet.dispatch('wallets.addWallet', updated);
  wallet.dispatch('wallets.updateWallet', {
    id: updated.walletId,
    changes: {
      accounts: updated.accounts,
      blockchainSpecific: updated.blockchainSpecific,
    },
  });
  void createMidnightAccounts(wallet, {
    wallet: entity,
    password,
    // @ts-expect-error An index is numeric, not a derivation-path string.
    accountIndex: '7',
  });
  const account = entity.accounts.find(
    candidate => candidate.blockchainName === 'Midnight',
  );
  const networkId: MidnightSDKNetworkId | undefined = (
    account?.blockchainSpecific as MidnightAccountProps | undefined
  )?.networkId;
  // Types from the external Midnight packages must resolve, not collapse to `any`.
  const preview: 'preview' = MidnightSDKNetworkIds.Preview;
  const midnightAccountId = updated.accounts.find(
    a => a.blockchainName === 'Midnight',
  )!.accountId;
  // AccountId is the common account identity for the state/action APIs.
  wallet.dispatch('midnightContext.resetSyncState', {
    accountId: midnightAccountId,
  });
  wallet.stateObservables.addresses.selectByAccountId$.subscribe(select => {
    select(midnightAccountId);
    // @ts-expect-error Parameterized selectors emit a function taking one account ID.
    select([midnightAccountId]);
  });
  wallet.dispatch('midnightContext.resetSyncState', {
    // @ts-expect-error Reset takes a branded account ID, not an account index.
    accountId: 7,
  });
  wallet.stateObservables.tokens.selectAggregatedTokensByAccountId$.subscribe(
    select => select(midnightAccountId),
  );
  wallet.stateObservables.midnightContext.selectDustBalanceByAccount$.subscribe();
  wallet.stateObservables.midnightContext.selectDustAvailableByAccount$.subscribe();
  const indexedId = MidnightAccountId(
    updated.walletId,
    7,
    MidnightSDKNetworkIds.Preview,
  );
  wallet.stateObservables.midnightContext.selectDustGenerationDetails$.subscribe(
    select => {
      const details = select([indexedId]);
      const value: bigint | undefined = details[indexedId]?.currentValue;
      const rate: bigint | undefined = details[indexedId]?.rate;
      const maxCap: bigint | undefined = details[indexedId]?.maxCap;
      const decayTime: number | undefined = details[indexedId]?.decayTime;
      const maxCapReachedAt: number | undefined =
        details[indexedId]?.maxCapReachedAt;
      void [value, rate, maxCap, decayTime, maxCapReachedAt];
    },
  );
  wallet.stateObservables.midnightContext.selectPublicKeysByAccountId$.subscribe(
    select => {
      const keys = select(indexedId);
      const coin: string | undefined = keys?.coin;
      const encryption: string | undefined = keys?.encryption;
      void [coin, encryption];
    },
  );
  wallet.stateObservables.sync.selectSyncStatusByAccount$.subscribe();
  wallet.stateObservables.activities.selectByAccountId$.subscribe(select => {
    const rows = select({ accountId: midnightAccountId });
    if (rows[0])
      wallet.dispatch('activities.loadActivityDetails', {
        blockchainName: 'Midnight',
        activity: rows[0],
      });
  });
  wallet.stateObservables.activities.selectActivityDetails$.subscribe();
  wallet.stateObservables.tokens.selectTokensMetadata$.subscribe(
    metadataById => {
      const metadata = Object.values(metadataById).find(Boolean);
      const name = 'Aurora'.trim();
      const ticker = 'AUR'.trim();
      if (
        metadata &&
        isTokenFullNameValid(name) &&
        isTokenShortNameValid(ticker) &&
        !isForbiddenTokenName(name) &&
        !isTakenTokenName(name, [])
      ) {
        wallet.dispatch('tokens.upsertTokenMetadata', {
          ...metadata,
          name,
          ticker,
        });
      }
    },
  );
  selectMidnightNetwork(wallet, networkId ?? preview);
  const network: {
    networkId: MidnightSDKNetworkId;
    config: MidnightNetworkConfig;
  } = await new Promise(resolve => {
    wallet.stateObservables.midnightContext.selectCurrentNetwork$.subscribe(
      resolve,
    );
  });
  const passkeyEntity = await createMidnightPasskeyWalletEntity(wallet, {
    keySource: createPasskeyKeySource({ rpId: 'localhost' }),
    password,
    walletName: 'consumer',
    accounts: [{ accountIndex: 1, accountName: 'Second' }],
  });
  wallet.dispatch('wallets.addWallet', passkeyEntity);
  return network.config.proofServer.kind;
};

export const isolatedInstances = async () => {
  const modules = [
    m.featureDev,
    m.storageInMemory,
    createMidnightModule(moduleProps),
  ] as const;
  const first = await createLaceWallet({
    modules,
    environment: 'development',
    featureFlags,
    config,
  });
  const second = await createLaceWallet({
    modules,
    environment: 'development',
    featureFlags,
    config,
  });
  type Recipe = Parameters<typeof signMidnightTx>[1]['recipe'];
  return (recipe: Recipe) =>
    Promise.all([
      signMidnightTx(first, { recipe, startTimeout: 1 }),
      signMidnightTx(second, { recipe, startTimeout: 1 }),
    ]);
};

export const prepareTransfers = async (
  wallet: WalletWithMidnight,
  to: string,
  dustAddress: string,
) => {
  const transfer: MidnightTransferBatch = {
    kind: 'unshielded',
    outputs: [
      { to, tokenId: `unshielded-preview${'0'.repeat(64)}`, amount: 1n },
    ],
  };
  const request: MidnightFeeRequest = { kind: 'transfer', transfer };
  const fee = await estimateMidnightFee(wallet, request);
  const recipe = await buildMidnightTransfers(wallet, transfer);
  const registrationFee = await estimateMidnightFee(wallet, {
    kind: 'dust-registration',
    registration: { dustAddress },
  });
  // Invoke only after consumer confirmation: registration signs internally.
  const registerAfterConsent = () =>
    registerMidnightDust(wallet, { dustAddress });
  // @ts-expect-error A transfer batch must contain at least one output.
  const empty: MidnightTransferBatch = { kind: 'shielded', outputs: [] };
  const dust: MidnightTransferBatch = {
    // @ts-expect-error DUST is not a transferable batch kind.
    kind: 'dust',
    outputs: transfer.outputs,
  };
  return { fee, recipe, registrationFee, registerAfterConsent, empty, dust };
};

export const attestedProving = async (
  wallet: WalletWithMidnight,
  recipe: MidnightTxRecipe,
  keyMaterialProvider: KeyMaterialProvider,
  trustRoots: TemenosTrustRoots,
  verifier: TemenosVerifier,
) => {
  const createAttestedProver: CreateAttestedProver = props =>
    createTemenosAttestedProver({ ...props, trustRoots, verifier });
  const getLedgerIndexerUrl = async () =>
    'https://indexer.preprod.midnight.network/api/v4/graphql';
  createTemenosAttestedProver(
    {
      networkId: 'preview',
      proofServerApiUrl: 'https://api.proofserver.preview.wastedp.io',
      trustRoots,
      getLedgerIndexerUrl,
      verifier,
    },
    // @ts-expect-error The public adapter takes no deployment override (the
    // former second parameter accepted an undefined config).
    { config: undefined },
  );
  // @ts-expect-error Temenos integration requires an explicit host verifier.
  createTemenosAttestedProver({
    networkId: 'preview',
    proofServerApiUrl: 'https://api.proofserver.preview.wastedp.io',
    trustRoots,
    getLedgerIndexerUrl,
  });
  // @ts-expect-error Trust roots are a readonly host input.
  trustRoots.amdRootCertificates.push('unreviewed-root');
  createMidnightModule({
    password,
    createAttestedProver,
    networks: {
      preview: {
        proofServer: {
          kind: 'tee-delegated',
          url: 'https://api.proofserver.preview.wastedp.io',
          label: 'Temenos',
        },
      },
    },
  });
  await proveMidnightTx(wallet, {
    recipe,
    onProgress: (event: AttestationProgressEvent) => {
      if (event.type === 'phase') {
        const status: 'started' | 'completed' | 'failed' = event.status;
        return status;
      }
    },
  });
  const providerProps: GetMidnightProvingProviderProps = {
    keyMaterialProvider,
    proveTimeout: 60_000,
  };
  const result = await getMidnightProvingProvider(wallet, providerProps);
  if (result.isOk()) {
    const provider: ProvingProvider = result.value;
    const checked: (bigint | undefined)[] = await provider.check(
      new Uint8Array(),
      'circuit',
    );
    const proved: Uint8Array = await provider.prove(
      new Uint8Array(),
      'circuit',
      1n,
    );
    // @ts-expect-error The provider exposes no endpoint.
    provider.proverServerUri;
    // @ts-expect-error Binding inputs are field elements, not strings.
    provider.prove(new Uint8Array(), 'circuit', '1');
    return { checked, proved };
  }
  // @ts-expect-error A circuit key-material provider is required.
  await getMidnightProvingProvider(wallet, {});
};

export const consentedMessageSigning = async (wallet: WalletWithMidnight) => {
  const options: SignDataOptions = { encoding: 'text', keyType: 'unshielded' };
  const props: SignMidnightDataProps = { data: 'Approved message', options };
  const result: Result<Signature, Error> = await signMidnightData(
    wallet,
    props,
  );
  // @ts-expect-error Only the unshielded key can sign connector messages.
  const invalidKey: SignDataOptions = { encoding: 'text', keyType: 'shielded' };
  const invalidEncoding: SignDataOptions = {
    // @ts-expect-error Encodings match the connector contract.
    encoding: 'utf8',
    keyType: 'unshielded',
  };
  void invalidKey;
  void invalidEncoding;
  if (result.isOk()) {
    const signature: string = result.value.signature;
    const verifyingKey: string = result.value.verifyingKey;
    const originalData: string = result.value.data;
    return { signature, verifyingKey, originalData };
  }
  const error: Error = result.error;
  return error;
};

export const stagedNightAfterConsent = async (
  wallet: WalletWithMidnight,
  account: MidnightAccountSelection,
  to: string,
) => {
  const props: BuildMidnightTransferProps = { ...account, to, amount: 1n };
  const recipe = (await buildMidnightTransfer(wallet, props)).unwrap();
  const signing: SignMidnightTxProps = { ...account, recipe };
  const signed = (await signMidnightTx(wallet, signing)).unwrap();
  const proving: ProveMidnightTxProps = { ...account, recipe: signed };
  const transaction: MidnightFinalizedTx = (
    await proveMidnightTx(wallet, proving)
  ).unwrap();
  const submission: SubmitMidnightTxProps = { ...account, transaction };
  // Obtain separate authorization before invoking the returned submission.
  return () => submitMidnightTx(wallet, submission);
};

export const declinedNightReleasesItsInputs = async (
  wallet: WalletWithMidnight,
  account: MidnightAccountSelection,
  to: string,
) => {
  const recipe = (
    await buildMidnightTransfer(wallet, { ...account, to, amount: 1n })
  ).unwrap();
  const discard: DiscardMidnightTxProps = { ...account, recipe };
  const released: Result<void, Error> = await discardMidnightTx(
    wallet,
    discard,
  );
  return released;
};

export const balanceAndErrorContracts = (
  wallet: WalletWithMidnight,
  account: MidnightAccountSelection,
) => {
  const subscription = observeMidnightBalances(wallet, account).subscribe(
    (balances: MidnightBalances) => {
      const available: bigint = balances.dust.available;
      const generated: bigint = balances.dust.balance;
      const synced: boolean = balances.synced.dust;
      // @ts-expect-error DUST values retain bigint precision.
      const numeric: number = balances.dust.available;
      void [available, generated, synced, numeric];
    },
  );
  subscription.unsubscribe();
  const errors: Error[] = [
    new MidnightAccountNotFoundError('No active account'),
    new MidnightNetworkNotConfiguredError(MidnightSDKNetworkIds.DevNet),
    ...(account.accountId
      ? [
          new MidnightNothingToRegisterError(account.accountId),
          new MidnightWalletNotReadyError(account.accountId, 1),
        ]
      : []),
  ];
  const missing = new MidnightAccountNotFoundError('Missing');
  const code: MidnightErrorCode = missing.code;
  // @ts-expect-error Error codes are a closed SDK vocabulary.
  const unsupportedCode: MidnightErrorCode = 'confirmed';
  const success: Result<bigint, Error> = Ok(1n);
  const failure: Result<bigint, Error> = Err(missing);
  void [errors, code, unsupportedCode, success, failure];
};

export const publicBoundary = () => {
  const browserModules = [m.featureDev, m.storageWebIndexeddb];
  // @ts-expect-error Engine lookup is private to the instance-bound adapters.
  midnight.midnightWalletFor;
  // @ts-expect-error The baseline connector does not implement transaction history.
  midnight.getTxHistory;
  // @ts-expect-error DUST deregistration is outside the exposed baseline.
  midnight.deregisterMidnightDust;
  return browserModules;
};

// The caller invokes this only after consent to signing, proving and submission.
export const connectorAfterConsent = async (
  wallet: WalletWithMidnight,
  tx: string,
  recipient: string,
) => {
  const output: DesiredOutput = {
    kind: 'unshielded',
    type: '0'.repeat(64),
    value: 1n,
    recipient,
  };
  const input: DesiredInput = {
    kind: 'shielded',
    type: 'a'.repeat(64),
    value: 2n,
  };
  const balance: MidnightBalanceProps = {
    tx,
    options: { payFees: false },
    proveTimeout: 60_000,
  };
  const transfer: MidnightMakeTransferProps = {
    desiredOutputs: [output],
    proveTimeout: 60_000,
  };
  const intent: MidnightMakeIntentProps = {
    desiredInputs: [input],
    desiredOutputs: [output],
    options: { intentId: 'random', payFees: true },
    proveTimeout: 60_000,
  };
  const sealed = await balanceMidnightSealedTransaction(wallet, balance);
  const unsealed = await balanceMidnightUnsealedTransaction(wallet, balance);
  const transferred = await makeMidnightTransfer(wallet, transfer);
  const swapped = await makeMidnightIntent(wallet, intent);
  // @ts-expect-error Connector inputs do not accept DUST.
  const dust: DesiredInput = { kind: 'dust', type: '', value: 1n };
  return {
    sealed,
    unsealed,
    transferred,
    dust,
    submitted: await submitMidnightTx(wallet, {
      transaction: swapped.unwrap(),
    }),
  };
};
