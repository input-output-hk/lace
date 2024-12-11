import { MultidelegationDAppCompatibilityModal } from 'features/modals/MultidelegationDAppCompatibilityModal';
import { useDelegationPortfolioStore } from 'features/store';
import { useEffect } from 'react';
import { MultidelegationBetaModal } from '../modals';
import { useOutsideHandles } from '../outside-handles-provider';

type OneTimeModalManagerProps = { popupView?: boolean };

export const OneTimeModals = ({ popupView }: OneTimeModalManagerProps) => {
  const {
    multidelegationFirstVisit,
    triggerMultidelegationFirstVisit,
    multidelegationDAppCompatibility,
    triggerMultidelegationDAppCompatibility,
  } = useOutsideHandles();
  const { currentPortfolio } = useDelegationPortfolioStore((store) => ({
    currentPortfolio: store.currentPortfolio,
  }));
  const userAlreadyMultidelegated = currentPortfolio.length > 1;

  // the useEffects below prevent the modals from appearing to the user in the future e.g. after undelegating the portfolio
  useEffect(() => {
    if (multidelegationFirstVisit && userAlreadyMultidelegated) {
      triggerMultidelegationFirstVisit();
    }
  }, [userAlreadyMultidelegated, multidelegationFirstVisit, triggerMultidelegationFirstVisit]);

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

  return null;
};
