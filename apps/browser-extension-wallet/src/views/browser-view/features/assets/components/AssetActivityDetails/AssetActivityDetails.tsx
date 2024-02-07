import React from 'react';
import { Drawer, DrawerNavigation } from '@lace/common';
import { ActivityDetail } from '@views/browser/features/activity';
import { APP_MODE_POPUP, AppMode } from '@src/utils/constants';
import { useWalletStore } from '@src/stores';
import { useFetchCoinPrice } from '@hooks/useFetchCoinPrice';

export interface AssetActivityDetailsProps {
  afterOpenChange: (visible: boolean) => void;
  appMode: AppMode;
  onBack: () => void;
  onClose: () => void;
  isVisible?: boolean;
}

export const AssetActivityDetails = ({
  afterOpenChange,
  appMode,
  onBack,
  onClose,
  isVisible
}: AssetActivityDetailsProps): React.ReactElement => {
  const { priceResult } = useFetchCoinPrice();
  const { activityDetail } = useWalletStore();

  return (
    <Drawer
      afterOpenChange={afterOpenChange}
      open={isVisible}
      onClose={onClose}
      navigation={<DrawerNavigation onCloseIconClick={onClose} onArrowIconClick={onBack} />}
      popupView={appMode === APP_MODE_POPUP}
    >
      {activityDetail && priceResult && <ActivityDetail price={priceResult} />}
    </Drawer>
  );
};
