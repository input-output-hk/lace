export type CoSigner = {
  id: string;
  name: string;
  keys: string;
};

export type CoSignerError = {
  id: string;
  name?: 'duplicated' | 'required' | 'tooLong';
  keys?: 'invalid' | 'required';
};
