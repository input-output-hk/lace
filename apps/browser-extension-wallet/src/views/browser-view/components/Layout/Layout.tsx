/* eslint-disable react/no-multi-comp */
import React, { useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import classnames from 'classnames';
import debounce from 'lodash/debounce';
import { toast } from '@lace/common';
import { useBackgroundServiceAPIContext } from '@providers/BackgroundServiceAPI';
import { useTheme } from '@providers/ThemeProvider';
import { BrowserViewSections, ChangeThemeData, Message, MessageTypes } from '@lib/scripts/types';
import { useDrawer } from '../../stores';
import { DrawerContent, DrawerUIContainer } from '../Drawer';
import { useNetworkError } from '@hooks/useNetworkError';
import { LeftSidePanel } from '../LeftSidePanel';
import styles from './Layout.module.scss';

interface LayoutProps {
  children: React.ReactNode;
  isFullWidth?: boolean;
  drawerUIDefaultContent?: DrawerContent;
}

const toastThrottle = 500;
const isFlexible = process.env.USE_DESKTOP_LAYOUT === 'true';

export const Layout = ({ children, drawerUIDefaultContent, isFullWidth }: LayoutProps): React.ReactElement => {
  const { t } = useTranslation();
  const [, setDrawerConfig] = useDrawer();
  const { theme, setTheme } = useTheme();
  const backgroundServices = useBackgroundServiceAPIContext();

  useEffect(() => {
    const openDrawer = async () => {
      const backgroundStorage = await backgroundServices.getBackgroundStorage();
      if (!backgroundStorage) return;
      if (
        backgroundStorage.message?.type === MessageTypes.OPEN_BROWSER_VIEW &&
        backgroundStorage.message?.data.section === BrowserViewSections.SEND_ADVANCED
      ) {
        await backgroundServices.clearBackgroundStorage(['message']);
        setDrawerConfig({ content: DrawerContent.SEND_TRANSACTION, options: { isAdvancedFlow: true } });
      }
    };
    openDrawer();
  }, [backgroundServices, setDrawerConfig]);

  useEffect(() => {
    const subscription = backgroundServices.requestMessage$?.subscribe(({ type, data }: Message): void => {
      if (type === MessageTypes.CHANGE_THEME) setTheme((data as ChangeThemeData).theme);
    });
    return () => subscription.unsubscribe();
  }, [backgroundServices, setTheme]);

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
      {children}
      <DrawerUIContainer defaultContent={drawerUIDefaultContent} />
    </div>
  );
};
