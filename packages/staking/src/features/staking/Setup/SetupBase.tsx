import { i18n } from '@lace/translation';
import { ThemeColorScheme, ThemeProvider } from '@lace/ui';
import { Skeleton } from 'antd';
import { PropsWithChildren } from 'react';
import { I18nextProvider } from 'react-i18next';

import { StakingProps } from '../types';

export type SetupBaseProps = Omit<PropsWithChildren<StakingProps>, 'currentChain'> & {
  loading?: boolean;
};

export const SetupBase = ({ loading, theme, children }: SetupBaseProps) => {
  const themeColorScheme = theme === 'light' ? ThemeColorScheme.Light : ThemeColorScheme.Dark;

  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider colorScheme={themeColorScheme}>
        <Skeleton loading={loading || !i18n.isInitialized}>{children}</Skeleton>
      </ThemeProvider>
    </I18nextProvider>
  );
};
