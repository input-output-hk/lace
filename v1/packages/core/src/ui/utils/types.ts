export type KeyConfig = {
  stringKey?: string;
  jsxElementKey: string;
};

type NotEmptyKeyOfKeyConfig<Config extends string | KeyConfig, Key extends keyof KeyConfig> = Config extends KeyConfig
  ? Config[Key] extends string
    ? Config[Key]
    : never
  : never;

/*
 * Usage:
 * 1. Union of string param
 * translations: TranslationsFor<'title' | 'subtitle'>
 * Creates:
 * {
 *   title: string;
 *   subtitle: string;
 * }
 *
 * 2. Object param with two string union properties
 * translations: TranslationsFor<{
 *   jsxElementKey: 'description';
 *   stringKey: 'title' | 'subtitle';
 * }>
 * Creates:
 * {
 *   description: JSX.Element;
 *   title: string;
 *   subtitle: string;
 * }
 * */
export type TranslationsFor<KeyOrConfig extends string | KeyConfig> = Record<
  KeyOrConfig extends string ? KeyOrConfig : NotEmptyKeyOfKeyConfig<KeyOrConfig, 'stringKey'>,
  string
> &
  Record<NotEmptyKeyOfKeyConfig<KeyOrConfig, 'jsxElementKey'>, JSX.Element>;
