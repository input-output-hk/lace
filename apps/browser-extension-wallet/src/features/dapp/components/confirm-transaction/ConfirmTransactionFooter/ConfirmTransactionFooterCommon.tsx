import React, { useCallback } from 'react';
import { Button } from '@lace/common';
import { Wallet } from '@lace/cardano';
import { useViewsFlowContext } from '@providers/ViewFlowProvider';
import { useWalletStore } from '@stores';
import { useDisallowSignTx, useOnBeforeUnload, useSignWithHardwareWallet } from '../hooks';
import styles from './ConfirmTransactionFooterCommon.module.scss';
import { useTranslation } from 'react-i18next';

type ConfirmTransactionFooterProps = {
  errorMessage?: string;
  onBeforeSubmit?: (submit: () => void) => void;
  loading?: boolean;
};

export const ConfirmTransactionFooterCommon = ({
  loading,
  errorMessage,
  onBeforeSubmit = (fn) => fn()
}: ConfirmTransactionFooterProps): React.ReactElement => {
  const { t } = useTranslation();
  const disallowSignTx = useDisallowSignTx();
  const {
    utils: { setNextView }
  } = useViewsFlowContext();
  const { isConfirmingTx, signWithHardwareWallet } = useSignWithHardwareWallet();
  const keyAgentType = useWalletStore((store) => store.getKeyAgentType());
  const isUsingHardwareWallet = keyAgentType !== Wallet.KeyManagement.KeyAgentType.InMemory;
  const handleSubmit = useCallback(
    () =>
      onBeforeSubmit(async () => {
        isUsingHardwareWallet ? await signWithHardwareWallet() : setNextView();
      }),
    [isUsingHardwareWallet, setNextView, signWithHardwareWallet, onBeforeSubmit]
  );

  useOnBeforeUnload(disallowSignTx);

  return (
    <div className={styles.actions}>
      <Button
        onClick={handleSubmit}
        disabled={!!errorMessage}
        loading={loading || (isUsingHardwareWallet && isConfirmingTx)}
        data-testid="dapp-transaction-confirm"
        block
      >
        {isUsingHardwareWallet
          ? t('browserView.transaction.send.footer.confirmWithDevice', { hardwareWallet: keyAgentType })
          : t('dapp.confirm.btn.confirm')}
      </Button>
      <Button color="secondary" data-testid="dapp-transaction-cancel" onClick={() => disallowSignTx(true)} block>
        {t('dapp.confirm.btn.cancel')}
      </Button>
    </div>
  );
};
