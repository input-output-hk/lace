export type CoSigner = {
  id: string;
  name: string;
  sharedWalletKey: string;
};

export type CoSignerDirty = {
  id: string;
  name: boolean;
  sharedWalletKey: boolean;
};

export enum CoSignerErrorName {
  Duplicated = 'Duplicated',
  Required = 'Required',
  TooLong = 'TooLong',
}

export enum CoSignerErrorKeys {
  Duplicated = 'Duplicated',
  Invalid = 'Invalid',
  Required = 'Required',
}

export type CoSignerError = {
  id: string;
  name?: CoSignerErrorName;
  sharedWalletKey?: CoSignerErrorKeys;
};
