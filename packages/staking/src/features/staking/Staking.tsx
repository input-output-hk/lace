import { Setup } from './Setup';
import { StakingView } from './StakingView';
import { StakingProps } from './types';

export const Staking = ({ currentChain, language, theme }: StakingProps) => (
  <Setup currentChain={currentChain} theme={theme} language={language} view="expanded">
    <StakingView />
  </Setup>
);
