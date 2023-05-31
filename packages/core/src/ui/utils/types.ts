export type TranslationsFor<T extends string> = Record<T, string>;

export type AssetActivityTranslationType = TranslationsFor<
  | 'asset'
  | 'token'
  | 'delegation'
  | 'delegationDeregistration'
  | 'delegationRegistration'
  | 'rewards'
  | 'incoming'
  | 'outgoing'
  | 'sending'
  | 'self'
>;
