import { ThemeColorScheme, ThemeProvider } from '@lace/ui';
import { PropsWithChildren } from 'react';
import { I18nextProvider } from 'react-i18next';
import { initI18n } from '../../i18n';
import { StakingProps } from '../types';
import { useI18n } from './useI18n';

initI18n();

export type SetupBaseProps = PropsWithChildren<StakingProps>;

export const SetupBase = ({ language, theme, children }: SetupBaseProps) => {
  const { i18n, loading } = useI18n(language);

  if (loading) {
    return <>Spinner</>;
  }

  const themeColorScheme = theme === 'light' ? ThemeColorScheme.Light : ThemeColorScheme.Dark;

  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider colorScheme={themeColorScheme}>{children}</ThemeProvider>
    </I18nextProvider>
  );
};
