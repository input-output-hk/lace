import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls } from '@lace-lib/navigation';
import { useCopyToClipboard, useTheme } from '@lace-lib/ui-toolkit';
import { useCallback, useRef, useState } from 'react';

import { useDispatchLaceAction, useRequestMnemonic } from '../../hooks';
import { isDevelopmentEnvironment, mnemonicToString } from '../../utils';

import type { UseRequestMnemonicParams } from '../../hooks/useRequestMnemonic';
import type { WalletId } from '@lace-contract/wallet-repo';

const noop = () => undefined;

export const useRecoveryPhrase = (walletId: WalletId) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [isBlurred, setIsBlurred] = useState(true);
  const showToast = useDispatchLaceAction('ui.showToast');

  const isMinimalDisplayTimeSatisfied = useRef(
    new Promise(resolve => {
      setTimeout(resolve, 500);
    }),
  );

  const closeSheet = useCallback(() => {
    NavigationControls.sheets.close();
  }, []);

  const onFailure = useCallback<UseRequestMnemonicParams['onFailure']>(
    reason => {
      void (async () => {
        if (reason === 'failed') {
          await isMinimalDisplayTimeSatisfied.current;
          showToast({
            text: t('v2.recovery-phrase.request.failure'),
            color: 'negative',
            duration: 3,
          });
        }
        NavigationControls.sheets.close();
      })();
    },
    [showToast, t],
  );

  const mnemonicState = useRequestMnemonic({
    walletId,
    authenticationPromptConfig: {
      cancellable: true,
      confirmButtonLabel: 'authentication-prompt.confirm-button-label',
      message: 'authentication-prompt.message.recovery-phrase-display',
    },
    onFailure,
  });

  const handleToggleBlur = useCallback(() => {
    setIsBlurred(previous => !previous);
  }, []);

  const { copyToClipboard } = isDevelopmentEnvironment
    ? useCopyToClipboard({
        onSuccess: () => {
          showToast({
            text: t('v2.recovery-phrase.verification.copy-success'),
            color: 'positive',
            duration: 3,
            leftIcon: {
              name: 'Checkmark',
              size: 20,
              color: theme.brand.white,
            },
          });
        },
        onError: () => {
          showToast({
            text: t('v2.recovery-phrase.verification.copy-error'),
            color: 'negative',
            duration: 3,
            leftIcon: {
              name: 'AlertTriangle',
              size: 20,
              color: theme.brand.white,
            },
          });
        },
      })
    : { copyToClipboard: noop };

  const handleCopy = useCallback(() => {
    if (!(mnemonicState.status === 'Ready')) return;
    copyToClipboard(mnemonicToString(mnemonicState.mnemonicWords));
  }, [mnemonicState, copyToClipboard]);

  const title = t('v2.recovery-phrase.verification.title');
  const showPassphraseLabel = isBlurred
    ? t('v2.recovery-phrase.display.showPassphrase')
    : t('v2.recovery-phrase.display.hidePassphrase');
  const doneButtonLabel = t('v2.recovery-phrase.verification.success.button');
  const copyButtonLabel = t('v2.recovery-phrase.copy');

  return {
    title,
    mnemonicWords:
      mnemonicState.status === 'Ready' ? mnemonicState.mnemonicWords : null,
    isBlurred,
    showPassphraseLabel,
    doneButtonLabel,
    copyButtonLabel,
    handleToggleBlur,
    handleDone: closeSheet,
    handleCopy,
  };
};
