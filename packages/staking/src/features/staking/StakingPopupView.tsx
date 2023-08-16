import { MultidelegationBetaModal } from '../modals';
import { useOutsideHandles } from '../outside-handles-provider';
import { OverviewPopup } from '../overview';

export const StakingPopupView = () => {
  const { multidelegationFirstVisit, triggerMultidelegationFirstVisit } = useOutsideHandles();
  return (
    <>
      <OverviewPopup />
      <MultidelegationBetaModal
        popupView
        visible={multidelegationFirstVisit}
        onConfirm={triggerMultidelegationFirstVisit}
      />
    </>
  );
};
