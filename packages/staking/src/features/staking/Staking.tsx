import { MultidelegationBetaModal } from '../modals';
import { useOutsideHandles } from '../outside-handles-provider';
import { Setup } from './setup';
import { StakingView } from './StakingView';
import { StakingProps } from './types';

export const Staking = ({ language, theme }: StakingProps) => {
  const { multidelegationFirstVisit, triggerMultidelegationFirstVisit } = useOutsideHandles();

  return (
    <Setup theme={theme} language={language}>
      <StakingView />
      <MultidelegationBetaModal visible={multidelegationFirstVisit} onConfirm={triggerMultidelegationFirstVisit} />
    </Setup>
  );
};
