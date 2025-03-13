/* eslint-disable react/no-multi-comp */
import React, { useCallback } from 'react';
import { DrawerContent } from '@src/views/browser-view/components/Drawer/DrawerUIContent';
import { useDrawer } from '@views/browser/stores';
import { DrawerNavigation } from '@lace/common';
import { useTranslation } from 'react-i18next';

export const useBitcoinSendDrawer = (): (() => void) => {
  const [config, setDrawerConfig] = useDrawer();
  const { t } = useTranslation();

  const handleReceiveCloseIconClick = useCallback(() => {
    const onClose = config?.onClose || (() => setDrawerConfig());
    onClose();
  }, [config?.onClose, setDrawerConfig]);

  return useCallback(() => {
    setDrawerConfig({
      content: DrawerContent.SEND_BITCOIN_TRANSACTION,
      renderHeader: () => (
        <DrawerNavigation
          title={<div>Send</div>}
          onCloseIconClick={handleReceiveCloseIconClick}
        />
      )
    });
  }, [handleReceiveCloseIconClick, setDrawerConfig, t]);
};
