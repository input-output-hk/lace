import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import { useCallback, useMemo } from 'react';

import { useLaceSelector } from '../../hooks';

export const useDRepDetails = (accountId: string, drepId: string) => {
  const dReps = useLaceSelector('dRepsList.selectDReps');

  const summary = useMemo(
    () => dReps.find(dRep => dRep.drepId === drepId),
    [dReps, drepId],
  );

  const onDelegate = useCallback(() => {
    NavigationControls.navigate(SheetRoutes.NewDRepDelegation, {
      accountId,
      dRep: { type: 'specific', drepId },
    });
  }, [accountId, drepId]);

  return { onDelegate, summary };
};
