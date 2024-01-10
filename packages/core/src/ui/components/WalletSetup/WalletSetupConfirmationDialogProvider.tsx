/* eslint-disable unicorn/no-null */
import React, { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslate } from '@src/ui/hooks';
import { BehaviorSubject } from 'rxjs';
import { Modal } from 'antd';
import { Button } from '@lace/common';
import styles from './WalletSetupConfirmationDialogProvider.module.scss';

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
      <Modal
        centered
        className={styles.modal}
        onCancel={() => setIsDialogOpen(false)}
        footer={null}
        visible={isDialogOpen}
      >
        <div className={styles.header}>{t('multiWallet.confirmationDialog.title')}</div>
        <div className={styles.content}>{t('multiWallet.confirmationDialog.description')}</div>
        <div className={styles.footer}>
          <Button block onClick={() => setIsDialogOpen(false)} color="secondary">
            {t('multiWallet.confirmationDialog.cancel')}
          </Button>

          <Button block onClick={handleOnConfirmRef.current}>
            {t('multiWallet.confirmationDialog.confirm')}
          </Button>
        </div>
      </Modal>
      {children}
    </WalletSetupConfirmationDialogContext.Provider>
  );
};
