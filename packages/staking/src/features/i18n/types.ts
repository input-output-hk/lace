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
};

export type TranslationKey = ConstructTranslationKeyUnion<KeysStructure>;

export type Translations = { [key in TranslationKey]: string };
