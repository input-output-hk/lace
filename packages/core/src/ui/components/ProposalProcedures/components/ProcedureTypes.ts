export interface Procedure {
  anchor?: {
    url: string;
    hash: string;
    txHashUrl: string;
  };
  governanceAction?: {
    id: string;
    index: string;
  };
}

export interface Translations {
  title: string;
  anchor: {
    url: string;
    hash: string;
  };
  governanceAction?: {
    id: string;
    index: string;
  };
}
