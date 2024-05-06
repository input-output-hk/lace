import { WalletSetupHWCreationStep } from '@lace/core';
import { TFunction } from 'i18next';
import React, { VFC, useMemo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHardwareWallet } from '../context';
import { WalletConflictError } from '@cardano-sdk/web-extension';
import { toast } from '@lace/common';
import { TOAST_DEFAULT_DURATION } from '@hooks';

const makeWalletSetupCreateStepTranslations = (t: TFunction) => ({
  title: t('core.walletSetupCreateStep.title'),
  description: t('core.walletSetupCreateStep.description')
});

enum CreationState {
  Idle = 'Idle',
  Working = 'Working'
}

export const Create: VFC = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<CreationState>(CreationState.Idle);
  const { createWallet } = useHardwareWallet();

  const walletSetupCreateStepTranslations = useMemo(() => makeWalletSetupCreateStepTranslations(t), [t]);

  useEffect(() => {
    (async () => {
      if (status !== CreationState.Idle) return;
      setStatus(CreationState.Working);

      try {
        await createWallet();
      } catch (error) {
        if (error instanceof WalletConflictError) {
          toast.notify({ duration: TOAST_DEFAULT_DURATION, text: t('multiWallet.walletAlreadyExists') });
        }
      }
    })();
  }, [createWallet, status, t]);

  return <WalletSetupHWCreationStep translations={walletSetupCreateStepTranslations} />;
};
