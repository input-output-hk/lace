/* eslint-disable camelcase */
/* eslint-disable no-magic-numbers */
type RecursiveStructure = { [key: string]: '' | RecursiveStructure };

export type ConstructTranslationKeyUnion<T extends RecursiveStructure, K extends keyof T = keyof T> = K extends string
  ? T[K] extends ''
    ? K
    : T[K] extends RecursiveStructure
    ? `${K}.${ConstructTranslationKeyUnion<T[K]>}`
    : never
  : never;

type KeysStructure = {
  tab: {
    main: {
      title: '';
    };
  };
  general: {
    buttons: {
      back: '';
    };
    button: {
      cancel: '';
      confirm: '';
      agree: '';
      home: '';
      close: '';
      send: '';
      copy: '';
      copied: '';
      continue: '';
      reload: '';
      authorize: '';
    };
    clipboard: {
      copiedToClipboard: '';
    };
    adaFollowingNumericValue: '';
    errors: {
      networkError: '';
      uhoh: '';
      tryAgain: '';
      invalidPassword: '';
      invalidMnemonic: '';
      somethingWentWrong: '';
      insufficientBalance: '';
      utxoNotFragmentedEnough: '';
      utxoFullyDepleted: '';
      maximumInputCountExceeded: '';
      bundleAmountIsEmpty: '';
      incorrectAddress: '';
      incorrectHandle: '';
      wrongNetworkAddress: '';
      wrongAddressEra: '';
      handleConflict: '';
      invalidHandle: '';
    };
    warnings: {
      youHaveToStartAgain: '';
      areYouSureYouWantToExit: '';
      thisWillNotBeSaved: '';
      cannotFetchPrice: '';
      priceDataExpired: '';
      walletIsOffline: '';
    };
    lock: {
      helpAndSupport: '';
      yourWalletIsLocked: '';
      toUnlockOpenPopUp: '';
    };
    networks: {
      mainnet: '';
      preprod: '';
      preview: '';
      sanchonet: '';
      custom: '';
      offline: '';
      error: '';
      connectionUnavailable: {
        title: '';
        error: '';
      };
    };
    credit: {
      poweredBy: '';
      coinGecko: '';
    };
    loading: '';
  };
  multipleSelection: {
    cancel: '';
    selectMultiple: '';
    addToTransaction: '';
    deselect: '';
    reachedTheTxLimit: '';
    noOtherTokensCanBeAdded: '';
    gotIt: '';
    clear: '';
  };
  walletOverview: {
    title: '';
    balance: {
      receiveBtn: '';
      sendBtn: '';
    };
    toolbar: {
      wallet: '';
      activity: '';
    };
    cryptoAssets: {
      coins: '';
      nfts: '';
    };
  };
  transactions: {
    detail: {
      title: '';
      blockInfo: '';
    };
  };
  announcement: {
    title: {
      badge: '';
      text: '';
    };
    description: {
      text: '';
      linktext: '';
    };
    cta: '';
  };
  walletSetup: {
    backModal: {
      youllHaveToStartAgain: '';
      youWillBeShowANewRecoveryPhraseThePreviousOneWillBeDeleted: '';
      iUnderstandGoBack: '';
      ohOkLetsContinue: '';
    };
    recoveryPhrase: {
      currentSet: '';
      enterYourSecretRecoveryPhrase: '';
      confirm: '';
      iHaveWrittenDownAll24Word: '';
      howOftenWouldYouLikeToVerifyYourPassphrase: '';
      verificationFrequencyDecription: '';
    };
    walletName: {
      pleaseNameYourWallet: '';
      walletNameDescription: '';
    };
    setupOptions: {
      createNewWallet: '';
      createDescription: '';
      restoreWallet: '';
      restoreDescription: '';
      getStarted: '';
    };
    password: {
      createYourWalletPassword: '';
      capitalLetter: '';
      lowecasseLetter: '';
      number: '';
      characterMin: '';
      looksLikeThePasswordsYouHaveEnteredAreNotMatching: '';
    };
    layout: {
      btns: {
        next: '';
        back: '';
      };
    };
    restore: {
      recoveryPassphrasesFromOtherWalletsWillNotWork: '';
    };
  };
  walletActivity: {
    sectionTitle: '';
  };
  send: {
    balanceAmount: '';
    sectionTitle: {
      sendFund: '';
      confirmTransaction: '';
      TransactionSummary: '';
    };
    form: {
      cancel: '';
      next: '';
      addrTitle: '';
    };
    confirmation: {
      enterYourSpendingPassword: '';
    };
    summary: {
      youSign: '';
    };
    addressBook: {
      title: '';
      nameLabel: '';
    };
    networkFee: '';
    cancelModal: {
      woopsWrongButton: '';
      iUnderstandGoBack: '';
      title: '';
      description: '';
    };
    sendMultipleOutputsAtTheSameTime: '';
    theAmountYoullBeChargedToProcessYourTransaction: '';
    connectYourLedger: '';
    connectYourTrezor: '';
    toSendAnNFTOrNativeToken: '';
    trezorDoesNotDupportDecimals: '';
  };
  staking: {
    sectionTitle: '';
    notEnoughFunds: {
      title: '';
      text: '';
    };
    notStaking: {
      title: '';
      text: '';
    };
    confirmation: {
      title: '';
      stakingDeposit: '';
      transactionFee: '';
      theAmountYoullBeChargedForRegisteringYourStakeKey: '';
    };
    details: {
      confirmation: {
        button: {
          confirm: '';
        };
      };
    };
    authorization: {
      title: '';
      delegateBtnLabel: '';
    };
    stakePools: {
      sectionTitle: '';
    };
    expandView: {
      title: '';
      description: '';
      button: '';
    };
  };
  poolDetails: {
    sectionTitle: '';
    delegate: '';
  };
  addressBook: {
    sectionTitle: '';
    empty: {
      sendSecurelyBySavingYourFavouriteAddresses: '';
      addNewAddress: '';
    };
    errors: {
      nameTooLong: '';
      givenAddressAlreadyExist: '';
      givenNameAlreadyExist: '';
    };
    addressDetail: {
      btn: {
        copy: '';
      };
    };
    editModal: {
      title: '';
    };
    deleteModal: {
      title: '';
      description: '';
      buttons: {
        cancel: '';
      };
    };
    reviewModal: {
      title: '';
      banner: {
        browserDescription: '';
        popUpDescription: '';
        confirmReview: {
          link: '';
          button: '';
        };
        popUpDescriptionEnd: '';
      };
      confirmUpdate: {
        button: '';
      };
      cancelUpdate: {
        button: '';
      };
      previousAddress: {
        description: '';
      };
      actualAddress: {
        description: '';
      };
    };
    updateModal: {
      title: '';
      description: '';
      button: {
        confirm: '';
      };
    };
  };
  unlock: {
    sectionTitle: '';
    button: '';
    input: {
      placeholder: '';
    };
    forgotPassword: '';
  };
  forgotPassword: {
    title: '';
    description: '';
    confirm: '';
    cancel: '';
  };
  settings: {
    title: '';
    passphraseVerificationSection: {
      title: '';
    };
    security: {
      title: '';
      passphraseVerificationIntervals: '';
    };
    support: {
      title: '';
      faqs: '';
      feesExplained: '';
    };
    legals: {
      title: '';
      termsAndConditions: '';
      privacyPolicy: '';
      cookiePolicy: '';
      termsOfService: '';
    };
    copyAddress: '';
    copyHandle: '';
  };
  dapp: {
    dappErrorPage: {
      closeButton: '';
    };
    connect: {
      header: '';
      btn: {
        accept: '';
        cancel: '';
        justOnce: '';
        confirm: '';
      };
      modal: {
        allowAlways: '';
        allowOnce: '';
        header: '';
        description: '';
      };
    };
    signData: {
      header: '';
    };
    confirmData: {
      header: '';
    };
    confirm: {
      header: '';
      details: {
        header: '';
        amount: '';
        recepient: '';
        fee: '';
      };
      btn: {
        cancel: '';
        confirm: '';
      };
    };
    sign: {
      header: '';
      success: {
        header: '';
        title: '';
        description: '';
      };
      failure: {
        header: '';
        title: '';
        description: '';
      };
      data: {
        success: {
          description: '';
        };
        failure: {
          description: '';
        };
      };
    };
    list: {
      title: '';
      subTitle: '';
      subTitleEmpty: '';
      removedSuccess: '';
      removedFailure: '';
      empty: {
        text: '';
      };
    };
    delete: {
      title: '';
      description: '';
      cancel: '';
      confirm: '';
    };
    noWallet: {
      heading: '';
      description: '';
      closeButton: '';
    };
    educationBanner: {
      title: '';
    };
    betaModal: {
      header: '';
      content: {
        '1': '';
        '2': '';
      };
      btn: {
        close: '';
        learnMore: '';
      };
    };
    transactions: {
      confirm: {
        title: '';
      };
    };
    collateral: {
      set: {
        header: '';
      };
      create: {
        header: '';
      };
      request: '';
      calculating: '';
      amountSeparated: '';
      insufficientFunds: {
        title: '';
        description: '';
        add: '';
      };
    };
  };
  qrInfo: {
    receive: '';
    title: '';
    scanQRCodeToConnectWallet: '';
    walletAddress: '';
    publicKey: '';
  };
  expandPopup: '';
  browserView: {
    sharedWallet: {
      setup: {
        title: '';
        subTitle: '';
        createSharedWalletOption: {
          title: '';
          description: '';
          button: '';
        };
        importSharedWalletOption: {
          title: '';
          description: '';
          button: '';
        };
      };
    };
    welcome: '';
    addFundsToStartYourCryptoJourney: '';
    sidePanel: {
      aboutYourWallet: '';
      learnAbout: '';
      aboutStaking: '';
    };
    assets: {
      add: '';
      title: '';
      token: '';
      send: '';
      welcome: '';
      addFundsToStartYourCryptoJourney: '';
      startYourWeb3Journey: '';
      totalWalletBalance: '';
      portfolioBalanceToolTip: '';
    };
    assetDetails: {
      title: '';
      price: '';
      assetPrice: '';
      assetBalance: '';
      recentTransactions: '';
      viewAll: '';
      tokenInformation: '';
      fingerprint: '';
      policyId: '';
    };
    sideMenu: {
      links: {
        general: '';
        tokens: '';
        nfts: '';
        activity: '';
        staking: '';
        dappStore: '';
        voting: '';
        addNewWallet: '';
        addSharedWallet: '';
        addressBook: '';
      };
      dapps: {
        header: '';
      };
      mode: {
        light: '';
        dark: '';
      };
    };
    topNavigationBar: {
      links: {
        settings: '';
        network: '';
        lockWallet: '';
      };
      walletStatus: {
        walletSynced: '';
        notSyncedToTheBlockchain: '';
        walletSyncing: '';
      };
    };
    walletSetup: {
      support: '';
      mnemonicResetModal: {
        header: '';
        content: '';
        cancel: '';
        confirm: '';
      };
      confirmRestoreModal: {
        header: '';
        content: '';
        confirm: '';
      };
      confirmExperimentalHwDapp: {
        header: '';
        content: '';
        confirm: '';
      };
    };
    crypto: {
      emptyDashboard: {
        welcome: '';
        addSomeFundsYoStartYourJourney: '';
        useThisAddressOrScanTheQRCodeToTransferFunds: '';
        copyAddress: '';
      };
      dashboard: {
        emptyRewards: '';
        adaBalance: '';
        rewards: '';
        topAssetsTitle: '';
        lastTxsTitle: '';
        staking: '';
        faqBanner: {
          title: '';
          subtitle: '';
        };
        glossaryBanner: {
          title: '';
          subtitle: '';
        };
      };
      nft: {
        send: '';
      };
    };
    addressBook: {
      title: '';
      addressList: {
        addItem: {
          title: '';
          button: '';
        };
      };
      emptyState: {
        title: '';
        message: '';
        button: '';
      };
      addressDetail: {
        btn: {
          copy: '';
          edit: '';
          delete: '';
        };
        title: '';
      };
      editAddress: {
        title: '';
      };
      addressForm: {
        title: {
          edit: '';
          add: '';
        };
        saveAddress: '';
      };
      deleteModal: {
        title: '';
        description: '';
        description1: '';
        description2: '';
        buttons: {
          cancel: '';
          confirm: '';
        };
      };
      toast: {
        addAddress: '';
        editAddress: '';
        deleteAddress: '';
      };
      form: {
        nameMissing: '';
        nameHasWhiteSpace: '';
        nameIsTooLong: '';
        addressMissing: '';
        addressHasWhiteSpace: '';
        invalidCardanoAddress: '';
        addNewAddress: '';
        addNewSubtitle: '';
      };
    };
    voting: {
      pageTitle: '';
      catalystRegistrationFlow: {
        title: '';
      };
      educationalList: {
        title: '';
      };
      fundWalletBanner: {
        title: '';
        subtitle: '';
      };
      votingPhase: '';
      alert: {
        insufficientBalance: {
          message: '';
          action: '';
        };
        insufficientBalanceDuringSnapshot: {
          message: '';
        };
        registrationEnded: {
          message: '';
          action: '';
        };
      };
      phase: '';
      registration: '';
      snapshot: '';
      voting: '';
      registerYourWallet: '';
      register: '';
      registered: '';
      snapshotExplanation: '';
      voteForChallenges: '';
      votePrompt: '';
      canNotParticipate: '';
    };
    sendReceive: {
      sendAndReceiveAssetsAtTheSpeedOfLightPart1: '';
      sendAndReceiveAssetsAtTheSpeedOfLightPart2: '';
      send: '';
      receive: '';
    };
    staking: {
      title: '';
      stakingInfo: {
        title: '';
        tooltip: {
          title: '';
        };
        totalRewards: {
          title: '';
        };
        totalStaked: {
          title: '';
        };
        stats: {
          ros: '';
          Fee: '';
          Margin: '';
        };
        lastReward: {
          title: '';
        };
        StakeFundsBanner: {
          title: '';
          description: '';
          balanceTitle: '';
        };
      };
      fundWalletBanner: {
        subtitle: '';
        prompt: '';
      };
      faqBanner: {
        title: '';
        subtitle: '';
      };
      glossaryBanner: {
        title: '';
        subtitle: '';
      };
      stakePoolsTable: {
        title: '';
        searchPlaceholder: '';
        emptyMessage: '';
      };
      details: {
        title: '';
        titleSecond: '';
        unstakingIsNotYetAvailableFollowTheseStepsIfYouWishToChangeStakePool: '';
        clickOnAPoolFromTheListInTheMainPage: '';
        clickOnTheStakeToThisPoolButtonInTheDetailPage: '';
        followTheIstructionsInTheStakingFlow: '';
        stakeButtonText: '';
        statistics: {
          title: '';
        };
        information: {
          title: '';
        };
        social: {
          title: '';
        };
        poolIds: {
          title: '';
        };
        owners: {
          title: '';
        };
        confirmation: {
          title: '';
          subTitle: '';
          cardanoName: '';
          transactionCost: {
            title: '';
          };
          transactionReturn: {
            title: '';
          };
          transactionTotal: {
            title: '';
          };
          button: {
            confirm: '';
            signing: '';
            confirmWithDevice: '';
            continueInAdvancedView: '';
          };
        };
        sign: {
          title: '';
          subTitle: '';
        };
        success: {
          title: '';
          subTitle: '';
          text: '';
          description: '';
        };
        switchedPools: {
          title: '';
          subTitle: '';
        };
        fail: {
          title: '';
          subTitle: '';
          text: '';
          description: '';
          btn: {
            close: '';
            retry: '';
            back: '';
          };
        };
        switchingPoolsModal: {
          title: '';
          description: '';
          buttons: {
            cancel: '';
            confirm: '';
          };
        };
        poolOversaturatedModal: {
          title: '';
          description: '';
          buttons: {
            confirm: '';
          };
        };
        poolRetiredModal: {
          title: '';
          description: '';
          buttons: {
            confirm: '';
          };
        };
        exitStakingModal: {
          title: '';
          description: '';
          buttons: {
            cancel: '';
            confirm: '';
          };
        };
        noFundsModal: {
          title: '';
          description: '';
          buttons: {
            cancel: '';
            confirm: '';
          };
        };
        errors: {
          utxoFullyDepleted: '';
          utxoBalanceInsufficient: '';
        };
      };
    };
    onboarding: {
      commonError: {
        title: '';
        description: '';
        ok: '';
      };
      notDetectedError: {
        title: '';
        description: '';
        agree: '';
        trezorDescription: '';
      };
      startOver: {
        title: '';
        description: '';
        cancel: '';
        gotIt: '';
      };
      sendTransitionAcknowledgment: {
        title: '';
        description: '';
        iUnderstand: '';
        dontShowAgain: '';
      };
      stakingTransitionAcknowledgment: {
        title: '';
        description: '';
        iUnderstand: '';
      };
      hardwareWalletSendTransition: {
        title: '';
        description: '';
        ok: '';
        cancel: '';
      };
      hardwareWalletStakingTransition: {
        title: '';
        description: '';
        ok: '';
        cancel: '';
      };
    };
    activity: {
      title: '';
      learnAbout: {
        title: '';
        whatAreActivityDetails: '';
        whatIsAnUnconfirmedTransaction: '';
        doesLaceHaveFees: '';
        transactionBundles: '';
      };
      entry: {
        asset: '';
        token: '';
        tokens: '';
        staking: '';
        name: {
          delegation: '';
          delegationDeregistration: '';
          delegationRegistration: '';
          withdrawal: '';
          incoming: '';
          outgoing: '';
          sending: '';
          self: '';
        };
      };
      fundWalletBanner: {
        title: '';
        subtitle: '';
      };
    };
    transaction: {
      send: {
        title: '';
        advancedTransaction: '';
        metadata: {
          addANote: '';
          note: '';
          count: '';
        };
        drawer: {
          advanced: '';
          addBundle: '';
          newTransaction: '';
          transactionSummary: '';
          breakdownOfYourTransactionCost: '';
          signTransaction: '';
          allDone: '';
          transactionError: '';
          addressList: '';
          addressBookEmpty: '';
          addressForm: '';
          addressBook: '';
          cancelEditAddressModal: {
            title: '';
            description1: '';
            description2: '';
            cancel: '';
            confirm: '';
          };
        };
        advancedFlowText: '';
        group: {
          label1: '';
          label2: '';
        };
        totalFee: '';
        footer: {
          cancel: '';
          close: '';
          confirm: '';
          review: '';
          viewTransaction: '';
          view: '';
          fail: '';
          unauthorized: '';
          save: '';
          signing: '';
          confirmWithDevice: '';
          continueInAdvancedView: '';
        };
        simple: {
          to: '';
          enterYourSpendingPassword: '';
        };
        error: {
          insufficientBalance: '';
          invalidAddress: '';
          invalidPassword: '';
        };
        password: {
          placeholder: '';
        };
        advanced: {
          output: '';
          asset: '';
          bundleTitle: '';
        };
        transactionFee: '';
        transactionCosts: '';
        adaAllocation: '';
        confirmationTitle: '';
        signTransactionWithPassword: '';
        enterWalletPasswordToConfirmTransaction: '';
      };
      success: {
        youCanSafelyCloseThisPanel: '';
        thisMayTakeAFewMinutes: '';
        localNodeBanner: {
          headline: '';
          infoText: '';
          buttonText: '';
        };
        thisMayTakeAFewMinutesToProcessYouCanViewTheStatusByClickingViewTransaction: '';
      };
      fail: {
        oopsSomethingWentWrong: '';
        unauthorizedTransaction: '';
        problemSubmittingYourTransaction: '';
        clickBackAndTryAgain: '';
        theTransactionHasNotBeenProceedPleasetryagain: '';
      };
    };
    settings: {
      heading: '';
      wallet: {
        title: '';
        about: {
          title: '';
          description: '';
          content: {
            title: '';
            network: '';
            currentVersion: '';
            commit: '';
          };
        };
        accounts: {
          title: '';
          description: '';
          unlockLabel: '';
          lockLabel: '';
        };
        general: {
          title: '';
          description: '';
          removeWallet: '';
          removeWalletDescription: '';
          removeAction: '';
          showPubKey: '';
          exportPubKey: '';
          showPubKeyDescription: '';
          exportPubKeyDescription: '';
          showPubKeyAction: '';
          exportPubKeyAction: '';
          removeWalletAlert: {
            title: '';
            content: '';
            cancel: '';
            confirm: '';
          };
        };
        collateral: {
          title: '';
          description: '';
          amountDescription: '';
          reclaimDescription: '';
          reclaimBanner: '';
          close: '';
          confirm: '';
          reclaimCollateral: '';
          continueInAdvancedView: '';
          confirmWithDevice: '';
          notEnoughAda: '';
          active: '';
          inactive: '';
          toast: {
            add: '';
            claim: '';
          };
        };
        network: {
          title: '';
          description: '';
          drawerDescription: '';
          networkSwitched: '';
        };
        authorizedDApps: {
          title: '';
          description: '';
        };
        walletSync: {
          description: '';
          ctaLabel: '';
          title: '';
        };
      };
      preferences: {
        title: '';
        currency: {
          title: '';
          description: '';
          toast: '';
          list: {
            tADA: '';
            ADA: '';
            USD: '';
            AUD: '';
            BRL: '';
            CAD: '';
            EUR: '';
            INR: '';
            JPY: '';
            KRW: '';
            CHF: '';
            GBP: '';
            VND: '';
          };
        };
        theme: {
          title: '';
          description: '';
        };
      };
      help: {
        title: '';
        faqs: {
          title: '';
          description: '';
          drawer: {
            title: '';
            description: '';
          };
        };
        support: {
          title: '';
          help: '';
          description: '';
          iogZenDesk: '';
          createASupportTicket: '';
        };
      };
      security: {
        title: '';
        '2fa': '';
        passphrasePeriodicVerification: {
          title: '';
          description: '';
        };
        showPassphrase: {
          title: '';
          description: '';
        };
        analytics: {
          title: '';
          description: '';
        };
        periodicVerification: {
          title: '';
          description: '';
          success: '';
        };
        showPassphraseDrawer: {
          title: '';
          YourRecoveryPhrase: '';
          description: '';
          warning: '';
          hidePassphrase: '';
          showPassphrase: '';
        };
      };
      legal: {
        title: '';
        tnc: {
          title: '';
          description: '';
        };
        privacyPolicy: {
          title: '';
          description: '';
        };
        cookiePolicy: {
          title: '';
          description: '';
        };
        downloadNow: '';
      };
    };
    fundWalletBanner: {
      walletAddress: '';
      prompt: '';
      copyAddress: '';
    };
    nfts: {
      fundWalletBanner: {
        title: '';
        subtitle: '';
        prompt: '';
      };
      pageTitle: '';
      createFolder: '';
      renameYourFolder: '';
      educationalList: {
        title: '';
      };
      folderDrawer: {
        header: '';
        existingFolderHeader: '';
        nameForm: {
          title: '';
          inputPlaceholder: '';
          inputError: '';
          givenNameAlreadyExist: '';
        };
        assetPicker: {
          title: '';
        };
        cta: {
          create: '';
          update: '';
        };
        toast: {
          create: '';
          update: '';
          delete: '';
        };
        contextMenu: {
          remove: '';
        };
      };
      contextMenu: {
        rename: '';
        delete: '';
      };
      renameFolderSuccess: '';
      deleteFolderSuccess: '';
      exitModal: {
        header: '';
        description: '';
        confirm: '';
        cancel: '';
      };
      deleteFolderModal: {
        header: '';
        description1: '';
        description2: '';
        confirm: '';
        cancel: '';
      };
    };
    pinExtension: {
      title: '';
      prompt: '';
    };
  };
  educationalBanners: {
    title: {
      glossary: '';
      faq: '';
      video: '';
      learn: '';
      more: '';
      videoBlog: '';
    };
    subtitle: {
      whatIsADigitalAsset: '';
      whatIsLaceAddressBook: '';
      whatIsSavedAddress: '';
      howToSendReceiveFunds: '';
      connectingDApps: '';
      secureSelfCustody: '';
      collections: '';
      enterNFTGallery: '';
      buyAnNft: '';
      stakingAndDelegation: '';
      howManyPools: '';
      ledgerSupport: '';
      stakeDistribution: '';
    };
  };
  migrations: {
    inProgress: {
      applying: '';
      browser: {
        title: '';
        description: {
          '1': '';
          '2': '';
        };
      };
    };
    failed: {
      title: '';
      subtitle: '';
      errorDescription: '';
      actionDescription: '';
      btn: {
        confirm: '';
      };
    };
  };
  corruptedData: {
    title: '';
    errorDescription: '';
    actionDescription: '';
    btn: {
      confirm: '';
    };
  };
  cardano: {
    general: {
      confirmButton: '';
      cancelButton: '';
      nextButton: '';
    };
    networkInfo: {
      title: '';
      currentEpoch: '';
      epochEnd: '';
      totalPools: '';
      percentageStaked: '';
      averageRos: '';
      averageMargin: '';
    };
    stakePoolMetricsBrowser: {
      activeStake: '';
      liveStake: '';
      saturation: '';
      delegators: '';
      ros: '';
      blocks: '';
      cost: '';
      margin: '';
      pledge: '';
    };
    stakePoolSearch: {
      gettingSaturated: '';
      saturated: '';
      overSaturated: '';
      staking: '';
      searchPlaceholder: '';
    };
    stakePoolStatusLogo: {
      retiring: '';
      retired: '';
      delegating: '';
      saturated: '';
    };
    stakePoolTableBrowser: {
      tableHeader: {
        ticker: {
          title: '';
          tooltip: '';
        };
        cost: {
          title: '';
          tooltip: '';
        };
        apy: {
          title: '';
          tooltip: '';
        };
        saturation: {
          title: '';
          tooltip: '';
        };
        margin: {
          title: '';
          tooltip: '';
        };
        blocks: {
          title: '';
          tooltip: '';
        };
        pledge: {
          title: '';
          tooltip: '';
        };
        liveStake: {
          title: '';
          tooltip: '';
        };
      };
    };
    stakingConfirmationInfo: {
      delegateTo: '';
      poolId: '';
      deposit: '';
      transactionFee: '';
    };
    catalystConfirmationStep: {
      confirmHeader: '';
      confirmBody: '';
      register: '';
      totalFee: '';
    };
    catalystPinStep: {
      confirmPin: '';
      setPin: '';
      resetPin: '';
      pinNotMatching: '';
    };
    catalystRegistrationStep: {
      registerNow: '';
    };
    catalystScanStep: {
      header: '';
      body1: '';
      body2: '';
      downloadButton: '';
      doneButton: '';
    };
    currentCatalystFund: {
      endOfRegistration: '';
    };
    votingParticipation: {
      walletStatus: '';
    };
    waitForNextFundCard: {
      phase0: '';
      title: '';
      message: '';
      register: '';
      registered: '';
    };
  };
  core: {
    assetActivityList: {
      viewAll: '';
    };
    assetSelectorOverlay: {
      youDonthaveAnyTokens: '';
      justAddSomeDigitalAssetsToGetStarted: '';
      noNFTs: '';
      addFundsToStartYourWeb3Journey: '';
      usedAllAssets: '';
      noMatchingResult: '';
    };
    assetActivityItem: {
      entry: {
        asset: '';
        token: '';
        tokens: '';
        staking: '';
        name: {
          delegation: '';
          delegationDeregistration: '';
          delegationRegistration: '';
          rewards: '';
          incoming: '';
          outgoing: '';
          sending: '';
          self: '';
          vote: '';
          HardForkInitiationAction: '';
          NewConstitution: '';
          NoConfidence: '';
          ParameterChangeAction: '';
          TreasuryWithdrawalsAction: '';
          UpdateCommittee: '';
          InfoAction: '';
          UpdateDelegateRepresentativeCertificate: '';
          StakeVoteDelegationCertificate: '';
          StakeRegistrationDelegationCertificate: '';
          VoteRegistrationDelegationCertificate: '';
          StakeVoteRegistrationDelegationCertificate: '';
          ResignCommitteeColdCertificate: '';
          AuthorizeCommitteeHotCertificate: '';
          RegisterDelegateRepresentativeCertificate: '';
          UnregisterDelegateRepresentativeCertificate: '';
          VoteDelegationCertificate: '';
          StakeRegistrationDelegateCertificate: '';
          StakeVoteRegistrationDelegateCertificate: '';
          VoteRegistrationDelegateCertificate: '';
        };
        certificates: {
          headings: {
            typename: '';
            anchor: '';
            drep: '';
            deposit: '';
            coldCredential: '';
            hotCredential: '';
          };
        };
      };
    };
    activityDetails: {
      self: '';
      address: '';
      sent: '';
      sending: '';
      header: '';
      transactionID: '';
      status: '';
      timestamp: '';
      inputs: '';
      outputs: '';
      transactionFee: '';
      deposit: '';
      depositReclaim: '';
      metadata: '';
      transactionFeeInfo: '';
      received: '';
      delegation: '';
      registration: '';
      deregistration: '';
      poolName: '';
      poolTicker: '';
      poolId: '';
      rewards: '';
      rewardsDescription: '';
      summary: '';
      from: '';
      to: '';
      multipleAddresses: '';
      pools: '';
      epoch: '';
      collateral: '';
      collateralInfo: '';
      ParameterChangeAction: '';
      HardForkInitiationAction: '';
      NewConstitution: '';
      TreasuryWithdrawalsAction: '';
      InfoAction: '';
      StakeVoteRegistrationDelegateCertificate: '';
      RegisterDelegateRepresentativeCertificate: '';
      UnregisterDelegateRepresentativeCertificate: '';
      UpdateDelegateRepresentativeCertificate: '';
      ResignCommitteeColdCertificate: '';
      StakeRegistrationDelegateCertificate: '';
      StakeVoteDelegationCertificate: '';
      VoteRegistrationDelegateCertificate: '';
      AuthorizeCommitteeHotCertificate: '';
      VoteDelegationCertificate: '';
      UpdateCommittee: '';
      NoConfidence: '';
      vote: '';
      certificates: '';
      certificate: '';
      certificateTitles: {
        certificateType: '';
        stakeKey: '';
        poolId: '';
        drep: '';
        drepId: '';
        depositPaid: '';
        depositPaidInfo: '';
        depositReturned: '';
        depositReturnedInfo: '';
        anchorURL: '';
        anchorHash: '';
        coldCredential: '';
        hotCredential: '';
      };
      votingProcedures: '';
      votingProcedure: '';
      votingProcedureTitles: {
        vote: '';
        voterType: '';
        voterCredential: '';
        drepId: '';
        anchorURL: '';
        anchorHash: '';
        voteTypes: '';
      };
      proposalProcedures: '';
      proposalProcedure: '';
      proposalProcedureTitles: {
        type: '';
        deposit: '';
        rewardAccount: '';
        anchorHash: '';
        anchorURL: '';
        actionIndex: '';
        governanceActionID: '';
        withdrawal: '';
        withdrawalRewardAccount: '';
        withdrawalAmount: '';
        constitutionAnchorURL: '';
        constitutionScriptHash: '';
        coldCredentialHash: '';
        epoch: '';
        membersToBeAdded: '';
        hash: '';
        membersToBeRemoved: '';
        newQuorumThreshold: '';
        protocolVersionMajor: '';
        protocolVersionMinor: '';
        protocolVersionPatch: '';
      };

      governanceActions: {
        info_action: '';
        hard_fork_initiation_action: '';
        parameter_change_action: '';
        treasury_withdrawals_action: '';
        no_confidence: '';
        update_committee: '';
        new_constitution: '';
      };
      epochs: '';
      voterType: {
        constitutionalCommittee: '';
        spo: '';
        drep: '';
      };
      voteTypes: { yes: ''; no: ''; abstain: '' };
      credentialType: {
        KeyHash: '';
        ScriptHash: '';
      };
    };
    walletNameAndPasswordSetupStep: {
      title: '';
      description: '';
      nameInputLabel: '';
      nameMaxLength: '';
      passwordInputLabel: '';
      confirmPasswordInputLabel: '';
      nameRequiredMessage: '';
      noMatchPassword: '';
      secondLevelPasswordStrengthFeedback: '';
      firstLevelPasswordStrengthFeedback: '';
    };
    dappTransaction: {
      asset: '';
      burn: '';
      fee: '';
      mint: '';
      quantity: '';
      send: '';
      sending: '';
      transaction: '';
      amount: '';
      recipient: '';
      insufficientFunds: '';
      signedSuccessfully: '';
      tryingToUseAssetNotInWallet: '';
      noCollateral: '';
    };

    general: {
      saveButton: '';
      cancelButton: '';
    };
    addressForm: {
      addAddress: '';
      name: '';
      address: '';
      addNew: '';
      addNewSubtitle: '';
    };
    dapp: {
      beta: '';
    };
    authorizeDapp: {
      warning: '';
      nonssl: '';
      nonsslTooltip: '';
    };
    ProposalProcedures: {
      title: '';
    };
    ProposalProcedure: {
      dRepId: '';
      txDetails: {
        deposit: '';
        rewardAccount: '';
        title: '';
        txType: '';
      };
      procedure: {
        anchor: {
          hash: '';
          url: '';
        };
        title: '';
        dRepId: '';
      };
      governanceAction: {
        actionId: {
          title: '';
          index: '';
          txId: '';
        };
        hardForkInitiation: {
          title: '';
          protocolVersion: {
            major: '';
            minor: '';
            patch: '';
          };
        };
        newConstitutionAction: {
          title: '';
          constitution: {
            title: '';
            anchor: {
              dataHash: '';
              url: '';
            };
            scriptHash: '';
          };
        };
        infoAction: {
          title: '';
        };
        noConfidenceAction: {
          title: '';
        };
        protocolParamUpdate: {
          title: '';
          memory: '';
          step: '';
          networkGroup: {
            title: '';
            maxBBSize: '';
            maxTxSize: '';
            maxBHSize: '';
            maxValSize: '';
            maxTxExUnits: '';
            maxBlockExUnits: '';
            maxCollateralInputs: '';
            tooltip: {
              maxBBSize: '';
              maxTxSize: '';
              maxBHSize: '';
              maxValSize: '';
              maxTxExUnits: '';
              maxBlockExUnits: '';
              maxCollateralInputs: '';
            };
          };
          economicGroup: {
            title: '';
            minFeeA: '';
            minFeeB: '';
            keyDeposit: '';
            poolDeposit: '';
            rho: '';
            tau: '';
            minPoolCost: '';
            coinsPerUTxOByte: '';
            prices: '';
            tooltip: {
              minFeeA: '';
              minFeeB: '';
              keyDeposit: '';
              poolDeposit: '';
              rho: '';
              tau: '';
              minPoolCost: '';
              coinsPerUTxOByte: '';
              prices: '';
            };
          };
          technicalGroup: {
            title: '';
            a0: '';
            eMax: '';
            nOpt: '';
            costModels: '';
            PlutusV1: '';
            PlutusV2: '';
            collateralPercentage: '';
            tooltip: {
              a0: '';
              eMax: '';
              nOpt: '';
              costModels: '';
              collateralPercentage: '';
            };
          };
          governanceGroup: {
            title: '';
            govActionLifetime: '';
            govActionDeposit: '';
            drepDeposit: '';
            drepActivity: '';
            ccMinSize: '';
            ccMaxTermLength: '';
            dRepVotingThresholds: {
              title: '';
              motionNoConfidence: '';
              committeeNormal: '';
              committeeNoConfidence: '';
              updateConstitution: '';
              hardForkInitiation: '';
              ppNetworkGroup: '';
              ppEconomicGroup: '';
              ppTechnicalGroup: '';
              ppGovernanceGroup: '';
              treasuryWithdrawal: '';
            };
            tooltip: {
              govActionLifetime: '';
              govActionDeposit: '';
              drepDeposit: '';
              drepActivity: '';
              ccMinSize: '';
              ccMaxTermLength: '';
              dRepVotingThresholds: {
                title: '';
                motionNoConfidence: '';
                committeeNormal: '';
                committeeNoConfidence: '';
                updateConstitution: '';
                hardForkInitiation: '';
                ppNetworkGroup: '';
                ppEconomicGroup: '';
                ppTechnicalGroup: '';
                ppGovernanceGroup: '';
                treasuryWithdrawal: '';
              };
            };
          };
        };
        treasuryWithdrawals: {
          title: '';
          withdrawals: {
            lovelace: '';
            rewardAccount: '';
          };
        };
        updateCommitteeAction: {
          title: '';
          membersToBeAdded: {
            title: '';
            coldCredential: {
              hash: '';
              epoch: '';
            };
          };
          membersToBeRemoved: {
            title: '';
            hash: '';
          };
          newQuorumThreshold: {
            title: '';
            denominator: '';
            numerator: '';
          };
        };
      };
    };
    VotingProcedures: {
      title: '';
      voterType: '';
      procedureTitle: '';
      actionIdTitle: '';
      vote: '';
      actionId: {
        index: '';
        txHash: '';
      };
      anchor: {
        hash: '';
        url: '';
      };
      dRepId: '';
      voterTypes: {
        constitutionalCommittee: '';
        spo: '';
        drep: '';
      };
      votes: {
        yes: '';
        no: '';
        abstain: '';
      };
      NonRegisteredUserModal: {
        title: '';
        description: '';
        cta: {
          ok: '';
          cancel: '';
        };
      };
    };
    DRepRegistration: {
      title: '';
      metadata: '';
      url: '';
      hash: '';
      drepId: '';
      depositPaid: '';
    };
    DRepRetirement: {
      title: '';
      metadata: '';
      drepId: '';
      depositReturned: '';
      drepIdMismatchScreen: {
        title: '';
        description: '';
        cancel: '';
      };
    };
    DRepUpdate: {
      title: '';
      metadata: '';
      drepId: '';
      url: '';
      hash: '';
    };
    VoteDelegation: {
      title: '';
      metadata: '';
      drepId: '';
      alwaysAbstain: '';
      alwaysNoConfidence: '';
      option: '';
    };
    StakeVoteDelegation: {
      title: '';
      metadata: '';
      drepId: '';
      alwaysAbstain: '';
      alwaysNoConfidence: '';
      option: '';
      stakeKeyHash: '';
      poolId: '';
    };
    StakeVoteDelegationRegistration: {
      title: '';
      metadata: '';
      drepId: '';
      alwaysAbstain: '';
      alwaysNoConfidence: '';
      option: '';
      stakeKeyHash: '';
      poolId: '';
      depositPaid: '';
    };
    StakeRegistrationDelegation: {
      title: '';
      metadata: '';
      stakeKeyHash: '';
      poolId: '';
      depositPaid: '';
    };
    VoteRegistrationDelegation: {
      title: '';
      metadata: '';
      drepId: '';
      alwaysAbstain: '';
      alwaysNoConfidence: '';
      option: '';
      stakeKeyHash: '';
      depositPaid: '';
    };

    Mint: {
      title: '';
    };
    Burn: {
      title: '';
    };
    Send: {
      title: '';
    };
    destinationAddressInput: {
      recipientAddress: '';
    };
    editAddressForm: {
      walletName: '';
      address: '';
      submissionError: '';
      doneButton: '';
    };
    infoWallet: {
      copy: '';
      addressCopied: '';
      handleCopied: '';
    };
    nftDetail: {
      title: '';
      tokenInformation: '';
      attributes: '';
      sendNFT: '';
    };
    outputSummaryList: {
      recipientAddress: '';
      sending: '';
      txFee: '';
      metaData: '';
      deposit: '';
      output: '';
    };
    sendReceive: {
      send: '';
      receive: '';
    };
    coinInputSelection: {
      assetSelection: '';
      tokens: '';
      nfts: '';
    };
    walletAddressList: {
      name: '';
      address: '';
    };
    walletBasicInfo: {
      balance: '';
    };
    walletSetupLegalStep: {
      title: '';
      toolTipText: '';
    };
    walletSetupAnalyticsStep: {
      title: '';
      description: '';
      back: '';
      agree: '';
      optionsTitle: '';
      optionsFooter1: '';
      privacyPolicy: '';
      allowOptout: '';
      collectPrivateKeys: '';
      collectIp: '';
      personalData: '';
    };
    walletSetupConnectHardwareWalletStep: {
      title: '';
      subTitle: '';
      subTitleFull: '';
      supportedDevicesFull: '';
      supportedDevices: '';
      connectDevice: '';
      connectDeviceFull: '';
    };
    walletSetupCreateStep: {
      title: '';
      description: '';
    };
    walletSetupRestoreStep: {
      title: '';
    };
    walletSetupFinalStep: {
      title: '';
      description: '';
      close: '';
      followTwitter: '';
      followYoutube: '';
      followDiscord: '';
    };
    walletSetupMnemonicStep: {
      writePassphrase: '';
      enterPassphrase: '';
      enterPassphraseDescription: '';
      body: '';
      passphraseInfo1: '';
      passphraseInfo2: '';
      passphraseInfo3: '';
      passphraseError: '';
    };
    walletSetupMnemonicIntroStep: {
      title: '';
      description: '';
      link: '';
    };
    walletSetupMnemonicVerificationStep: {
      enterPassphrase: '';
    };
    walletSetupOptionsStep: {
      title: '';
      subTitle: '';
      newWallet: {
        title: '';
        description: '';
        button: '';
      };
      hardwareWallet: {
        title: '';
        description: '';
        button: '';
      };
      restoreWallet: {
        title: '';
        description: '';
        button: '';
      };
    };
    walletSetupRegisterStep: {
      title: '';
      titlePassword: '';
      description: '';
      passwordDescription: '';
      walletName: '';
      nameMaxLength: '';
      capitalLetterRequired: '';
      lowercaseLetterRequired: '';
      numberRequired: '';
      charactersRequired: '';
      nameRequired: '';
      password: '';
      confirmPassword: '';
      noMatchPassword: '';
      validationMessage: '';
    };
    walletSetupSelectAccountsStep: {
      selectAccount: '';
      exportKeys: '';
      chooseAccountToExport: '';
      useHWToConfirm: '';
      account: '';
    };
    walletSetupWalletNameStep: {
      maxCharacters: '';
      walletName: '';
      nameYourWallet: '';
      create: '';
      chooseName: '';
    };
    walletSetupWalletModeStep: {
      title: '';
      modes: '';
      instructions: '';
      lightWalletOption: '';
      fullNodeOption: '';
      lightWalletDescription: '';
      fullNodeWalletDescription: '';
    };
    walletSetupRecoveryPhraseLengthStep: {
      title: '';
      description: '';
      wordPassphrase: '';
    };
    password: {
      feedback: {
        '1': '';
        '2': '';
        '3': '';
        '4': '';
        '5': '';
        '6': '';
        '7': '';
        '8': '';
        '9': '';
        '10': '';
        '11': '';
        '12': '';
        '13': '';
        '14': '';
        '15': '';
      };
    };
    receive: {
      usedAddresses: {
        title: '';
        subtitle: '';
        copy: '';
        addressCopied: '';
      };
      showUsedAddresses: '';
    };
  };
  addressesDiscovery: {
    overlay: {
      title: '';
    };
    toast: {
      errorText: '';
      successText: '';
    };
  };
  account: {
    edit: {
      title: '';
      input: {
        label: '';
      };
      footer: {
        save: '';
        cancel: '';
      };
    };
    enable: {
      title: '';
      inMemory: {
        headline: '';
        description: '';
        passwordPlaceholder: '';
        wrongPassword: '';
        cancel: '';
        confirm: '';
      };
      hw: {
        headline: '';
        description: '';
        errorHeadline: '';
        errorDescription: '';
        errorHelpLink: '';
        buttons: {
          waiting: '';
          signing: '';
          cancel: '';
          tryAgain: '';
        };
      };
    };
    disable: {
      title: '';
      description: '';
      cancel: '';
      confirm: '';
    };
  };
  multiWallet: {
    confirmationDialog: {
      title: '';
      description: '';
      cancel: '';
      confirm: '';
    };
    activated: {
      wallet: '';
      account: '';
    };
    popupHwAccountEnable: '';
    walletAlreadyExists: '';
  };
  cookiePolicy: '';
  legal: '';
};

export type TranslationKey = ConstructTranslationKeyUnion<KeysStructure>;

export type Translations = { [key in TranslationKey]: string };
