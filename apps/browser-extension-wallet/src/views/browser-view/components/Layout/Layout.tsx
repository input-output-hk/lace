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
import { useOpenReceiveDrawer } from '../TransactionCTAsBox/useOpenReceiveDrawer';
import { useBitcoinSendDrawer } from '../TransactionCTAsBox/useBitcoinSendDrawer';
import { useCurrentBlockchain, Blockchain } from '@src/multichain';

interface LayoutProps {
  children: React.ReactNode;
  noAside?: boolean;
  drawerUIDefaultContent?: DrawerContent;
}

const toastThrottle = 500;
const PIN_EXTENSION_TIMEOUT = 5000;

export const Layout = ({ children, drawerUIDefaultContent, noAside = false }: LayoutProps): React.ReactElement => {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const backgroundServices = useBackgroundServiceAPIContext();
  const { walletState } = useWalletStore();
  const openReceiveDrawer = useOpenReceiveDrawer();
  const { blockchain } = useCurrentBlockchain();

  const cardanoDrawer = useOpenTransactionDrawer({
    content: DrawerContent.SEND_TRANSACTION,
    config: { options: { isAdvancedFlow: true } }
  });
  const bitcoinDrawer = useBitcoinSendDrawer();

  const openTransactionDrawer = blockchain === Blockchain.Cardano ? cardanoDrawer : bitcoinDrawer;

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
        console.error('Pening tx send');
        await backgroundServices.clearBackgroundStorage({ keys: ['message'] });
        openTransactionDrawer();
      }
      if (
        backgroundStorage.message?.type === MessageTypes.OPEN_BROWSER_VIEW &&
        backgroundStorage.message?.data.section === BrowserViewSections.RECEIVE_ADVANCED
      ) {
        await backgroundServices.clearBackgroundStorage({ keys: ['message'] });
        openReceiveDrawer();
      }
    };
    openDrawer();
  }, [backgroundServices, openReceiveDrawer, openTransactionDrawer]);

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
      className={classnames(styles.layoutGridContainer, !noAside && styles.withAside, noAside && styles.noAside)}
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
