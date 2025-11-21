import { useOutsideHandles } from 'features/outside-handles-provider';
import { Drawer } from '../Drawer';
import { OverviewPopup } from '../overview';
import { OneTimeModals } from './OneTimeModals';

export const StakingPopupView = () => {
  const { isSharedWallet } = useOutsideHandles();
  return (
    <>
      <OverviewPopup />
      <Drawer showBackIcon showExitConfirmation={() => false} popupView />
      {!isSharedWallet && <OneTimeModals popupView />}
    </>
  );
};
