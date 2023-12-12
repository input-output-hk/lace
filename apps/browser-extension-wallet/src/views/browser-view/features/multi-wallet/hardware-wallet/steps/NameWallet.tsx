import { WalletSetupWalletNameStep } from '@lace/core';
import React, { useState } from 'react';
import { useHistory } from 'react-router';
import { StartOverDialog } from '../../../wallet-setup/components/StartOverDialog';
import { useTranslation } from 'react-i18next';
import { useHardwareWallet } from '../context';
import { ErrorHandling } from './ErrorHandling';
import { walletRoutePaths } from '@routes';

interface State {
  error?: 'common';
}

export const NameWallet = (): JSX.Element => {
  const history = useHistory();
  const { t } = useTranslation();
  const { createWallet, setName, resetConnection } = useHardwareWallet();
  const [isStartOverDialogVisible, setIsStartOverDialogVisible] = useState(false);
  const [state, setState] = useState<State>({});

  const walletSetupWalletNameStepTranslations = {
    maxCharacters: t('core.walletSetupWalletNameStep.maxCharacters'),
    walletName: t('core.walletSetupWalletNameStep.walletName'),
    nameYourWallet: t('core.walletSetupWalletNameStep.nameYourWallet'),
    create: t('core.walletSetupWalletNameStep.create'),
    chooseName: t('core.walletSetupWalletNameStep.chooseName')
  };

  const handleOnNext = async (name: string) => {
    setName(name);
    createWallet()
      .then(() => {
        setState({ error: undefined });
        history.push(walletRoutePaths.assets);
      })
      .catch(() => {
        setState({
          error: 'common'
        });
      });
  };

  const onRetry = () => {
    setState({ error: undefined });
  };

  return (
    <>
      <ErrorHandling onRetry={onRetry} error={state.error} />
      <WalletSetupWalletNameStep
        onBack={() => setIsStartOverDialogVisible(true)}
        onNext={handleOnNext}
        translations={walletSetupWalletNameStepTranslations}
        isHardwareWallet
      />
      <StartOverDialog
        visible={isStartOverDialogVisible}
        onStartOver={() => {
          resetConnection();
          history.push(walletRoutePaths.newWallet.hardware.connect);
        }}
        onClose={() => setIsStartOverDialogVisible(false)}
      />
    </>
  );
};
