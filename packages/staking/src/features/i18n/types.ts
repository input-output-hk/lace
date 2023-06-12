type RecursiveStructure = { [key: string]: '' | RecursiveStructure };

export type ConstructTranslationKeyUnion<T extends RecursiveStructure, K extends keyof T = keyof T> = K extends string
  ? T[K] extends ''
    ? K
    : T[K] extends RecursiveStructure
    ? // @ts-expect-error TS complains in the version we use but besides that it works as intended
      `${K}.${ConstructTranslationKeyUnion<T[K]>}`
    : never
  : never;

type KeysStructure = {
  overview: {
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
