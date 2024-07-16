import { MultidelegationDAppCompatibilityModal } from 'features/modals/MultidelegationDAppCompatibilityModal';
import { useDelegationPortfolioStore } from 'features/store';
import { isPortfolioSavedOnChain } from 'features/store/delegationPortfolioStore/isPortfolioSavedOnChain';
import { useEffect } from 'react';
import { MultidelegationBetaModal, PortfolioPersistenceModal } from '../modals';
import { useOutsideHandles } from '../outside-handles-provider';

type OneTimeModalManagerProps = { popupView?: boolean };

export const OneTimeModals = ({ popupView }: OneTimeModalManagerProps) => {
  const {
    multidelegationFirstVisit,
    triggerMultidelegationFirstVisit,
    multidelegationDAppCompatibility,
    triggerMultidelegationDAppCompatibility,
    multidelegationFirstVisitSincePortfolioPersistence,
    triggerMultidelegationFirstVisitSincePortfolioPersistence,
  } = useOutsideHandles();
  const { currentPortfolio } = useDelegationPortfolioStore((store) => ({
    currentPortfolio: store.currentPortfolio,
  }));
  const userAlreadyMultidelegated = currentPortfolio.length > 1;
  const portfolioSavedOnChain = isPortfolioSavedOnChain(currentPortfolio);

  // the useEffects below prevent the modals from appearing to the user in the future e.g. after undelegating the portfolio
  useEffect(() => {
    if (multidelegationFirstVisit && userAlreadyMultidelegated) {
      triggerMultidelegationFirstVisit();
    }
  }, [userAlreadyMultidelegated, multidelegationFirstVisit, triggerMultidelegationFirstVisit]);

  useEffect(() => {
    if (multidelegationFirstVisitSincePortfolioPersistence && portfolioSavedOnChain) {
      triggerMultidelegationFirstVisitSincePortfolioPersistence();
    }
  }, [
    multidelegationFirstVisitSincePortfolioPersistence,
    triggerMultidelegationFirstVisitSincePortfolioPersistence,
    portfolioSavedOnChain,
  ]);

  if (!userAlreadyMultidelegated) {
    return (
      <MultidelegationBetaModal
        visible={multidelegationFirstVisit}
        onConfirm={triggerMultidelegationFirstVisit}
        popupView={popupView}
      />
    );
  }

  if (userAlreadyMultidelegated) {
    return (
      <MultidelegationDAppCompatibilityModal
        visible={!multidelegationFirstVisit && multidelegationDAppCompatibility}
        onConfirm={triggerMultidelegationDAppCompatibility}
        popupView={popupView}
      />
    );
  }

  if (!portfolioSavedOnChain) {
    return (
      <PortfolioPersistenceModal
        visible={multidelegationFirstVisitSincePortfolioPersistence}
        onConfirm={triggerMultidelegationFirstVisitSincePortfolioPersistence}
        popupView={popupView}
      />
    );
  }

  return null;
};
