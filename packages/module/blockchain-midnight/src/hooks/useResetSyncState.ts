import { useCallback, useMemo, useState } from 'react';

import { useDispatchLaceAction } from './lace-context';

import type { AccountId } from '@lace-contract/wallet-repo';

/**
 * State for the per-account reset confirm dialog. Only `resetAndRestart` is
 * destructive; `open`/`close` just toggle the dialog.
 */
export const useResetSyncState = (accountId: AccountId) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const dispatchResetSyncState = useDispatchLaceAction(
    'midnightContext.resetSyncState',
  );

  const open = useCallback(() => {
    setIsConfirmOpen(true);
  }, []);
  const close = useCallback(() => {
    setIsConfirmOpen(false);
  }, []);
  const resetAndRestart = useCallback(() => {
    // Close on confirm, like the other destructive confirms: the dialog must not
    // wait on the reset's reload to dismiss itself.
    close();
    dispatchResetSyncState({ accountId });
  }, [close, dispatchResetSyncState, accountId]);

  return useMemo(
    () => ({ isConfirmOpen, open, close, resetAndRestart }),
    [isConfirmOpen, open, close, resetAndRestart],
  );
};
