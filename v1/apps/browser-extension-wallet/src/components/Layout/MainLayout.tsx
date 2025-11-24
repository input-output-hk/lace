import React, { useCallback, useEffect, useMemo, useState } from 'react';
import debounce from 'lodash/debounce';
import { useTranslation } from 'react-i18next';
import { toast } from '@lace/common';
import { MainFooter, MainHeader } from '../MainMenu';
import styles from './MainLayout.module.scss';
import { SimpleHeader } from '../MainMenu/SimpleHeader';
import { useNetworkError } from '@hooks/useNetworkError';
import { Announcement } from '@components/Announcement/Announcement';
import { storage } from 'webextension-polyfill';
import { ABOUT_EXTENSION_KEY, ExtensionUpdateData } from '@lib/scripts/types';
import { PrivacyPolicyUpdate } from '../PrivacyPolicyUpdate/PrivacyPolicyUpdate';

interface MainLayoutProps {
  children: React.ReactNode;
  useSimpleHeader?: boolean;
  hideFooter?: boolean;
  showAnnouncement?: boolean;
  showBetaPill?: boolean;
}

const toastThrottle = 500;

export const extensionScrollableContainerID = 'extensionScrollable';

// TODO: fix styles. with html tag the coin and activity list disappear,
//       same if the children is wrapped with ion-content.
//       the fragment fix this but is positioning everything at the bottom.
//       redo with antd
export const MainLayout = ({
  children,
  useSimpleHeader = false,
  hideFooter,
  showAnnouncement = true,
  showBetaPill = false
}: MainLayoutProps): React.ReactElement => {
  const { t } = useTranslation();
  const [aboutExtension, setAboutExtension] = useState({} as ExtensionUpdateData);
  const { version, acknowledged, reason } = aboutExtension;

  const debouncedToast = useMemo(() => debounce(toast.notify, toastThrottle), []);
  const showNetworkError = useCallback(
    () => debouncedToast({ text: t('general.errors.networkError') }),
    [debouncedToast, t]
  );

  useNetworkError(showNetworkError);

  const getAboutExtensionData = useCallback(async () => {
    const data = await storage.local.get(ABOUT_EXTENSION_KEY);
    setAboutExtension(data?.[ABOUT_EXTENSION_KEY] || {});
  }, []);

  useEffect(() => {
    getAboutExtensionData();
  }, [getAboutExtensionData]);

  const onUpdateAcknowledge = useCallback(async () => {
    const data = { version, acknowledged: true, reason };
    await storage.local.set({
      [ABOUT_EXTENSION_KEY]: data
    });
    setAboutExtension(data);
  }, [reason, version]);

  return (
    <div className={styles.layoutContainer}>
      <div className={styles.layoutContent}>
        <div className={styles.contentWrapper}>
          {useSimpleHeader ? <SimpleHeader beta={showBetaPill} /> : <MainHeader />}
          <div id={extensionScrollableContainerID} className={styles.content}>
            {children}
          </div>
        </div>
      </div>
      <Announcement
        visible={showAnnouncement && version && !acknowledged}
        onConfirm={onUpdateAcknowledge}
        version={version}
        reason={reason}
      />
      <PrivacyPolicyUpdate />
      {!hideFooter && <MainFooter />}
    </div>
  );
};
