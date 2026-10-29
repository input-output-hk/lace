// An app uses the experimental features from the experimental entry alone:
// it carries the Cardano entry, so the wallet the features run on is typed by
// the same declarations as the features themselves.
import {
  buildCardanoCustodyGrantSpend,
  Cardano,
  CARDANO_CUSTODY_ACCOUNT_VALIDATOR_HASH,
  CARDANO_CUSTODY_ACCOUNT_VALIDATOR_HASHES,
  CARDANO_CUSTODY_DEFAULT_GRANT_FEE_BOUND,
  CARDANO_CUSTODY_LOGIC_HASH,
  CARDANO_CUSTODY_LOGIC_HASHES,
  CARDANO_CUSTODY_LOVELACE_ASSET,
  CardanoCustodyAgentPolicyInvalidError,
  CardanoCustodyAgentWitnessError,
  CardanoCustodyAlreadyRegisteredError,
  CardanoCustodyDataSignatureError,
  CardanoCustodyFundContentionError,
  CardanoCustodyLogicNotRegisteredError,
  CardanoCustodyLogicNotServedError,
  CardanoCustodyLogicRewardBalanceError,
  CardanoCustodyNetworkNotReadyError,
  CardanoCustodyOperationInProgressError,
  CardanoCustodyOutcomeUnknownError,
  CardanoCustodyRequestRefusedError,
  CardanoCustodyRewardBalanceChangedError,
  CardanoCustodyScriptDataHashError,
  CardanoCustodySponsorError,
  CardanoCustodyStaleGrantError,
  CardanoCustodyUnsupportedSignerError,
  createCardanoCustodyAccount,
  createCardanoCustodyAccountEntity,
  createCardanoCustodySponsorClient,
  createLaceWallet,
  createLocalCardanoCustodyDeviceSigner,
  createPasskeyKeySource,
  createRemoteCardanoCustodyDeviceSigner,
  createRemotePasskeySigner,
  createRemotePassportSeams,
  deriveCardanoCustodyDevice,
  deriveSymmetricSecret,
  executeCardanoCustodyOperation,
  exportCardanoCustodyAccountRecord,
  exportCardanoCustodyAgentPolicy,
  exportCardanoCustodyEnrollment,
  exportPassportAgentPolicy,
  HexBlob,
  isCardanoCustodyAccountAddress,
  m,
  MAX_GRANTS,
  Milliseconds,
  observeCardanoCustodyAccountState,
  observeCardanoCustodyGrantStatuses,
  openCardanoCustodyAccount,
  parseCardanoCustodyAccountRecord,
  parseCardanoCustodyAgentPolicy,
  parseCardanoCustodyEnrollment,
  readCardanoCustodyControlDevices,
  readCardanoCustodyUnsettledOperations,
  recoverCardanoCustodyAccounts,
  requestCardanoCustodyDeviceKey,
  Serialization,
  signCardanoCustodyData,
  submitCardanoCustodyGrantSpend,
  TokenColor,
  validateGrantScope,
  verifyCardanoCustodyDataSignature,
  waitForCardanoCustodyOperation,
  type CardanoCustodyAccountCreation,
  type CardanoCustodyAccountRecord,
  type CardanoCustodyAccountState,
  type CardanoCustodyAgentPolicy,
  type CardanoCustodyAgentPolicyGrant,
  type CardanoCustodyAgentWitness,
  type CardanoCustodyControlDevices,
  type CardanoCustodyDataPurpose,
  type CardanoCustodyDataSignature,
  type CardanoCustodyDataSignatureRefusal,
  type CardanoCustodyDataSignatureVerification,
  type CardanoCustodyDevice,
  type CardanoCustodyDeviceKey,
  type CardanoCustodyDeviceSigner,
  type CardanoCustodyDeviceSignDataRequest,
  type CardanoCustodyEnrollment,
  type CardanoCustodyGrantWithStatus,
  type CardanoCustodyObservedAccountState,
  type CardanoCustodyOperation,
  type CardanoCustodyParsedAgentPolicy,
  type CardanoCustodyRefusalCode,
  type CardanoCustodySignedData,
  type CardanoCustodySponsor,
  type CardanoCustodySponsorCollateral,
  type CardanoCustodySponsorLease,
  type CardanoCustodySubmission,
  type CreateCardanoCustodySponsorClientProps,
  type GrantId,
  type PassportFlow,
  type ReadCardanoCustodyControlDevicesProps,
  type Result,
} from '@laceio/sdk/experimental';

// Midnight Passport accounts: the Passport module loads into the wallet, whose
// state then carries the Passport slice.
declare const passportProps: Parameters<
  typeof m.createPassportAccountModule
