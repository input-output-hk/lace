import { type SheetScreenProps } from '@lace-lib/navigation';
import {
  RecoveryPhraseVerificationSheet,
  Sheet,
  RecoveryPhraseSheetTemplate,
} from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { isDevelopmentEnvironment } from '../../utils';

import { useRecoveryPhraseVerification } from './useRecoveryPhraseVerification';

import type { SheetRoutes } from '@lace-lib/navigation';

export const RecoveryPhraseVerification = (
  props: SheetScreenProps<SheetRoutes.RecoveryPhraseVerification>,
) => {
  const { state, display, verify } = useRecoveryPhraseVerification(props);

  useEffect(() => {
    if (state.status === 'Display') {
      props.navigation.setOptions({
        header: (
          <Sheet.Header
            title={display.copies.title}
            testID="recovery-phrase-display-sheet-header"
          />
        ),
        footer: (
          <Sheet.Footer
            secondaryButton={
              isDevelopmentEnvironment && display.copies.copyButtonLabel
                ? {
                    label: display.copies.copyButtonLabel,
                    onPress: display.handleCopy,
                    preIconName: 'Copy',
                    testID: 'recovery-phrase-display-copy-button',
                  }
                : undefined
            }
            primaryButton={{
              label: display.copies.continueButtonLabel,
              onPress: display.handleContinue,
              testID: 'recovery-phrase-display-continue-button',
              disabled: state.isBlurred,
            }}
          />
        ),
      });
      return;
    }

    props.navigation.setOptions({
      header: (
        <Sheet.Header
          title={verify.copies.title}
          leftIconOnPress={verify.handleBack}
          testID="recovery-phrase-verification-sheet-header"
        />
      ),
      footer: (
        <Sheet.Footer
          secondaryButton={
            isDevelopmentEnvironment && verify.copies.pasteButtonLabel
              ? {
                  label: verify.copies.pasteButtonLabel,
                  onPress: verify.handlePaste,
                  preIconName: 'Paste',
                  testID: 'recovery-phrase-verification-paste-button',
                }
              : undefined
          }
          primaryButton={{
            label: verify.copies.finishButtonLabel,
            onPress: verify.handleFinish,
            disabled: !state.isFinishEnabled,
            testID: 'recovery-phrase-verification-finish-button',
          }}
        />
      ),
    });
  }, [props.navigation, state, display, verify]);

  if (state.status === 'Display') {
    return (
      <RecoveryPhraseSheetTemplate
        description={display.copies.description}
        mnemonicWords={display.mnemonicWords}
        isBlurred={state.isBlurred}
        showPassphraseLabel={display.copies.showPassphraseLabel}
        hidePassphraseLabel={display.copies.hidePassphraseLabel}
        onToggleBlur={display.handleToggleBlur}
      />
    );
  }

  return (
    <RecoveryPhraseVerificationSheet
      description={verify.copies.description}
      inputValue={state.inputValue}
      errorMessage={state.errorMessage}
      placeholder={verify.copies.placeholder}
      onInputChange={verify.handleInputChange}
    />
  );
};
