/* eslint-disable unicorn/no-null */
import React, { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BehaviorSubject } from 'rxjs';
import { StartOverDialog } from '@ui/components/SharedWallet/StartOverDialog';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

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
      <StartOverDialog
        open={isDialogOpen}
        zIndex={300}
        translations={{
          title: t('multiWallet.confirmationDialog.title'),
          description: t('multiWallet.confirmationDialog.description'),
          cancel: t('multiWallet.confirmationDialog.cancel'),
          confirm: t('multiWallet.confirmationDialog.confirm')
        }}
        events={{
          onConfirm: handleOnConfirmRef.current,
          onCancel: () => setIsDialogOpen(false),
          onOpenChanged: setIsDialogOpen
        }}
      />
      {children}
    </WalletSetupConfirmationDialogContext.Provider>
  );
};
