import { LocalThemeProvider, ThemeColorScheme } from '@lace/ui';
import { PropsWithChildren } from 'react';
import { I18nextProvider } from 'react-i18next';
import { initI18n } from '../../i18n';
import '../reset.css';
import { getThemeClassName } from '../../theme';
import { StakingProps } from '../types';
import { useI18n } from './useI18n';

initI18n();

export type GeneralProps = PropsWithChildren<StakingProps>;

export const General = ({ language, theme, children }: GeneralProps) => {
  const { i18n, loading } = useI18n(language);

  if (loading) {
    return <>Spinner</>;
  }

  const themeColorScheme = theme === 'light' ? ThemeColorScheme.Light : ThemeColorScheme.Dark;

  return (
    <I18nextProvider i18n={i18n}>
      <LocalThemeProvider colorScheme={themeColorScheme} className={getThemeClassName(themeColorScheme)}>
        {children}
      </LocalThemeProvider>
    </I18nextProvider>
  );
};
