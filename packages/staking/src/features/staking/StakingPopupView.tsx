import { Drawer } from '../Drawer';
import { OverviewPopup } from '../overview';
import { OneTimeModals } from './OneTimeModals';

export const StakingPopupView = () => (
  <>
    <OverviewPopup />
    <Drawer showBackIcon showExitConfirmation={() => false} popupView />
    <OneTimeModals popupView />
  </>
);
