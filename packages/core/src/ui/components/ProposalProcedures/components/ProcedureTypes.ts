export interface Procedure {
  deposit: string;
  rewardAccount: string;
  anchor?: {
    url: string;
    hash: string;
    txHashUrl: string;
  };
}

export interface Translations {
  title: string;
  deposit: string;
  rewardAccount: string;
  anchor: {
    url: string;
    hash: string;
  };
}
