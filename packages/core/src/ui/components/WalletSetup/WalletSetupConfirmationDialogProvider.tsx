/* eslint-disable unicorn/no-null */
import React, { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dialog } from '@lace/ui';
import { useTranslate } from '@src/ui/hooks';
import { BehaviorSubject } from 'rxjs';

interface Props {
  children: React.ReactNode;
}

interface ContextType {
  isDialogOpen: boolean;
  shouldShowDialog$: BehaviorSubject<boolean>;
  withConfirmationDialog: (confirmedCallback: () => void) => () => void;
}

const WalletSetupConfirmationDialogContext = createContext<ContextType>(null);

export const useWalletSetupConfirmationDialog = (): ContextType => {
  const context = useContext(WalletSetupConfirmationDialogContext);
  if (context === null) throw new Error('WalletSetupConfirmationDialogContext not defined');
  return context;
};

export const WalletSetupConfirmationDialogProvider = ({ children }: Props): React.ReactElement => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const handleOnConfirmRef = useRef(() => void 0);
  const shouldShowDialog = useRef<boolean>(false);
  const shouldShowDialog$ = useMemo(() => new BehaviorSubject<boolean>(false), []);
  const { t } = useTranslate();

  useEffect(() => {
    const subscription = shouldShowDialog$.subscribe((value) => {
      shouldShowDialog.current = value;
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [shouldShowDialog$]);

  const withConfirmationDialog = useCallback(
    (callback: () => void) => () => {
      if (shouldShowDialog.current) {
        handleOnConfirmRef.current = () => {
          shouldShowDialog.current = false;
          setIsDialogOpen(false);
          callback();
        };
        setIsDialogOpen(true);
      } else {
        callback();
      }
    },
    [setIsDialogOpen]
  );

  const value = useMemo(
    () => ({
      isDialogOpen,
      shouldShowDialog$,
      withConfirmationDialog
    }),
    [isDialogOpen, shouldShowDialog$, withConfirmationDialog]
  );

  return (
    <WalletSetupConfirmationDialogContext.Provider value={value}>
      <Dialog.Root open={isDialogOpen} setOpen={setIsDialogOpen} zIndex={1000}>
        <Dialog.Title>{t('multiWallet.confirmationDialog.title')}</Dialog.Title>
        <Dialog.Description>{t('multiWallet.confirmationDialog.description')}</Dialog.Description>
        <Dialog.Actions>
          <Dialog.Action
            cancel
            label={t('multiWallet.confirmationDialog.cancel')}
            onClick={() => setIsDialogOpen(false)}
          />
          <Dialog.Action label={t('multiWallet.confirmationDialog.confirm')} onClick={handleOnConfirmRef.current} />
        </Dialog.Actions>
      </Dialog.Root>
      {children}
    </WalletSetupConfirmationDialogContext.Provider>
  );
};
