import { useSearchParams } from '@lace/common';
import { useDelegationPortfolioStore } from 'features/store';
import { useCallback, useState } from 'react';

type StakingLoadActions = 'ManagePortfolio';

export const useStakingSectionLoadActions = () => {
  const portfolioMutators = useDelegationPortfolioStore((store) => store.mutators);
  const { onLoadAction } = useSearchParams(['onLoadAction']);
  const [executed, setExecuted] = useState(false);

  const onLoad = useCallback(() => {
    if (!executed && ['ManagePortfolio'].includes(onLoadAction)) {
      portfolioMutators.executeCommand({
        type: onLoadAction as StakingLoadActions,
      });
      setExecuted(true);
    }
  }, [executed, onLoadAction, portfolioMutators]);

  return {
    onLoad,
  };
};
