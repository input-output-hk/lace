import React, { useEffect, useCallback } from 'react';
import { useDrawer } from '@views/browser/stores';
import { useTranslation } from 'react-i18next';
import { DrawerContent } from '@views/browser/components/Drawer';
import { DrawerNavigation, Button } from '@lace/common';
import styles from './SignMessageDrawer.module.scss';

export const useDrawerConfiguration = (): void => {
  const { t } = useTranslation();
  const [, setDrawerConfig] = useDrawer();
  const [, closeDrawer] = useDrawer();

  const renderFooter = useCallback(
    () => (
      <div className={styles.buttonContainer}>
        <Button color="secondary" onClick={() => closeDrawer()}>
          {t('core.signMessage.closeButton')}
        </Button>
      </div>
    ),
    [closeDrawer, t]
  );

  useEffect(() => {
    setDrawerConfig({
      content: DrawerContent.SIGN_MESSAGE,
      renderHeader: () => (
        <DrawerNavigation title={t('core.signMessage.title')} onCloseIconClick={() => closeDrawer()} />
      ),
      renderFooter
    });
  }, [setDrawerConfig, closeDrawer, t, renderFooter]);
};
