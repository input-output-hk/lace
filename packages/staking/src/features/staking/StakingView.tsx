import { Box, Text } from '@lace/ui';
import { Activity } from 'features/activity';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowsePools } from '../BrowsePools';
import { Drawer } from '../Drawer';
import { ChangingPreferencesModal } from '../modals';
import { useOutsideHandles } from '../outside-handles-provider';
import { Overview } from '../overview';
import { DrawerManagementStep, DrawerStep, useDelegationPortfolioStore } from '../store';
import { Navigation, Page } from './Navigation';
import { OneTimeModals } from './OneTimeModals';

const stepsWithBackBtn = new Set<DrawerStep>([DrawerManagementStep.Confirmation, DrawerManagementStep.Sign]);

export const StakingView = () => {
  const { t } = useTranslation();
  const { portfolioMutators } = useDelegationPortfolioStore((store) => ({
    portfolioMutators: store.mutators,
  }));
  const {
    walletStoreFetchNetworkInfo: fetchNetworkInfo,
    walletStoreBlockchainProvider: blockchainProvider,
    currentChain,
  } = useOutsideHandles();

  useEffect(() => {
    fetchNetworkInfo();
  }, [fetchNetworkInfo, blockchainProvider]);

  useEffect(() => {
    if (!currentChain) return;
    portfolioMutators.forceAbortFlows();
  }, [currentChain, portfolioMutators]);

  return (
    <>
      <Box mb="$56">
        <Text.Heading data-testid="section-title">{t('root.title')}</Text.Heading>
      </Box>
      <Navigation>
        {(activePage) => (
          <Box mt="$40">
            {activePage === Page.overview && <Overview />}
            {activePage === Page.browsePools && <BrowsePools />}
            {activePage === Page.activity && <Activity />}
          </Box>
        )}
      </Navigation>
      <Drawer showCloseIcon showBackIcon={(step: DrawerStep): boolean => stepsWithBackBtn.has(step)} />
      <ChangingPreferencesModal />
      <OneTimeModals />
    </>
  );
};