>[0];
declare const hostedPassportSigner: Parameters<
  typeof createRemotePassportSeams
>[0];
const passportWallet = await createLaceWallet({
  modules: [
    m.featureDev,
    m.storageInMemory,
    m.createPassportAccountModule({
      ...passportProps,
      ...createRemotePassportSeams(hostedPassportSigner),
    }),
  ] as const,
  environment: 'development',
  config: { defaultFeatureFlags: [], extraFeatureFlags: [] },
});
const { passport } = passportWallet.stateObservables;
passport.selectFlow$.subscribe((flow: PassportFlow) => flow);
// @ts-expect-error The flow is not a number.
passport.selectFlow$.subscribe((flow: number) => flow);
// @ts-expect-error The Passport state has no such selector.
void passport.selectNoSuchState$;
passportWallet.dispatch('passport.createAccount', { lockAccount: true });
// @ts-expect-error The Passport slice has no such action.
passportWallet.dispatch('passport.noSuchAction');
// @ts-expect-error A number is not a grant id.
0 satisfies GrantId;
void [TokenColor, validateGrantScope, MAX_GRANTS + 1];
declare const grantId: GrantId;
void exportPassportAgentPolicy(passportWallet, { grantId });
const secret: Uint8Array = deriveSymmetricSecret(new Uint8Array(64), {
  domain: 'consumer',
  context: 'account-0',
});
void secret;

// Cardano custody accounts.

// A consumer that lacks a package the declarations import reads its types as
// `any`, which accepts every value, so each directive below goes unused. A
// type-level `0 extends 1 & T` test misses this `any`, because the `any` of
// an unresolved import satisfies `false` as well as `true`.
// @ts-expect-error A number is not a Result.
0 satisfies Result<number, Error>;
// @ts-expect-error A number is not a custody account creation result.
0 satisfies Awaited<ReturnType<typeof createCardanoCustodyAccount>>;
// @ts-expect-error A number is not an address.
0 satisfies Cardano.PaymentAddress;
// @ts-expect-error A number is not a UTxO.
0 satisfies Cardano.Utxo;
// @ts-expect-error A number is not a transaction.
0 satisfies Serialization.Transaction;
// @ts-expect-error A number is not a hex blob.
0 satisfies HexBlob;
// @ts-expect-error A number is not an address.
0 satisfies CardanoCustodyAccountRecord['address'];
// @ts-expect-error A number is not an extended account public key.
0 satisfies CardanoCustodyDeviceKey['extendedAccountPublicKey'];
// @ts-expect-error A number is not a key hash.
0 satisfies CardanoCustodyDevice['keyHash'];

const cardanoKeySource = createPasskeyKeySource({ rpId: 'localhost' });

const sponsorProps: CreateCardanoCustodySponsorClientProps = {
  baseUrl: 'https://sponsor.example',
  apiKey: 'client-key',
  fetch: globalThis.fetch,
};
const sponsor: CardanoCustodySponsor =
  createCardanoCustodySponsorClient(sponsorProps);
const leaseTerms = async (lease: CardanoCustodySponsorLease): Promise<bigint> =>
  lease.maxSponsoredLovelace + BigInt(lease.expiresAt);
const collateralWindow = async (
  collateral: CardanoCustodySponsorCollateral,
): Promise<number> => collateral.validitySeconds;
sponsor.lease().then(leaseTerms);
sponsor.collateral().then(collateralWindow);
sponsor.releaseLease('lease-id');
const describeSponsorFailure = (error: unknown): string | undefined =>
  error instanceof CardanoCustodySponsorError
    ? `${error.status} ${error.code} ${error.rule ?? ''} ${error.detail ?? ''}`
    : undefined;
describeSponsorFailure(new Error('unrelated'));

