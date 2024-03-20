import { WalletSetupWalletNameStep } from '@lace/core';
import React, { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { StartOverDialog } from '../../../wallet-setup/components/StartOverDialog';
import { useTranslation } from 'react-i18next';
import { useHardwareWallet } from '../context';
import { ErrorHandling } from './ErrorHandling';
import { walletRoutePaths } from '@routes';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@lace/common';

interface State {
  error?: 'common';
}

export const NameWallet = (): JSX.Element => {
  const history = useHistory();
  const { t } = useTranslation();
  const { createWallet, setName, data, resetConnection } = useHardwareWallet();
  const [isStartOverDialogVisible, setIsStartOverDialogVisible] = useState(false);
  const [state, setState] = useState<State>({});
  const analytics = useAnalyticsContext();

  const walletSetupWalletNameStepTranslations = {
    maxCharacters: t('core.walletSetupWalletNameStep.maxCharacters'),
    walletName: t('core.walletSetupWalletNameStep.walletName'),
    nameYourWallet: t('core.walletSetupWalletNameStep.nameYourWallet'),
    create: t('core.walletSetupWalletNameStep.create'),
    chooseName: t('core.walletSetupWalletNameStep.chooseName')
  };

  // if createWallet is called in handleOnNext, then it will get name as ''
  useEffect(() => {
    if (!data?.name) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.name]);

  const handleOnNext = useCallback(
    async (name: string) => {
      analytics.sendEventToPostHog(PostHogAction.MultiWalletHWNameNextClick);
      setName(name);
    },
    [setName, analytics]
  );

  const onRetry = useCallback(() => {
    setState({ error: undefined });
  }, [setState]);

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
