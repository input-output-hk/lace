import { Staking } from '@lace/staking';
import React, { useEffect } from 'react';
import { useTheme } from '@providers';
import { useFetchCoinPrice } from '@hooks';
import { useWalletStore } from '@stores';
import { ActivityDetail } from '../../activity';
import { Drawer, DrawerNavigation } from '@lace/common';
import { useTranslation } from 'react-i18next';

export const MultiDelegationStaking = (): JSX.Element => {
  const { theme } = useTheme();
  const { priceResult } = useFetchCoinPrice();

  const { blockchainProvider, activityDetail, resetActivityState } = useWalletStore((state) => ({
    blockchainProvider: state.blockchainProvider,
    activityDetail: state.activityDetail,
    resetActivityState: state.resetActivityState
  }));
  const { t } = useTranslation();

  // Reset current transaction details and close drawer if network (blockchainProvider) has changed
  useEffect(() => {
    resetActivityState();
  }, [resetActivityState, blockchainProvider]);

  return (
    <>
      <Staking theme={theme.name} />
      {/*
        Note: Mounting the browser-extension activity details drawer here is just a workaround.
        Ideally, the Drawer/Activity detail should be fully managed within the "Staking" component,
        which contains the respective "Activity" section, but that would require moving/refactoring
        large chunks of code, ATM tightly coupled with browser-extension state/logic,
        to a separate package (core perhaps?).
      */}
      <Drawer
        open={!!activityDetail}
        onClose={resetActivityState}
        navigation={
          <DrawerNavigation
            title={t('transactions.detail.title')}
            onCloseIconClick={() => {
              resetActivityState();
            }}
          />
        }
      >
        {activityDetail && priceResult && <ActivityDetail price={priceResult} />}
      </Drawer>
    </>
  );
};