// Cardano custody accounts, as a consumer drives them end to end.
const custodyWallet = await createLaceWallet({
  modules: [
    m.featureDev,
    m.storageInMemory,
    m.blockchainCardano,
    m.blockchainCardanoCustody,
    m.cardanoProviderBlockfrost,
    m.cryptoCardanoSdk,
  ] as const,
  environment: 'development',
  config: {},
});
const walletWithoutCustody = await createLaceWallet({
  modules: [
    m.featureDev,
    m.storageInMemory,
    m.blockchainCardano,
    m.cardanoProviderBlockfrost,
    m.cryptoCardanoSdk,
  ] as const,
  environment: 'development',
  config: {},
});
observeCardanoCustodyAccountState(
  // @ts-expect-error A wallet created without m.blockchainCardanoCustody has no custody store.
  walletWithoutCustody,
  '' as Parameters<typeof observeCardanoCustodyAccountState>[1],
);
const consumerSponsor: CardanoCustodySponsor = {
  lease: async () => sponsor.lease(),
  signLeased: async (_leaseId, transaction) => HexBlob(transaction),
  releaseLease: async () => undefined,
  collateral: async () => sponsor.collateral(),
  signCollateral: async transaction => HexBlob(transaction),
};
const hostedSigner = createRemotePasskeySigner({
  signerUrl: 'https://signer.example',
});
const hostedDeviceKey: CardanoCustodyDeviceKey =
  await requestCardanoCustodyDeviceKey({
    mode: 'hosted',
    signer: hostedSigner,
    signerUrl: 'https://signer.example',
    chainId: Cardano.ChainIds.Preprod,
  });
const localDeviceKey = await requestCardanoCustodyDeviceKey({
  mode: 'local',
  keySource: cardanoKeySource,
  chainId: Cardano.ChainIds.Preprod,
});
const hostedDevice: CardanoCustodyDevice = await deriveCardanoCustodyDevice(
  hostedDeviceKey.extendedAccountPublicKey,
  1,
);
const enrollment: CardanoCustodyEnrollment = parseCardanoCustodyEnrollment(
  JSON.stringify(exportCardanoCustodyEnrollment(localDeviceKey)),
  { networkMagic: Cardano.NetworkMagics.Preprod },
);
const deviceSigner: CardanoCustodyDeviceSigner =
  createRemoteCardanoCustodyDeviceSigner(hostedSigner);
const localDeviceSigner: CardanoCustodyDeviceSigner =
  createLocalCardanoCustodyDeviceSigner({
    keySource: cardanoKeySource,
    origin: 'https://wallet.example',
  });
const creation: Result<CardanoCustodyAccountCreation, Error> =
  await createCardanoCustodyAccount(custodyWallet, {
    device: hostedDeviceKey,
    deviceSigner,
    sponsor: consumerSponsor,
    name: 'Treasury',
  });
