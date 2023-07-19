import { Box, Text } from '@lace/ui';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowsePools } from '../browse-pools';
import { StakePoolDetails } from '../drawer';
import { useOutsideHandles } from '../outside-handles-provider';
import { Overview } from '../overview';
import { Sections, useStakePoolDetails } from '../store';
import { Navigation, Page } from './Navigation';
import { PortfolioBar } from './PortfolioBar';

const stepsWithBackBtn = new Set([Sections.CONFIRMATION, Sections.SIGN]);

const stepsWithExitConfirmation = new Set([Sections.CONFIRMATION, Sections.SIGN, Sections.FAIL_TX]);

export const StakingView = () => {
  const { t } = useTranslation();
  const { setIsDrawerVisible, setSection } = useStakePoolDetails();
  const { walletStoreFetchNetworkInfo: fetchNetworkInfo, walletStoreBlockchainProvider: blockchainProvider } =
    useOutsideHandles();

  useEffect(() => {
    fetchNetworkInfo();
  }, [fetchNetworkInfo, blockchainProvider]);

  const onStake = useCallback(() => {
    // TODO: LW-7396 enable StakeConfirmation modal in the flow in the case of restaking
    // if (isDelegating) {
    //   setStakeConfirmationVisible(true);
    //   return;
    // }

    setSection();
    setIsDrawerVisible(true);
  }, [setIsDrawerVisible, setSection]);

  // TODO: compute real value
  const hasNoFunds = false;

  return (
    <>
      <Box mb={'$56'}>
        <Text.Heading>{t('root.title')}</Text.Heading>
      </Box>
      <Navigation>
        {(activePage) => (
          <Box mt={'$40'}>
            {activePage === Page.overview && <Overview />}
            {activePage === Page.browsePools && <BrowsePools onStake={onStake} />}
          </Box>
        )}
      </Navigation>
      <PortfolioBar onStake={onStake} />
      <StakePoolDetails
        showCloseIcon
        showBackIcon={(section: Sections): boolean => stepsWithBackBtn.has(section)}
        showExitConfirmation={(section: Sections): boolean => stepsWithExitConfirmation.has(section)}
        canDelegate={!hasNoFunds}
        onStake={onStake}
      />
    </>
  );
};
