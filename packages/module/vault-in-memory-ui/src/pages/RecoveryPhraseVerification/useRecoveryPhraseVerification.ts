import { deepEquals } from '@cardano-sdk/util';
import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import { useCopyToClipboard } from '@lace-lib/ui-toolkit';
import { createStateMachine } from '@lace-lib/util-store';
import { ByteArray } from '@lace-sdk/util';
import { useCallback, useEffect, useReducer, useRef } from 'react';

import {
  useDispatchLaceAction,
  useLaceSelector,
  useRequestMnemonic,
} from '../../hooks';
import { isDevelopmentEnvironment, mnemonicToString } from '../../utils';

import type { UseRequestMnemonicParams } from '../../hooks/useRequestMnemonic';
import type { SheetScreenProps } from '@lace-lib/navigation';
import type { StateObject } from '@lace-lib/util-store';

type RecoveryPhraseVerificationState =
  | StateObject<
      'Display',
      {
        isBlurred: boolean;
      }
    >
  | StateObject<
      'Verify',
      {
        inputValue: string;
        errorMessage: string;
        isFinishEnabled: boolean;
      }
    >;

const recoveryPhraseVerificationInitialState = {
  status: 'Display',
  isBlurred: true,
} as RecoveryPhraseVerificationState;

const { events, initialState, transition } = createStateMachine(
  'recoveryPhraseVerification',
  recoveryPhraseVerificationInitialState,
  {
    Display: {
      toggleBlur: ({ isBlurred }) => ({
        status: 'Display',
        isBlurred: !isBlurred,
      }),
      proceed: () => ({
        status: 'Verify',
        errorMessage: '',
        inputValue: '',
        isFinishEnabled: false,
      }),
    },
    Verify: {
      back: () => ({
        status: 'Display',
        isBlurred: true,
      }),
      inputChanged: (previousState, { value }: { value: string }) => ({
        ...previousState,
        inputValue: value,
        errorMessage: '',
        isFinishEnabled: value.trim().length > 0,
      }),
      validationFailed: (
        previousState,
        { errorMessage }: { errorMessage: string },
      ) => ({
        ...previousState,
        errorMessage,
      }),
    },
  },
);

export const useRecoveryPhraseVerification = ({
  navigation,
  route,
}: SheetScreenProps<SheetRoutes.RecoveryPhraseVerification>) => {
  const { walletId } = route.params;
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();

  const inMemoryWallet = useLaceSelector('wallets.selectWalletById', walletId);
  const updateWallet = useDispatchLaceAction('wallets.updateWallet');
  const showToast = useDispatchLaceAction('ui.showToast');
  const [state, dispatch] = useReducer(transition, initialState);

  // Funnel step 1: the user reached the phrase-display screen.
  useEffect(() => {
    trackEvent('recovery phrase | display | viewed', { flow: 'onboarding' });
  }, [trackEvent]);

  // Funnel step 2: the user has entered the verify step (transitioned from
  // Display → Verify). Fires once per entry of Verify status.
  useEffect(() => {
    if (state.status === 'Verify') {
      trackEvent('recovery phrase | verification | started');
    }
  }, [state.status, trackEvent]);

  const isMinimalDisplayTimeSatisfied = useRef(
    new Promise(resolve => {
      setTimeout(resolve, 500);
    }),
  );

  const closeSheet = useCallback(() => {
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
      message: 'authentication-prompt.message.recovery-phrase-verification',
    },
    onFailure,
  });

  // Clipboard helpers are only exposed in development environments, but the
  // hook itself must be called unconditionally to comply with the Rules of Hooks.
  const { copyToClipboard, pasteFromClipboard } = useCopyToClipboard({
    onPasteSuccess: (value: string) => {
      dispatch(events.inputChanged({ value }));
    },
    onError: () => {
      // TODO: Show error toast
    },
  });

  const handlePaste = useCallback(() => {
    if (!isDevelopmentEnvironment) return;
    pasteFromClipboard();
  }, [pasteFromClipboard]);

  useEffect(() => {
    if (inMemoryWallet) return;
    onFailure('failed');
  }, [inMemoryWallet, onFailure]);

  const displayHandleFinish = useCallback(() => {
    if (
      state.status !== 'Verify' ||
      mnemonicState.status !== 'Ready' ||
      !inMemoryWallet
    ) {
      return;
    }

    const enteredMnemonic = state.inputValue
      .trim()
      .split(' ')
      .map(ByteArray.fromUTF8);
    if (!deepEquals(enteredMnemonic, mnemonicState.mnemonicWords)) {
      const errorMessage = t('v2.recovery-phrase.verification.error');
      dispatch(events.validationFailed({ errorMessage }));
      return;
    }

    const changes = { isPassphraseConfirmed: true };
    updateWallet({
      id: walletId,
      changes,
    });

    // Navigate to success status sheet
    navigation.navigate(SheetRoutes.SuccessRecoveryPhraseVerification);
  }, [
    walletId,
    mnemonicState,
    state,
    inMemoryWallet,
    updateWallet,
    dispatch,
    t,
    navigation,
  ]);

  const mnemonicWords =
    mnemonicState.status === 'Ready' ? mnemonicState.mnemonicWords : null;

  return {
    state,
    display: {
      copies: {
        title: t('v2.recovery-phrase.display.title'),
        description: t('v2.recovery-phrase.display.description'),
        showPassphraseLabel: t('v2.recovery-phrase.display.showPassphrase'),
        hidePassphraseLabel: t('v2.recovery-phrase.display.hidePassphrase'),
        continueButtonLabel: t('v2.recovery-phrase.display.continue'),
        copyButtonLabel: t('v2.recovery-phrase.copy'),
      },
      mnemonicWords,
      handleSheetClose: closeSheet,
      handleToggleBlur: useCallback(() => {
        dispatch(events.toggleBlur());
      }, [dispatch]),
      handleContinue: useCallback(() => {
        trackEvent('recovery phrase | display | continue | press', {
          flow: 'onboarding',
        });
        dispatch(events.proceed());
      }, [dispatch, trackEvent]),
      handleCopy: useCallback(() => {
        if (!isDevelopmentEnvironment) return;
        if (state.status !== 'Display' || mnemonicState.status !== 'Ready') {
          return;
        }
        trackEvent('recovery phrase | display | copied | press', {
          flow: 'onboarding',
        });
        const recoveryPhrase = mnemonicToString(mnemonicState.mnemonicWords);
        copyToClipboard(recoveryPhrase);
      }, [state, mnemonicState, copyToClipboard, trackEvent]),
    },
    verify: {
      copies: {
        title: t('v2.recovery-phrase.verification.title'),
        description: t('v2.recovery-phrase.verification.description'),
        placeholder: t('v2.recovery-phrase.verification.placeholder'),
        finishButtonLabel: t('v2.recovery-phrase.verification.finish'),
        pasteButtonLabel: t('v2.recovery-phrase.verification.paste'),
      },
      handlePaste,
      handleFinish: displayHandleFinish,
      handleSheetClose: closeSheet,
      handleInputChange: useCallback(
        (value: string) => {
          dispatch(events.inputChanged({ value }));
        },
        [dispatch],
      ),
      handleBack: useCallback(() => {
        dispatch(events.back());
      }, [dispatch]),
    },
  };
};
