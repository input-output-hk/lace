import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls } from '@lace-lib/navigation';
import { useCopyToClipboard, useTheme } from '@lace-lib/ui-toolkit';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useDispatchLaceAction, useRequestMnemonic } from '../../hooks';
import { isDevelopmentEnvironment, mnemonicToString } from '../../utils';

import type { UseRequestMnemonicParams } from '../../hooks/useRequestMnemonic';
import type { WalletId } from '@lace-contract/wallet-repo';

export const useRecoveryPhrase = (walletId: WalletId) => {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const { theme } = useTheme();
  const [isBlurred, setIsBlurred] = useState(true);
  const showToast = useDispatchLaceAction('ui.showToast');

  const isMinimalDisplayTimeSatisfied = useRef(
    new Promise(resolve => {
      setTimeout(resolve, 500);
    }),
  );

  // Fire a single `display | viewed` event per mount, regardless of mnemonic
  // resolution — we care that the user reached this screen.
  useEffect(() => {
    trackEvent('recovery phrase | display | viewed', { flow: 'view' });
  }, [trackEvent]);

  const closeSheet = useCallback(() => {
    trackEvent('recovery phrase | display | continue | press', {
      flow: 'view',
    });
    NavigationControls.closeSheet();
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
        NavigationControls.closeSheet();
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

  // Copy-to-clipboard is only exposed in development environments, but the
  // hook itself must be called unconditionally to comply with the Rules of Hooks.
  const { copyToClipboard } = useCopyToClipboard({
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
  });

  const handleCopy = useCallback(() => {
    if (!isDevelopmentEnvironment) return;
    if (mnemonicState.status !== 'Ready') return;
    trackEvent('recovery phrase | display | copied | press', {
      flow: 'view',
    });
    copyToClipboard(mnemonicToString(mnemonicState.mnemonicWords));
  }, [mnemonicState, copyToClipboard, trackEvent]);

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
