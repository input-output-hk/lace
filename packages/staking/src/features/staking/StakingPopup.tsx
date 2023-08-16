import { Setup } from './setup';
import { StakingPopupView } from './StakingPopupView';
import { StakingProps } from './types';

export const StakingPopup = ({ language, theme }: StakingProps) => (
  <Setup theme={theme} language={language}>
    <StakingPopupView />
  </Setup>
);
