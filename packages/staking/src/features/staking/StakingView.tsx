import { Wallet } from '@lace/cardano';
import { Box, Text } from '@lace/ui';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowsePools } from '../browse-pools';
import { StakePoolDetails } from '../drawer';
import { ChangingPreferencesModal, MultidelegationBetaModal } from '../modals';
import { useOutsideHandles } from '../outside-handles-provider';
import { Overview } from '../overview';
import { Page, Sections, useDelegationPortfolioStore, useStakePoolDetails } from '../store';
import { Navigation } from './Navigation';

const stepsWithBackBtn = new Set([Sections.CONFIRMATION, Sections.SIGN]);

// TODO: enable exit confirmation. Legacy implementation had it for: Sections.CONFIRMATION, Sections.SIGN, Sections.FAIL_TX
const stepsWithExitConfirmation = new Set<Sections>([]);

export const StakingView = () => {
  const { t } = useTranslation();
  const [pendingSelection, setPendingSelection] = useState(false);
  const { setIsDrawerVisible, setSection, setStakeConfirmationVisible } = useStakePoolDetails();
  const { currentPortfolio, portfolioMutators } = useDelegationPortfolioStore((state) => ({
    currentPortfolio: state.currentPortfolio,
    portfolioMutators: state.mutators,
  }));
  const {
    delegationStoreSelectedStakePoolDetails: openPoolDetails,
    delegationStoreSelectedStakePool: openPool,
    walletStoreWalletUICardanoCoin,
    walletStoreFetchNetworkInfo: fetchNetworkInfo,
    walletStoreBlockchainProvider: blockchainProvider,
    multidelegationFirstVisit,
    triggerMultidelegationFirstVisit,
    currentChain,
  } = useOutsideHandles();

  useEffect(() => {
    fetchNetworkInfo();
  }, [fetchNetworkInfo, blockchainProvider]);

  const alreadyDelegating = currentPortfolio.length > 0;

  const proceedWithSelections = useCallback(() => {
    setSection();
    setIsDrawerVisible(true);
  }, [setSection, setIsDrawerVisible]);

  const initiateStaking = useCallback(() => {
    if (alreadyDelegating) {
      setStakeConfirmationVisible(true);
      return;
    }

    proceedWithSelections();
  }, [alreadyDelegating, proceedWithSelections, setStakeConfirmationVisible]);

  const selectCurrentPool = useCallback(() => {
    if (!openPoolDetails || !openPool) return;
    const { hexId, name, ticker } = openPoolDetails;
    portfolioMutators.addPoolToDraft({
      displayData: Wallet.util.stakePoolTransformer({
        cardanoCoin: walletStoreWalletUICardanoCoin,
        stakePool: openPool,
      }),
      id: Wallet.Cardano.PoolIdHex(hexId),
      name,
      ticker,
      weight: 1,
    });
  }, [openPool, openPoolDetails, portfolioMutators, walletStoreWalletUICardanoCoin]);

  const stakeJustOnCurrentPool = useCallback(() => {
    if (alreadyDelegating) {
      setPendingSelection(true);
    }
    selectCurrentPool();
    initiateStaking();
    // TODO: LW-7668 implement no funds modal
    // if (canDelegate) {
    // } else {
    // setNoFundsVisible(true);
    // }
  }, [alreadyDelegating, selectCurrentPool, initiateStaking]);

  const unselectPool = useCallback(() => {
    if (!openPoolDetails) return;
    portfolioMutators.removePoolFromDraft({
      id: Wallet.Cardano.PoolIdHex(openPoolDetails.hexId),
    });
  }, [openPoolDetails, portfolioMutators]);

  const onChangingPreferencesConfirm = useCallback(() => {
    if (pendingSelection) {
      selectCurrentPool();
    }
    proceedWithSelections();
  }, [pendingSelection, proceedWithSelections, selectCurrentPool]);

  useEffect(() => {
    if (!currentChain) return;
    portfolioMutators.clearDraft();
  }, [currentChain]);

  return (
    <>
      <Box mb="$56">
        <Text.Heading data-testid="section-title">{t('root.title')}</Text.Heading>
      </Box>
      <Navigation>
        {(activePage) => (
          <Box mt="$40">
            {activePage === Page.overview && <Overview />}
            {activePage === Page.browsePools && <BrowsePools onStake={initiateStaking} />}
          </Box>
        )}
      </Navigation>
      <StakePoolDetails
        showCloseIcon
        showBackIcon={(section: Sections): boolean => stepsWithBackBtn.has(section)}
        showExitConfirmation={(section: Sections): boolean => stepsWithExitConfirmation.has(section)}
        onSelect={selectCurrentPool}
        onStakeOnThisPool={stakeJustOnCurrentPool}
        onUnselect={unselectPool}
      />
      <ChangingPreferencesModal onConfirm={onChangingPreferencesConfirm} />
      <MultidelegationBetaModal visible={multidelegationFirstVisit} onConfirm={triggerMultidelegationFirstVisit} />
    </>
  );
};