if (creation.isOk()) {
  const { accountId, record } = creation.value;
  const exported: CardanoCustodyAccountRecord =
    await exportCardanoCustodyAccountRecord(custodyWallet, { accountId });
  const imported = parseCardanoCustodyAccountRecord(JSON.stringify(exported), {
    networkMagic: record.networkMagic,
  });
  const { entity } = await createCardanoCustodyAccountEntity(custodyWallet, {
    record: imported,
    name: 'Observed',
  });
  custodyWallet.dispatch('wallets.addWallet', entity);
  await openCardanoCustodyAccount(custodyWallet, {
    record,
    device: creation.value.device,
    name: 'Treasury',
  });
  if (creation.value.status === 'created') {
    await waitForCardanoCustodyOperation(custodyWallet, {
      accountId,
      txId: creation.value.txId,
      invalidHereafter: creation.value.invalidHereafter,
      timeout: Milliseconds(60_000),
    });
  }
  const operation: CardanoCustodyOperation = {
    type: 'add-device',
    keyHash: enrollment.deviceKeyHash,
  };
  const executed: Result<CardanoCustodySubmission, Error> =
    await executeCardanoCustodyOperation(custodyWallet, {
      accountId,
      operation,
      deviceSigner: localDeviceSigner,
      sponsor: consumerSponsor,
    });
  executed.isErr() &&
    executed.error instanceof CardanoCustodyOperationInProgressError;
  for (const unsettled of await readCardanoCustodyUnsettledOperations(
    custodyWallet,
    accountId,
  )) {
    const reference: string | undefined = unsettled.reference;
    const status: 'outcome-unknown' | 'pending' = unsettled.status;
    void [reference, status, unsettled.operation, unsettled.submittedAt];
    await waitForCardanoCustodyOperation(custodyWallet, {
      ...unsettled,
      timeout: Milliseconds(60_000),
    });
  }
  const issued: Result<CardanoCustodySubmission, Error> =
    await executeCardanoCustodyOperation(custodyWallet, {
      accountId,
      operation: {
        type: 'issue-grant',
        scope: {
          grantee: HexBlob('cc'.repeat(28)),
          asset: CARDANO_CUSTODY_LOVELACE_ASSET,
          perCallCap: 3_000_000n,
          cap: 6_000_000n,
          lovelacePerCallCap: 0n,
          lovelaceCap: 0n,
          expiresAt: 1_893_456_000_000n,
          recipients: [],
        },
      },
      deviceSigner,
      sponsor: consumerSponsor,
    });
  const issuedSlot: bigint | undefined = issued.isOk()
    ? issued.value.grantSlot
    : issued.error instanceof CardanoCustodyOutcomeUnknownError
    ? issued.error.grantSlot
    : undefined;
  const policy: CardanoCustodyAgentPolicy =
    await exportCardanoCustodyAgentPolicy(custodyWallet, {
      accountId,
      slot: issuedSlot ?? 0n,
    });
  const agentPolicy: CardanoCustodyParsedAgentPolicy =
    parseCardanoCustodyAgentPolicy(JSON.stringify(policy), {
      networkMagic: record.networkMagic,
    });
  const agentRecord: CardanoCustodyAccountRecord = agentPolicy.account;
  const agentGrant: CardanoCustodyAgentPolicyGrant = agentPolicy.grant;
  const recipients: Cardano.PaymentAddress[] = [...agentGrant.recipients];
  const token: Cardano.AssetId = agentGrant.token;
  void [
    agentRecord,
    recipients,
    token,
    agentGrant.generation,
    agentGrant.perCallCap + 1n,
  ];
  const spend = await buildCardanoCustodyGrantSpend(custodyWallet, {
    accountId,
    grantee: agentPolicy.grantee,
    outputs: [],
    sponsor: consumerSponsor,
    feeBound: CARDANO_CUSTODY_DEFAULT_GRANT_FEE_BOUND,
  });
  // @ts-expect-error A spend names its grantee; the slot alone is not enough.
  await buildCardanoCustodyGrantSpend(custodyWallet, {
    accountId,
    slot: agentGrant.slot,
    outputs: [],
    sponsor: consumerSponsor,
  });
  const sweep: CardanoCustodyOperation = {
    type: 'sweep-grants',
    slots: [agentGrant.slot],
  };
  void sweep;
  if (spend.isOk()) {
    const agentWitness: CardanoCustodyAgentWitness = {
      vkey: 'ab'.repeat(32),
      signature: spend.value.bodyHash,
    };
    const submitted = await submitCardanoCustodyGrantSpend(custodyWallet, {
      accountId,
      transaction: spend.value.transaction,
      agentWitness,
      sponsor: consumerSponsor,
    });
    if (submitted.isErr()) {
      const stale =
        submitted.error instanceof CardanoCustodyStaleGrantError
          ? submitted.error.slot
          : submitted.error instanceof CardanoCustodyFundContentionError
          ? submitted.error.inputs.length
          : submitted.error instanceof CardanoCustodyAgentWitnessError;
      void stale;
    }
  }
  const purpose: CardanoCustodyDataPurpose = 'sign-in';
  const proof: Result<CardanoCustodySignedData, Error> =
    await signCardanoCustodyData(custodyWallet, {
      accountId,
      payload: HexBlob('6e6f6e6365'),
      purpose,
      deviceSigner,
    });
  await signCardanoCustodyData(custodyWallet, {
    accountId,
    payload: HexBlob('6e6f6e6365'),
    purpose: 'link-account',
    deviceSigner: localDeviceSigner,
  });
  if (proof.isOk()) {
    const origin: string = proof.value.origin;
    const verified = await verifyCardanoCustodyDataSignature({
      signature: proof.value.signature,
      key: proof.value.key,
      payload: '6e6f6e6365',
      address: proof.value.address,
      origin,
      purpose,
      devices: [proof.value.keyHash],
    });
    const linkVerified = await verifyCardanoCustodyDataSignature({
      ...proof.value,
      payload: '6e6f6e6365',
      purpose: 'link-account',
      devices: [],
    });
    if (verified.isOk()) {
      const result: CardanoCustodyDataSignatureVerification = verified.value;
      void result.keyHash;
    } else {
      const refusal: CardanoCustodyDataSignatureRefusal = verified.error.reason;
      void refusal;
    }
    linkVerified.isErr() &&
      linkVerified.error instanceof CardanoCustodyDataSignatureError;
  } else {
    const refused = proof.error instanceof CardanoCustodyRequestRefusedError;
    const code: CardanoCustodyRefusalCode | undefined =
      proof.error instanceof CardanoCustodyRequestRefusedError
        ? proof.error.code
        : undefined;
    void [
      refused,
      code,
      proof.error instanceof CardanoCustodyDataSignatureError,
    ];
  }
  const hostedData: CardanoCustodyDataSignature =
    await createRemoteCardanoCustodyDeviceSigner(hostedSigner).signData(
      {} as CardanoCustodyDeviceSignDataRequest,
    );
  void [hostedData.signature, hostedData.origin];
  const controlProps: ReadCardanoCustodyControlDevicesProps = {
    accountRecord: JSON.stringify(record),
    chainId: Cardano.ChainIds.Preprod,
    controlUtxo: {} as Cardano.Utxo,
  };
  const control: Result<CardanoCustodyControlDevices, Error> =
    readCardanoCustodyControlDevices(controlProps);
  if (control.isOk()) {
    await verifyCardanoCustodyDataSignature({
      signature: hostedData.signature,
      key: hostedData.key,
      payload: '6e6f6e6365',
      address: control.value.address,
      origin: 'https://city.example',
      purpose: 'sign-in',
      devices: control.value.devices,
    });
  } else {
    void (control.error instanceof CardanoCustodyRequestRefusedError);
  }
  observeCardanoCustodyAccountState(custodyWallet, accountId).subscribe(
    (state: CardanoCustodyAccountState | undefined) => {
      if (state?.status === 'live') {
        const spendable: number =
          state.funds.length + state.reserves.own.length;
        const locked: bigint =
          state.controlMinimumLovelace + state.grantLockedLovelace;
        const ownerFeeReserve: bigint = state.controlHeadroomLovelace;
        const rewards: bigint = state.withdrawableRewards;
        void [
          spendable,
          locked,
          ownerFeeReserve,
          rewards,
          state.stranded.length,
          state.state.nextSlot,
          state.currentDeviceListed,
        ];
        const logic: string = state.state.logic;
        void CARDANO_CUSTODY_LOGIC_HASHES.includes(
          logic as (typeof CARDANO_CUSTODY_LOGIC_HASHES)[number],
        );
      } else if (
        state?.status === 'invalid' &&
        state.reason.code === 'unknown-logic'
      ) {
        const shown: number = state.funds.length;
        const logic: string = state.reason.logic;
        void [shown, logic, logic === CARDANO_CUSTODY_LOGIC_HASH];
      }
    },
  );
  observeCardanoCustodyAccountState(custodyWallet, accountId).subscribe(
    (state: CardanoCustodyObservedAccountState | undefined) => {
      // @ts-expect-error Only a live account names a deposit address.
      void state?.depositAddress;
      if (state?.status === 'live') {
        const deposit: Cardano.PaymentAddress | undefined =
          state.depositAddress;
        void deposit;
      }
    },
  );
  const isAccountAddress: boolean =
    isCardanoCustodyAccountAddress(record.address) &&
    CARDANO_CUSTODY_ACCOUNT_VALIDATOR_HASHES.includes(
      record.accountValidatorHash,
    ) &&
    CARDANO_CUSTODY_ACCOUNT_VALIDATOR_HASH === record.accountValidatorHash;
  void isAccountAddress;
  const acceptedLogics: readonly string[] = CARDANO_CUSTODY_LOGIC_HASHES;
  void acceptedLogics;
  observeCardanoCustodyGrantStatuses(custodyWallet, accountId).subscribe(
    (grants: CardanoCustodyGrantWithStatus[] | undefined) =>
      grants?.map(({ grant, status, utxo }) => [
        grant.slot,
        status === 'exhausted' || status === 'sweeping',
        utxo[0].txId,
      ]),
  );
}
const recovered = await recoverCardanoCustodyAccounts(custodyWallet, {
  device: localDeviceKey,
});
recovered.isOk() &&
  recovered.value.accounts.map(({ creatorIndex }) => creatorIndex) &&
  recovered.value.unscannedVersions.map(
    ({ accountValidatorHash }) => accountValidatorHash,
  );
const describeCustodyFailure = (error: unknown): string | undefined =>
  error instanceof CardanoCustodyUnsupportedSignerError
    ? error.signerCode
    : error instanceof CardanoCustodyNetworkNotReadyError
    ? `${error.missing} after ${error.timeoutMs} ms`
    : error instanceof CardanoCustodyAgentPolicyInvalidError
    ? error.field
    : error instanceof CardanoCustodyAlreadyRegisteredError
    ? `next index ${error.creatorIndex + 1}`
    : error instanceof CardanoCustodyLogicNotRegisteredError
    ? error.rewardAccount
    : error instanceof CardanoCustodyLogicRewardBalanceError
    ? `${error.logic} holds ${error.balance.toString()} lovelace`
    : error instanceof CardanoCustodyLogicNotServedError ||
      error instanceof CardanoCustodyScriptDataHashError
    ? error.detail
    : error instanceof CardanoCustodyRewardBalanceChangedError
    ? error.code
    : undefined;
describeCustodyFailure(hostedDevice);
