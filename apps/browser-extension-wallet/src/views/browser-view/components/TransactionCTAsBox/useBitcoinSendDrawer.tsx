import React, { useCallback } from 'react';
import { DrawerContent } from '@src/views/browser-view/components/Drawer/DrawerUIContent';
import { useDrawer } from '@views/browser/stores';
import { DrawerNavigation } from '@lace/common';
import { useTranslation } from 'react-i18next';

export const useBitcoinSendDrawer = (): (() => void) => {
  const { t } = useTranslation();
  const [config, setDrawerConfig] = useDrawer();

  const handleReceiveCloseIconClick = useCallback(() => {
    const onClose = config?.onClose || (() => setDrawerConfig());
    onClose();
  }, [config?.onClose, setDrawerConfig]);

  return useCallback(() => {
    setDrawerConfig({
      content: DrawerContent.SEND_BITCOIN_TRANSACTION,
      renderHeader: () => (
        <DrawerNavigation
          title={<div>{t('browserView.transaction.send.title')}</div>}
          onCloseIconClick={handleReceiveCloseIconClick}
        />
      )
    });
  }, [handleReceiveCloseIconClick, setDrawerConfig, t]);
};
