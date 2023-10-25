import { Drawer } from '../Drawer';
import { MultidelegationBetaModal } from '../modals';
import { useOutsideHandles } from '../outside-handles-provider';
import { OverviewPopup } from '../overview';

export const StakingPopupView = () => {
  const { multidelegationFirstVisit, triggerMultidelegationFirstVisit } = useOutsideHandles();
  return (
    <>
      <OverviewPopup />
      <Drawer showBackIcon showExitConfirmation={() => false} popupView />
      <MultidelegationBetaModal
        popupView
        visible={multidelegationFirstVisit}
        onConfirm={triggerMultidelegationFirstVisit}
      />
    </>
  );
};
