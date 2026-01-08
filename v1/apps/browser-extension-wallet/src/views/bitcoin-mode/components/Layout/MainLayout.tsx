import React, { useCallback, useMemo } from 'react';
import debounce from 'lodash/debounce';
import { useTranslation } from 'react-i18next';
import { toast } from '@lace/common';
import { MainFooter, MainHeader } from '../MainMenu';
import styles from './MainLayout.module.scss';
import { SimpleHeader } from '../MainMenu/SimpleHeader';
import { useNetworkError } from '@hooks/useNetworkError';
import { PrivacyPolicyUpdate } from '@components/PrivacyPolicyUpdate/PrivacyPolicyUpdate';

interface MainLayoutProps {
  children: React.ReactNode;
  useSimpleHeader?: boolean;
  hideFooter?: boolean;
}

const toastThrottle = 500;

export const extensionScrollableContainerID = 'extensionScrollable';

// TODO: fix styles. with html tag the coin and activity list disappear,
//       same if the children is wrapped with ion-content.
//       the fragment fix this but is positioning everything at the bottom.
//       redo with antd
export const MainLayout = ({ children, useSimpleHeader = false, hideFooter }: MainLayoutProps): React.ReactElement => {
  const { t } = useTranslation();

  const debouncedToast = useMemo(() => debounce(toast.notify, toastThrottle), []);
  const showNetworkError = useCallback(
    () => debouncedToast({ text: t('general.errors.networkError') }),
    [debouncedToast, t]
  );

  useNetworkError(showNetworkError);

  return (
    <div className={styles.layoutContainer}>
      <div className={styles.layoutContent}>
        <div className={styles.contentWrapper}>
          {useSimpleHeader ? <SimpleHeader /> : <MainHeader />}
          <div id={extensionScrollableContainerID} className={styles.content}>
            {children}
          </div>
        </div>
      </div>
      <PrivacyPolicyUpdate />
      {!hideFooter && <MainFooter />}
    </div>
  );
};
