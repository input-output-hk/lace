export type KeyConfig = {
  stringKey?: string;
  jsxElementKey: string;
};

export type TranslationsFor<Key extends string | KeyConfig> = Record<
  Key extends string
    ? Key
    : Key extends KeyConfig
    ? Key['stringKey'] extends string
      ? Key['stringKey']
      : never
    : never,
  string
> &
  Record<Key extends KeyConfig ? Key['jsxElementKey'] : never, JSX.Element>;
