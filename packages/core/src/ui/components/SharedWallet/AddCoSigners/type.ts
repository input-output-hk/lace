export type CoSigner = {
  id: string;
  name: string;
  keys: string;
};

export enum CoSignerErrorName {
  Duplicated = 'Duplicated',
  Required = 'Required',
  TooLong = 'TooLong'
}

export enum CoSignerErrorKeys {
  Invalid = 'Invalid',
  Required = 'Required'
}

export type CoSignerError = {
  id: string;
  name?: CoSignerErrorName;
  keys?: CoSignerErrorKeys;
};
