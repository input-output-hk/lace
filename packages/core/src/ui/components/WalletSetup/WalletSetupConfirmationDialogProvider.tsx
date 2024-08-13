/* eslint-disable unicorn/no-null */
import React, { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BehaviorSubject } from 'rxjs';
import { StartOverDialog } from './StartOverDialog';
import { useTranslation } from 'react-i18next';
import { useSecrets } from '@src/ui/hooks';

interface ContextType {
  isDialogOpen: boolean;
  shouldShowDialog$: BehaviorSubject<boolean>;
  withConfirmationDialog: (confirmedCallback: () => void) => () => void;
}

interface Props {
  children: (value: ContextType) => React.ReactNode;
}

const WalletSetupConfirmationDialogContext = createContext<ContextType>(null);

export const useWalletSetupConfirmationDialog = (): ContextType => {
  const context = useContext(WalletSetupConfirmationDialogContext);
  if (context === null) throw new Error('WalletSetupConfirmationDialogContext not defined');
  return context;
};

export const WalletSetupConfirmationDialogProvider = ({ children }: Props): React.ReactElement => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { clearSecrets } = useSecrets();
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
          title: t('core.multiWallet.confirmationDialog.title'),
          description: t('core.multiWallet.confirmationDialog.description'),
          cancel: t('core.multiWallet.confirmationDialog.cancel'),
          confirm: t('core.multiWallet.confirmationDialog.confirm')
        }}
        events={{
          onConfirm: () => {
            clearSecrets();
            handleOnConfirmRef.current();
          },
          onCancel: () => {
            setIsDialogOpen(false);
          },
          onOpenChanged: setIsDialogOpen
        }}
      />
      {children(value)}
    </WalletSetupConfirmationDialogContext.Provider>
  );
};
