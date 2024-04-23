export type TranslationsFor<T extends string> = Record<T, string>;

export type TranslationsForJSX<T extends string> = Record<T, string | JSX.Element>;
