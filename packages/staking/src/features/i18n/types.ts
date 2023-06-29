type RecursiveStructure = { [key: string]: '' | RecursiveStructure };

export type ConstructTranslationKeyUnion<T extends RecursiveStructure, K extends keyof T = keyof T> = K extends string
  ? T[K] extends ''
    ? K
    : T[K] extends RecursiveStructure
    ? `${K}.${ConstructTranslationKeyUnion<T[K]>}`
    : never
  : never;

type KeysStructure = {
  browsePools: {
    stakePoolTableBrowser: {
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
  };
  overview: {
    delegationCard: {
      status: '';
      balance: '';
      pools: '';
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
};

export type TranslationKey = ConstructTranslationKeyUnion<KeysStructure>;

export type Translations = { [key in TranslationKey]: string };
