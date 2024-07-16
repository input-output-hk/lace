import { Setup } from './Setup';
import { StakingPopupView } from './StakingPopupView';
import { StakingProps } from './types';

export const StakingPopup = ({ language, theme }: StakingProps) => (
  <Setup theme={theme} language={language} view="popup">
    <StakingPopupView />
  </Setup>
);
