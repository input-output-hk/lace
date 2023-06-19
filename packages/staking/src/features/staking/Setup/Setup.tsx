import { ThemeColorScheme, ThemeProvider } from '@lace/ui';
import { PropsWithChildren } from 'react';
import { I18nextProvider } from 'react-i18next';
import { initI18n } from '../../i18n';
import '../reset.css';
import { StakingProps } from '../types';
import { useI18n } from './useI18n';

initI18n();

type SetupProps = PropsWithChildren<StakingProps>;

export const Setup = ({ language, theme, children }: SetupProps) => {
  const { i18n, loading } = useI18n(language);

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
