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
  activity: {
    rewardsHistory: {
      title: '';
      noStakingActivityYet: '';
    };
    rewardsChart: {
      title: '';
      epochs: '';
      epoch: '';
      last: '';
      all: '';
      rewards: '';
    };
  };
  browsePools: {
    header: {
      poolsCount: '';
    };
    stakePoolGrid: {
      selected: '';
      notAvailable: '';
    };
    stakePoolTableBrowser: {
      sortAndFilter: {
        input: {
          from: '';
          to: '';
          select: '';
        };
        headers: {
          sorting: '';
          filters: '';
          moreOptions: '';
        };
      };
      sortByTitle: {
        ticker: '';
        saturation: '';
        ros: {
          title: '';
          lastEpoch: '';
          other: '';
        };
        cost: '';
        margin: '';
        blocks: '';
        pledge: '';
        livestake: '';
        profitMargin: '';
        performance: '';
      };
      searchInputPlaceholder: '';
      tableHeader: {
        ticker: {
          title: '';
          tooltip: '';
        };
        apy: {
          title: '';
          tooltip: '';
        };
        cost: {
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
      emptyMessage: '';
      stake: '';
      unselect: '';
      addPool: '';
      disabledTooltip: '';
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
      modification: { title: '' };
    };
    failure: {
      title: '';
      subTitle: '';
      button: {
        close: '';
        back: '';
        retry: '';
        cancel: '';
        removePools: '';
      };
      deviceUpdate: {
        title: '';
        subTitle: '';
      };
    };
    details: {
      metrics: {
        activeStake: '';
        liveStake: '';
        apy: '';
        delegators: '';
        saturation: '';
        blocks: '';
        cost: '';
        pledge: '';
        margin: '';
      };
      status: {
        delegating: '';
        retired: '';
        retiring: '';
        saturated: '';
      };
      stakeOnPoolButton: '';
      selectForMultiStaking: '';
      addStakingPool: '';
      unselectPool: '';
      manageDelegation: '';
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
      noPools: '';
      transactionCost: {
        title: '';
      };
      transactionReturn: {
        title: '';
      };
      transactionTotal: {
        title: '';
      };
      chargedDepositAmountInfo: '';
      reclaimDepositAmountInfo: '';
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
      browsePools: '';
      selectedStakePools: '';
      noSelectedPools: '';
      addPoolButton: '';
      pickMorePools: '';
      confirmButton: '';
      rebalanceButton: '';
      removePoolButton: '';
      ctaButtonTooltip: {
        zeroPercentageSliderError: '';
        invalidAllocation: '';
      };
      poolDetails: {
        savedRatio: '';
        savedRatioTooltip: '';
        actualRatio: '';
        actualRatioTooltip: '';
        actualStake: '';
        actualStakeTooltip: '';
      };
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
      portfolioPersistence: {
        title: '';
        description: '';
      };
    };
    poolsManagement: {
      title: '';
      buttons: {
        cancel: '';
        confirm: '';
      };
      description: {
        reduction: '';
        adjustment: '';
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
        overAllocated: '';
        noSelection: '';
        simpleDelegation: '';
        underAllocated: '';
      };
    };
    banners: {
      pendingFirstDelegation: {
        title: '';
        message: '';
      };
      pendingPortfolioModification: {
        title: '';
        message: '';
      };
      portfolioDrifted: {
        title: '';
        message: '';
      };
      saturatedOrRetiredPool: {
        title: '';
        message: '';
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
      poolRetiring: '';
      poolSaturated: '';
      tooltipFiatLabel: '';
    };
    yourPoolsSection: {
      heading: '';
      manageButtonLabel: '';
    };
    noFunds: {
      title: '';
      description: '';
      button: '';
    };
    noStaking: {
      title: '';
      description: '';
      balanceTitle: '';
      getStarted: '';
      followSteps: '';
      searchForPoolDescription: '';
      searchForPoolTitle: '';
      selectPoolsDescription: '';
      selectPoolsTitle: '';
    };
  };
  root: {
    title: '';
    nav: {
      activityTitle: '';
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
