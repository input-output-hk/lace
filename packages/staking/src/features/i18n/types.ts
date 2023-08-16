type RecursiveStructure = { [key: string]: '' | RecursiveStructure };

export type ConstructTranslationKeyUnion<T extends RecursiveStructure, K extends keyof T = keyof T> = K extends string
  ? T[K] extends ''
    ? K
    : T[K] extends RecursiveStructure
    ? `${K}.${ConstructTranslationKeyUnion<T[K]>}`
    : never
  : never;

type KeysStructure = {
  general: {
    button: {
      confirm: '';
      close: '';
    };
  };
  browsePools: {
    stakePoolTableBrowser: {
      searchInputPlaceholder: '';
      tableHeader: {
        poolName: '';
        ros: '';
        cost: '';
        saturation: '';
      };
      emptyMessage: '';
      stake: '';
      unselect: '';
      addPool: '';
    };
  };
  drawer: {
    title: '';
    titleSecond: '';
    sign: {
      confirmation: {
        title: '';
      };
      passwordPlaceholder: '';
      enterWalletPasswordToConfirmTransaction: '';
      error: {
        invalidPassword: '';
      };
    };
    success: {
      title: '';
      subTitle: '';
      switchedPools: {
        title: '';
        subTitle: '';
      };
    };
    failure: {
      title: '';
      subTitle: '';
      button: {
        close: '';
        back: '';
        retry: '';
      };
    };
    details: {
      metrics: {
        activeStake: '';
        apy: '';
        delegators: '';
        saturation: '';
      };
      status: {
        delegating: '';
        retired: '';
        retiring: '';
        saturated: '';
      };
      switchingPoolBanner: {
        title: '';
        description: {
          step1: '';
          step2: '';
          step3: '';
        };
      };
      stakeOnPoolButton: '';
      statistics: '';
      information: '';
      social: '';
      poolIds: '';
      owners: '';
    };
    confirmation: {
      title: '';
      subTitle: '';
      cardanoName: '';
      totalCost: {
        title: '';
      };
      theAmountYoullBeChargedForRegisteringYourStakeKey: '';
      stakingDeposit: '';
      errors: {
        utxoFullyDepleted: '';
        utxoBalanceInsufficient: '';
      };
      transactionFee: '';
      theAmountYoullBeChargedToProcessYourTransaction: '';
      button: {
        continueInAdvancedView: '';
        confirmWithDevice: '';
        signing: '';
        confirm: '';
      };
    };
    preferences: {
      selectedStakePools: '';
      partOfBalance: '';
      pickMorePools: '';
    };
  };
  modals: {
    changingPreferences: {
      title: '';
      description: '';
      buttons: {
        cancel: '';
        confirm: '';
      };
    };
    beta: {
      pill: '';
      title: '';
      description: '';
      button: '';
    };
  };
  overview: {
    delegationCard: {
      label: {
        status: '';
        balance: '';
        pools: '';
      };
      statuses: {
        multiDelegation: '';
        overStaked: '';
        ready: '';
        simpleDelegation: '';
        underStaked: '';
      };
    };
    stakingInfoCard: {
      fee: '';
      margin: '';
      lastReward: '';
      ros: '';
      totalRewards: '';
      totalStaked: '';
      poolRetired: '';
      poolSaturated: '';
      tooltipFiatLabel: '';
    };
    yourPoolsSection: {
      heading: '';
      manageButtonLabel: '';
    };
  };
  root: {
    title: '';
    nav: {
      browsePoolsTitle: '';
      title: '';
      overviewTitle: '';
    };
  };
  portfolioBar: {
    selectedPools: '';
    maxPools: '';
    clear: '';
    next: '';
  };
  popup: {
    expandBanner: {
      button: '';
      description: '';
      title: '';
    };
  };
};

export type TranslationKey = ConstructTranslationKeyUnion<KeysStructure>;

export type Translations = { [key in TranslationKey]: string };
