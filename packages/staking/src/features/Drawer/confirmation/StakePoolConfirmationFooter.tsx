/* eslint-disable @typescript-eslint/no-explicit-any */
import { WalletType } from '@cardano-sdk/web-extension';
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
    walletStoreInMemoryWallet: inMemoryWallet,
    walletStoreWalletType: walletType,
    submittingState: { setIsRestaking },
    delegationStoreDelegationTxBuilder: delegationTxBuilder,
    isMultidelegationSupportedByDevice,
    walletManagerExecuteWithPassword,
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

  const isHardwareWallet = walletType === WalletType.Trezor || walletType === WalletType.Ledger;

  // TODO unify
  const signAndSubmitTransaction = useCallback(async () => {
    if (!delegationTxBuilder) throw new Error('Unable to submit transaction. The delegationTxBuilder not available');

    const isMultidelegation = draftPortfolio && draftPortfolio.length > 1;
    if (isHardwareWallet && isMultidelegation) {
      const isSupported = await isMultidelegationSupportedByDevice(walletType);
      if (!isSupported) {
        throw new Error('MULTIDELEGATION_NOT_SUPPORTED');
      }
    }
    const signedTx = await delegationTxBuilder.build().sign();
    await inMemoryWallet.submitTx(signedTx);
  }, [
    delegationTxBuilder,
    inMemoryWallet,
    isHardwareWallet,
    isMultidelegationSupportedByDevice,
    walletType,
    draftPortfolio,
  ]);

  const handleSubmission = useCallback(async () => {
    setOpenPoolsManagementConfirmationModal(null);
    if (!isHardwareWallet) {
      portfolioMutators.executeCommand({ type: 'DrawerContinue' });
      return;
    }

    // HW-WALLET
    setIsConfirmingTx(true);
    try {
      await walletManagerExecuteWithPassword(signAndSubmitTransaction);
      setIsRestaking(currentPortfolio.length > 0);
      portfolioMutators.executeCommand({ type: 'HwSkipToSuccess' });
    } catch (error: any) {
      if (error.message === 'MULTIDELEGATION_NOT_SUPPORTED') {
        portfolioMutators.executeCommand({ type: 'HwSkipToDeviceFailure' });
      }
      portfolioMutators.executeCommand({ type: 'HwSkipToFailure' });
    } finally {
      setIsConfirmingTx(false);
    }
  }, [
    currentPortfolio.length,
    isHardwareWallet,
    portfolioMutators,
    setIsRestaking,
    signAndSubmitTransaction,
    walletManagerExecuteWithPassword,
  ]);

  const onClick = useCallback(async () => {
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

    return handleSubmission();
  }, [analytics, currentPortfolio, draftPortfolio, handleSubmission]);

  const confirmLabel = useMemo(() => {
    if (isHardwareWallet) {
      const staleLabels = popupView
        ? t('drawer.confirmation.button.continueInAdvancedView')
        : t('drawer.confirmation.button.confirmWithDevice', { hardwareWallet: walletType });
      return isConfirmingTx ? t('drawer.confirmation.button.signing') : staleLabels;
    }
    return t('drawer.confirmation.button.confirm');
  }, [isConfirmingTx, isHardwareWallet, walletType, popupView, t]);

  return (
    <>
      <div>
        <Button
          data-testid="stake-pool-confirmation-btn"
          disabled={isBuildingTx || !!stakingError}
          loading={isConfirmingTx || isBuildingTx}
          onClick={onClick}
          style={{ width: '100%' }}
          size="large"
        >
          {confirmLabel}
        </Button>
      </div>
      <PoolsManagementModal
        type={openPoolsManagementConfirmationModal}
        visible={!!openPoolsManagementConfirmationModal}
        onConfirm={handleSubmission}
        onCancel={() => setOpenPoolsManagementConfirmationModal(null)}
      />
    </>
  );
};
