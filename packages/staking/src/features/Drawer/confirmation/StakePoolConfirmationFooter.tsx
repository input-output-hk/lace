import { Wallet } from '@lace/cardano';
import { Button, PostHogAction } from '@lace/common';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PoolsManagementModal, PoolsManagementModalType } from '../../modals';
import { useOutsideHandles } from '../../outside-handles-provider';
import { useDelegationPortfolioStore, useStakingStore } from '../../store';

const validateIsPoolsChanged = (currentPortfolioIds: string[], draftPortfolioIds: string[]) => {
  const samePools = currentPortfolioIds.filter((id) => draftPortfolioIds.includes(id));
  return samePools.length !== draftPortfolioIds.length;
};

type StakePoolConfirmationFooterProps = {
  popupView?: boolean;
};

export const StakePoolConfirmationFooter = ({ popupView }: StakePoolConfirmationFooterProps): React.ReactElement => {
  const { t } = useTranslation();
  const { analytics } = useOutsideHandles();
  const {
    // walletStoreInMemoryWallet: inMemoryWallet,
    walletStoreGetKeyAgentType: getKeyAgentType,
    // submittingState: { setIsRestaking },
    // delegationStoreDelegationTxBuilder: delegationTxBuilder,
  } = useOutsideHandles();
  const { isBuildingTx, stakingError } = useStakingStore();
  const [isConfirmingTx, setIsConfirmingTx] = useState(false);
  const { currentPortfolio, portfolioMutators, draftPortfolio } = useDelegationPortfolioStore((store) => ({
    currentPortfolio: store.currentPortfolio,
    draftPortfolio: store.draftPortfolio,
    portfolioMutators: store.mutators,
  }));
  const [openPoolsManagementConfirmationModal, setOpenPoolsManagementConfirmationModal] =
    useState<PoolsManagementModalType | null>(null);

  const keyAgentType = getKeyAgentType();
  const isInMemory = useMemo(() => keyAgentType === Wallet.KeyManagement.KeyAgentType.InMemory, [keyAgentType]);

  // TODO unify
  // const signAndSubmitTransaction = useCallback(async () => {
  //   if (!delegationTxBuilder) throw new Error('Unable to submit transaction. The delegationTxBuilder not available');
  //   const signedTx = await delegationTxBuilder.build().sign();
  //   await inMemoryWallet.submitTx(signedTx.tx);
  // }, [delegationTxBuilder, inMemoryWallet]);

  const handleConfirmation = useCallback(async () => {
    analytics.sendEventToPostHog(PostHogAction.StakingManageDelegationStakePoolConfirmationNextClick);
    setIsConfirmingTx(false);

    const isPoolsReduced = draftPortfolio && currentPortfolio.length > draftPortfolio?.length;

    const currentPortfolioIds = currentPortfolio.map((pool) => pool.id);
    const draftPortfolioIds = draftPortfolio?.map((pool) => pool.id) || [];

    const isPoolsChanged = validateIsPoolsChanged(currentPortfolioIds, draftPortfolioIds);

    if (isPoolsReduced && isPoolsChanged) {
      return setOpenPoolsManagementConfirmationModal(PoolsManagementModalType.ADJUSTMENT);
    }

    if (isPoolsReduced) return setOpenPoolsManagementConfirmationModal(PoolsManagementModalType.REDUCTION);

    // HW-WALLET (FIX LATER):
    // if (!isInMemory) {
    //   setIsConfirmingTx(true);
    //   try {
    //     await signAndSubmitTransaction();
    //     setIsRestaking(currentPortfolio.length > 0);
    //     return setSection(sectionsConfig[Sections.SUCCESS_TX]);
    //   } catch {
    //     return setSection(sectionsConfig[Sections.FAIL_TX]);
    //   } finally {
    //     setIsConfirmingTx(false);
    //   }
    // }
    return portfolioMutators.executeCommand({ type: 'DrawerContinue' });
  }, [analytics, currentPortfolio, draftPortfolio, portfolioMutators]);

  const confirmLabel = useMemo(() => {
    if (!isInMemory) {
      const staleLabels = popupView
        ? t('drawer.confirmation.button.continueInAdvancedView')
        : t('drawer.confirmation.button.confirmWithDevice', { hardwareWallet: keyAgentType });
      return isConfirmingTx ? t('drawer.confirmation.button.signing') : staleLabels;
    }
    return t('drawer.confirmation.button.confirm');
  }, [isConfirmingTx, isInMemory, keyAgentType, popupView, t]);

  return (
    <>
      <div>
        <Button
          data-testid="stake-pool-confirmation-btn"
          disabled={isBuildingTx || !!stakingError}
          loading={isConfirmingTx || isBuildingTx}
          onClick={handleConfirmation}
          style={{ width: '100%' }}
          size="large"
        >
          {confirmLabel}
        </Button>
      </div>
      <PoolsManagementModal
        type={openPoolsManagementConfirmationModal}
        visible={!!openPoolsManagementConfirmationModal}
        onConfirm={() => portfolioMutators.executeCommand({ type: 'DrawerContinue' })}
        onCancel={() => setOpenPoolsManagementConfirmationModal(null)}
      />
    </>
  );
};
