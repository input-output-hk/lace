import { useSearchParams } from '@lace/common';
import { useDelegationPortfolioStore } from 'features/store';
import { useCallback, useState } from 'react';

export const useStakingSectionLoadActions = () => {
  const portfolioMutators = useDelegationPortfolioStore((store) => store.mutators);
  const { onLoadAction } = useSearchParams(['onLoadAction']);
  const [executed, setExecuted] = useState(false);

  const onLoad = useCallback(() => {
    if (!executed && onLoadAction === 'ManagePortfolio') {
      portfolioMutators.executeCommand({
        type: 'ManagePortfolio',
      });
      setExecuted(true);
    }
  }, [executed, onLoadAction, portfolioMutators]);

  return {
    onLoad,
  };
};
