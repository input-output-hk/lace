import { Box, Text } from '@input-output-hk/lace-ui-toolkit';
import { Activity } from 'features/activity';
import { ExitStakingModal } from 'features/modals/ExitStakingModal';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowsePools } from '../BrowsePools';
import { Drawer } from '../Drawer';
import { ChangingPreferencesModal } from '../modals';
import { useOutsideHandles } from '../outside-handles-provider';
import { Overview } from '../overview';
import { DrawerManagementStep, DrawerStep } from '../store';
import { Navigation } from './Navigation';
import { OneTimeModals } from './OneTimeModals';
import { StakingPage } from './types';

const stepsWithExitConfirmation = new Set<DrawerStep>([
  DrawerManagementStep.Confirmation,
  DrawerManagementStep.Sign,
  DrawerManagementStep.Preferences,
]);

export const StakingView = () => {
  const { t } = useTranslation();
  const { isSharedWallet } = useOutsideHandles();

  const stepsWithBackBtn = useMemo(() => {
    const steps = [!isSharedWallet && DrawerManagementStep.Confirmation, DrawerManagementStep.Sign].filter(
      (el): el is DrawerManagementStep => typeof el === 'string'
    );
    return new Set<DrawerStep>(steps);
  }, [isSharedWallet]);

  return (
    <>
      <Box mb="$56">
        <Text.Heading data-testid="section-title">{t('root.title')}</Text.Heading>
      </Box>
      <Navigation>
        {(activePage) => (
          <>
            {activePage === StakingPage.overview && (
              <Box mt="$40">
                <Overview />
              </Box>
            )}
            {activePage === StakingPage.browsePools && (
              <Box mt="$16">
                <BrowsePools />
              </Box>
            )}
            {activePage === StakingPage.activity && (
              <Box mt="$40">
                <Activity />
              </Box>
            )}
          </>
        )}
      </Navigation>
      <Drawer
        showCloseIcon
        showBackIcon={(step: DrawerStep): boolean => stepsWithBackBtn.has(step)}
        showExitConfirmation={(step: DrawerStep): boolean => stepsWithExitConfirmation.has(step)}
      />
      <ChangingPreferencesModal />
      <ExitStakingModal />
      {!isSharedWallet && <OneTimeModals />}
    </>
  );
};
