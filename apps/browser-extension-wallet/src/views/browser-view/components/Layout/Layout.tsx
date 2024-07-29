/* eslint-disable react/no-multi-comp */
import React, { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import classnames from 'classnames';
import debounce from 'lodash/debounce';
import { toast } from '@lace/common';
import { useBackgroundServiceAPIContext } from '@providers/BackgroundServiceAPI';
import { useTheme } from '@providers/ThemeProvider';
import { BrowserViewSections, ChangeThemeData, Message, MessageTypes } from '@lib/scripts/types';
import { DrawerContent, DrawerUIContainer } from '../Drawer';
import { useNetworkError } from '@hooks/useNetworkError';
import { LeftSidePanel } from '../LeftSidePanel';
import styles from './Layout.module.scss';
import { PinExtension } from '@views/browser/features/wallet-setup/components/PinExtension';
import { useLocalStorage } from '@hooks';
import { useWalletStore } from '@stores';
import { useOpenTransactionDrawer } from '@views/browser/features/send-transaction';

interface LayoutProps {
  children: React.ReactNode;
  isFullWidth?: boolean;
  drawerUIDefaultContent?: DrawerContent;
}

const toastThrottle = 500;
const isFlexible = process.env.USE_DESKTOP_LAYOUT === 'true';
const PIN_EXTENSION_TIMEOUT = 5000;

export const Layout = ({ children, drawerUIDefaultContent, isFullWidth }: LayoutProps): React.ReactElement => {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const backgroundServices = useBackgroundServiceAPIContext();
  const { walletState } = useWalletStore();
  const openTransactionDrawer = useOpenTransactionDrawer({
    content: DrawerContent.SEND_TRANSACTION,
    config: { options: { isAdvancedFlow: true } }
  });

  const [showPinExtension, { updateLocalStorage: setShowPinExtension }] = useLocalStorage('showPinExtension', true);
  const [showMultiAddressModal] = useLocalStorage('showMultiAddressModal', true);

  useEffect(() => {
    const openDrawer = async () => {
      const backgroundStorage = await backgroundServices.getBackgroundStorage();
      if (!backgroundStorage) return;
      if (
        backgroundStorage.message?.type === MessageTypes.OPEN_BROWSER_VIEW &&
        backgroundStorage.message?.data.section === BrowserViewSections.SEND_ADVANCED
      ) {
        await backgroundServices.clearBackgroundStorage({ keys: ['message'] });
        openTransactionDrawer();
      }
    };
    openDrawer();
  }, [backgroundServices, openTransactionDrawer]);

  useEffect(() => {
    const subscription = backgroundServices.requestMessage$?.subscribe(({ type, data }: Message): void => {
      if (type === MessageTypes.CHANGE_THEME) setTheme((data as ChangeThemeData).theme);
    });
    return () => subscription.unsubscribe();
  }, [backgroundServices, setTheme]);

  useEffect(() => {
    if (showMultiAddressModal && walletState.addresses.length > 1) return;

    const timer = window.setTimeout(() => {
      setShowPinExtension(false);
    }, PIN_EXTENSION_TIMEOUT);

    // eslint-disable-next-line consistent-return
    return () => window.clearTimeout(timer);
  }, [setShowPinExtension, showMultiAddressModal, walletState.addresses.length]);

  const debouncedToast = useMemo(() => debounce(toast.notify, toastThrottle), []);
  const showNetworkError = useCallback(
    () => debouncedToast({ text: t('general.errors.networkError') }),
    [debouncedToast, t]
  );

  useNetworkError(showNetworkError);

  return (
    <div
      id="main"
      className={classnames(styles.layoutGridContainer, isFullWidth && styles.fullWidth, isFlexible && styles.flexible)}
    >
      <LeftSidePanel theme={theme.name} />
      {showPinExtension && (
        <div className={styles.pinExtension}>
          <PinExtension />
        </div>
      )}
      {children}
      <DrawerUIContainer defaultContent={drawerUIDefaultContent} />
    </div>
  );
};
