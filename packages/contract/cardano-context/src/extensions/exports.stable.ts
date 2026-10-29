// The stable SDK build resolves this file in place of exports.ts: the stable
// SDK carries none of the features the canary build adds, nor the hosted
// signer's request handlers.
// stable-omits: CARDANO_CUSTODY_DEFAULT_GRANT_FEE_BOUND
// stable-omits: CardanoAccountPublicKeyPayload, CardanoAccountPublicKeyResult
// stable-omits: CardanoCustodyAccount, CardanoCustodyAccountIdentityError
// stable-omits: CardanoCustodyAccountOperation, CardanoCustodyAccountState
// stable-omits: CardanoCustodyActionCreators, CardanoCustodySelectors
// stable-omits: CardanoCustodySideEffect
// stable-omits: CardanoCustodyActivityMetadata, CardanoCustodyBuildError
// stable-omits: CardanoCustodyBuildRequest, CardanoCustodyBuildResult
// stable-omits: CardanoCustodyCollateralFunding, CardanoCustodyCreateOperation
// stable-omits: CardanoCustodyCreatorIndexProbeError
// stable-omits: CardanoCustodyCreatorIndexProbeRequest
// stable-omits: CardanoCustodyCreatorIndexProbeResult
// stable-omits: CardanoCustodyDataPurpose
// stable-omits: CardanoCustodyDeviceKeyMismatchError, CardanoCustodyFeeFunding
// stable-omits: CardanoCustodyFundingContext, CardanoCustodyGrantScopeRequest
// stable-omits: CardanoCustodyGrantStatus, CardanoCustodyGrantWithStatus
// stable-omits: CardanoCustodyInvalidReason, CardanoCustodyOperationKind
// stable-omits: CardanoCustodyPublicKeyPayload, CardanoCustodyRefusalCode
// stable-omits: CardanoCustodyRequestRefusedError
// stable-omits: CardanoCustodySignDataRequestCheck
// stable-omits: CardanoCustodySignRequestCheck, CardanoCustodyWalletEntity
// stable-omits: CardanoCustodyWalletId, CardanoSignerHandlers
// stable-omits: CreateCardanoSignerHandlersProps
// stable-omits: FEATURE_FLAG_CNIGHT_DESIGNATION, NightDesignationAction
// stable-omits: NightDesignationBuildResult, NightDesignationFlowSliceState
// stable-omits: NightDesignationFlowStoreState, NightDesignationIndexEntry
// stable-omits: NightDesignationIndexSliceState
// stable-omits: NightDesignationIndexStoreState, NightDesignationRegistration
// stable-omits: NightDesignationSnapshot
// stable-omits: NightDesignationStateAwaitingConfirmation
// stable-omits: NightDesignationStateBuilding, NightDesignationStateError
// stable-omits: NightDesignationStateIdle, NightDesignationStateProcessing
// stable-omits: NightDesignationStateSuccess, SignCardanoCustodyDataPayload
// stable-omits: SignCardanoCustodyTxPayload, SignCardanoDataPayload
// stable-omits: SignCardanoTxPayload, WithMnemonicWords
// stable-omits: cardanoCustodyActions, cardanoCustodySelectors
// stable-omits: cardanoCustodyStoreContract
// stable-omits: cardanoCustodyActivityMetadataOf
// stable-omits: checkCardanoCustodySignDataRequest
// stable-omits: checkCardanoCustodySignRequest
// stable-omits: checkOrdinaryCardanoTransaction, classifyCardanoCustodyAccount
// stable-omits: createCardanoSignerHandlers
// stable-omits: deriveCardanoCustodyAccountPublicKeyFromWords
// stable-omits: isCardanoCustodyAccount, isCardanoCustodyGrantExhausted
// stable-omits: nightDesignationFlowActions, nightDesignationFlowReducers
// stable-omits: nightDesignationFlowSelectors, nightDesignationIndexActions
// stable-omits: nightDesignationIndexReducers, nightDesignationIndexSelectors
// stable-omits: parseCardanoCustodyChainId, readCardanoCustodyControlUtxo
// stable-omits: signCardanoCustodyDataWithWords
// stable-omits: signCardanoCustodyTransactionWithWords
// stable-omits: verifyCardanoCustodyAccountIdentity
export {};
