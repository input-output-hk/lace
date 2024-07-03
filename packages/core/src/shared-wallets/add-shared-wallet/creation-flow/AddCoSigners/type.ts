export type CoSigner = {
  id: string;
  keys: string;
  name: string;
};

export type CoSignerDirty = {
  id: string;
  keys: boolean;
  name: boolean;
};

export enum CoSignerErrorName {
  Duplicated = 'Duplicated',
  Required = 'Required',
  TooLong = 'TooLong',
}

export enum CoSignerErrorKeys {
  Invalid = 'Invalid',
  Required = 'Required',
}

export type CoSignerError = {
  id: string;
  keys?: CoSignerErrorKeys;
  name?: CoSignerErrorName;
};
