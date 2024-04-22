import React, { useCallback, useEffect } from 'react';
import i18n, { StringMap, TOptions } from 'i18next';
import { useTranslation, setI18n, Trans } from 'react-i18next';
import fallbackInstance from '../lib/i18n';

// If no i18n instance found in context then use the local one
setI18n(fallbackInstance);

export interface UseTranslate {
  t: (key: string | string[], defaultValue?: string, options?: TOptions<StringMap>) => string;
  Trans: typeof Trans;
  i18n: typeof i18n;
}

export const useTranslate = (args: Parameters<typeof useTranslation> = []): UseTranslate => {
  const { i18n: i18nInstance } = useTranslation(...args);

  useEffect(() => {
    fallbackInstance.init();
    if (!i18nInstance?.isInitialized) i18nInstance.init();
  }, [i18nInstance]);

  const t = useCallback(
    (key: string | string[], defaultValue?: string, options?: TOptions<StringMap>) => {
      // If key not found in the current i18n instance tries to find it in the fallback one
      if (!i18nInstance.exists(key, options) && fallbackInstance.exists(key, options)) {
        return fallbackInstance.t(key, defaultValue, options);
      }
      return i18nInstance.t(key, defaultValue, options);
    },
    [i18nInstance]
  );

  return {
    t,
    Trans: ({ children, ...props }) => (
      <Trans {...props} t={t} i18n={i18nInstance}>
        {children}
      </Trans>
    ),
    i18n: i18nInstance
  };
};
