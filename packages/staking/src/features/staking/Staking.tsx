import { Setup } from './setup';
import { StakingView } from './StakingView';
import { StakingProps } from './types';

export const Staking = ({ language, theme }: StakingProps) => (
  <Setup theme={theme} language={language}>
    <StakingView />
  </Setup>
);
