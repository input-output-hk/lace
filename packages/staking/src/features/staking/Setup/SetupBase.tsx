import { ThemeColorScheme, ThemeProvider } from '@input-output-hk/lace-ui-toolkit';
import { i18n } from '@lace/translation';
import { Skeleton } from 'antd';
import { PropsWithChildren, Suspense } from 'react';
import { I18nextProvider } from 'react-i18next';

import { StakingProps } from '../types';

export type SetupBaseProps = Omit<PropsWithChildren<StakingProps>, 'currentChain'> & {
  loading?: boolean;
};

export const SetupBase = ({ loading, theme, children }: SetupBaseProps) => {
  const themeColorScheme = theme === 'light' ? ThemeColorScheme.Light : ThemeColorScheme.Dark;

  return (
    <Suspense fallback={<Skeleton />}>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider colorScheme={themeColorScheme}>
          <Skeleton loading={loading}>{children}</Skeleton>
        </ThemeProvider>
      </I18nextProvider>
    </Suspense>
  );
};
