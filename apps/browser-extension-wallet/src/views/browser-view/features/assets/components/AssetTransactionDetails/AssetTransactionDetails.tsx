import React from 'react';
import { Drawer, DrawerNavigation } from '@lace/common';
import { TransactionDetail } from '@views/browser/features/activity';
import { APP_MODE_POPUP, AppMode } from '@src/utils/constants';
import { useWalletStore } from '@src/stores';
import { useFetchCoinPrice } from '@hooks/useFetchCoinPrice';

export interface AssetTransactionDetailsProps {
  afterVisibleChange: (visible: boolean) => void;
  appMode: AppMode;
  onBack: () => void;
  onClose: () => void;
  isVisible?: boolean;
}

export const AssetTransactionDetails = ({
  afterVisibleChange,
  appMode,
  onBack,
  onClose,
  isVisible
}: AssetTransactionDetailsProps): React.ReactElement => {
  const { priceResult } = useFetchCoinPrice();
  const { transactionDetail } = useWalletStore();

  return (
    <Drawer
      afterOpenChange={afterVisibleChange}
      open={isVisible}
      onClose={onClose}
      navigation={<DrawerNavigation onCloseIconClick={onClose} onArrowIconClick={onBack} />}
      popupView={appMode === APP_MODE_POPUP}
    >
      {transactionDetail && priceResult && <TransactionDetail price={priceResult} />}
    </Drawer>
  );
};
