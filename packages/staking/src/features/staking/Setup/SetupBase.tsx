import { ThemeColorScheme, ThemeProvider } from '@lace/ui';
import { Skeleton } from 'antd';
import { PropsWithChildren } from 'react';
import { I18nextProvider } from 'react-i18next';
import { initI18n } from '../../i18n';
import { StakingProps } from '../types';
import { useI18n } from './useI18n';
import 'features/theme';

initI18n();

export type SetupBaseProps = Omit<PropsWithChildren<StakingProps>, 'currentChain'> & {
  loading?: boolean;
};

export const SetupBase = ({ language, loading, theme, children }: SetupBaseProps) => {
  const i18n = useI18n(language);
  const themeColorScheme = theme === 'light' ? ThemeColorScheme.Light : ThemeColorScheme.Dark;

  return (
    <I18nextProvider i18n={i18n.i18n}>
      <ThemeProvider colorScheme={themeColorScheme}>
        <Skeleton loading={loading || i18n.loading}>{children}</Skeleton>
      </ThemeProvider>
    </I18nextProvider>
  );
};
