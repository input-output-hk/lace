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
  setRef: (instance: HTMLElement) => void;
}

const WalletSetupConfirmationDialogContext = createContext<ContextType>(null);

export const useWalletSetupConfirmationDialog = (): ContextType => {
  const context = useContext(WalletSetupConfirmationDialogContext);
  if (context === null) throw new Error('WalletSetupConfirmationDialogContext not defined');
  return context;
};

export const WalletSetupConfirmationDialogProvider = ({ children }: Props): React.ReactElement => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const containerRef = useRef<HTMLElement>(null);
  const confirmedCallbackRef = useRef(() => void 0);
  const inputMap = useMemo(() => new Map<string, boolean>(), []);
  const reset$ = useMemo(() => new Subject<boolean>(), []);
  const { t } = useTranslate();

  useEffect(() => {
    const subscription = reset$.subscribe(() => {
      inputMap.clear();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [reset$, inputMap]);

  const handleInputChange = useCallback(
    (event: Event) => {
      inputMap.set((event.target as HTMLInputElement).id, Boolean((event.target as HTMLInputElement).value));
    },
    [inputMap]
  );

  const withConfirmationDialog = useCallback(
    (confirmedCallback: () => void) => () => {
      const shouldOpenDialog = [...inputMap.values()].some(Boolean);
      if (shouldOpenDialog) {
        confirmedCallbackRef.current = () => {
          setIsDialogOpen(false);
          confirmedCallback();
        };
        setIsDialogOpen(true);
      } else {
        confirmedCallback();
      }
    },
    [inputMap, setIsDialogOpen]
  );

  const setRef: React.RefCallback<HTMLElement> = (node) => {
    if (node) {
      containerRef.current = node;
      node.querySelectorAll('input').forEach((input) => {
        inputMap.set(input.id, Boolean(input.value));
        input.addEventListener('input', handleInputChange);
      });
    } else {
      containerRef.current
        ?.querySelectorAll('input')
        .forEach((input) => input.removeEventListener('input', handleInputChange));
    }
  };

  return (
    <WalletSetupConfirmationDialogContext.Provider value={{ setRef, isDialogOpen, reset$, withConfirmationDialog }}>
      <Dialog.Root open={isDialogOpen} setOpen={setIsDialogOpen} zIndex={1000}>
        <Dialog.Title>{t('multiWallet.cancelDialog.title')}</Dialog.Title>
        <Dialog.Description>{t('multiWallet.cancelDialog.description')}</Dialog.Description>
        <Dialog.Actions>
          <Dialog.Action cancel label={t('multiWallet.cancelDialog.cancel')} onClick={() => setIsDialogOpen(false)} />
          <Dialog.Action label={t('multiWallet.cancelDialog.confirm')} onClick={confirmedCallbackRef?.current} />
        </Dialog.Actions>
      </Dialog.Root>
      {children}
    </WalletSetupConfirmationDialogContext.Provider>
  );
};
