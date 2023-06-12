import { Language } from '@lace/common';
import { ThemeColorScheme, ThemeProvider } from '@lace/ui';
import { PropsWithChildren, useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { changeLanguage, getI18n, initI18n } from '../i18n';
import './reset.css';
import { StakingProps } from './types';

initI18n();

type SetupProps = PropsWithChildren<StakingProps>;

export const Setup = ({ language = Language.en, theme, children }: SetupProps) => {
  const [loading, setLoading] = useState(false);
  const i18n = getI18n();

  useEffect(() => {
    (async () => {
      if (i18n.language === language) return;
      setLoading(true);
      await changeLanguage(language);
      setLoading(false);
    })();
  }, [i18n.language, language]);

  if (loading) {
    return <>Spinner</>;
  }

  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider colorScheme={theme === 'light' ? ThemeColorScheme.Light : ThemeColorScheme.Dark}>
        {children}
      </ThemeProvider>
    </I18nextProvider>
  );
};
