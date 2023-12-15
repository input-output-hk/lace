/* eslint-disable unicorn/no-null */
import React, { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dialog } from '@lace/ui';
import { useTranslate } from '@src/ui/hooks';
import { Subject } from 'rxjs';

interface Props {
  children: React.ReactNode;
}

interface ContextType {
  isDialogOpen: boolean;
  withConfirmationDialog: (confirmedCallback: () => void) => () => void;
  reset$: Subject<boolean>;
  shouldShowDialog$: Subject<boolean>;
}

const WalletSetupConfirmationDialogContext = createContext<ContextType>(null);

export const useWalletSetupConfirmationDialog = (): ContextType => {
  const context = useContext(WalletSetupConfirmationDialogContext);
  if (context === null) throw new Error('WalletSetupConfirmationDialogContext not defined');
  return context;
};

export const WalletSetupConfirmationDialogProvider = ({ children }: Props): React.ReactElement => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const confirmedCallbackRef = useRef(() => void 0);
  const reset$ = useMemo(() => new Subject<boolean>(), []);
  const shouldShowDialog = useRef<boolean>(false);
  const shouldShowDialog$ = useMemo(() => new Subject<boolean>(), []);
  const { t } = useTranslate();

  useEffect(() => {
    const subscription = shouldShowDialog$.subscribe((value) => {
      shouldShowDialog.current = value;
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [shouldShowDialog$]);

  useEffect(() => {
    const subscription = reset$.subscribe(() => {
      shouldShowDialog.current = false;
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [reset$]);

  const withConfirmationDialog = useCallback(
    (confirmedCallback: () => void) => () => {
      if (shouldShowDialog.current) {
        confirmedCallbackRef.current = () => {
          shouldShowDialog.current = false;
          setIsDialogOpen(false);
          confirmedCallback();
        };
        setIsDialogOpen(true);
      } else {
        confirmedCallback();
      }
    },
    [setIsDialogOpen]
  );

  return (
    <WalletSetupConfirmationDialogContext.Provider
      value={{ isDialogOpen, reset$, shouldShowDialog$, withConfirmationDialog }}
    >
      <Dialog.Root open={isDialogOpen} setOpen={setIsDialogOpen} zIndex={1000}>
        <Dialog.Title>{t('multiWallet.confirmationDialog.title')}</Dialog.Title>
        <Dialog.Description>{t('multiWallet.confirmationDialog.description')}</Dialog.Description>
        <Dialog.Actions>
          <Dialog.Action
            cancel
            label={t('multiWallet.confirmationDialog.cancel')}
            onClick={() => setIsDialogOpen(false)}
          />
          <Dialog.Action label={t('multiWallet.confirmationDialog.confirm')} onClick={confirmedCallbackRef?.current} />
        </Dialog.Actions>
      </Dialog.Root>
      {children}
    </WalletSetupConfirmationDialogContext.Provider>
  );
};
