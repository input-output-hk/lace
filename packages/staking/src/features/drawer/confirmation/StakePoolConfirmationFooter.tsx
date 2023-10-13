import { Wallet } from '@lace/cardano';
import { Button } from '@lace/common';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../../outside-handles-provider';
import { useDelegationPortfolioStore, useStakingStore } from '../../store';

type StakePoolConfirmationFooterProps = {
  popupView?: boolean;
};

export const StakePoolConfirmationFooter = ({ popupView }: StakePoolConfirmationFooterProps): React.ReactElement => {
  const { t } = useTranslation();
  const {
    // walletStoreInMemoryWallet: inMemoryWallet,
    walletStoreGetKeyAgentType: getKeyAgentType,
    // submittingState: { setIsRestaking },
    // delegationStoreDelegationTxBuilder: delegationTxBuilder,
  } = useOutsideHandles();
  const { isBuildingTx, stakingError } = useStakingStore();
  const [isConfirmingTx, setIsConfirmingTx] = useState(false);
  const { /* currentPortfolio,*/ portfolioMutators } = useDelegationPortfolioStore((store) => ({
    currentPortfolio: store.currentPortfolio,
    portfolioMutators: store.mutators,
  }));

  const keyAgentType = getKeyAgentType();
  const isInMemory = useMemo(() => keyAgentType === Wallet.KeyManagement.KeyAgentType.InMemory, [keyAgentType]);

  // TODO unify
  // const signAndSubmitTransaction = useCallback(async () => {
  //   if (!delegationTxBuilder) throw new Error('Unable to submit transaction. The delegationTxBuilder not available');
  //   const signedTx = await delegationTxBuilder.build().sign();
  //   await inMemoryWallet.submitTx(signedTx.tx);
  // }, [delegationTxBuilder, inMemoryWallet]);
  const handleConfirmation = useCallback(async () => {
    setIsConfirmingTx(false);
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
    portfolioMutators.executeCommand({ type: 'DrawerContinue' });
  }, [portfolioMutators]);

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
  );
};
