import { Setup } from './setup';
import { StakingPopupView } from './StakingPopupView';
import { StakingProps } from './types';

export const StakingPopup = ({ currentChain, language, theme }: StakingProps) => (
  <Setup currentChain={currentChain} theme={theme} language={language} view="popup">
    <StakingPopupView />
  </Setup>
);
