import { type SheetScreenProps } from '@lace-lib/navigation';
import {
  RecoveryPhraseDisplaySheet as RecoveryPhraseDisplaySheetTemplate,
  RecoveryPhraseVerificationSheet as RecoveryPhraseVerificationSheetTemplate,
} from '@lace-lib/ui-toolkit';
import React from 'react';

import { isDevelopmentEnvironment } from '../../utils';

import { useRecoveryPhraseVerification } from './useRecoveryPhraseVerification';

import type { SheetRoutes } from '@lace-lib/navigation';

export const RecoveryPhraseVerification = (
  props: SheetScreenProps<SheetRoutes.RecoveryPhraseVerification>,
) => {
  const { state, display, verify } = useRecoveryPhraseVerification(props);

  if (state.status === 'Display') {
    return (
      <RecoveryPhraseDisplaySheetTemplate
        title={display.copies.title}
        description={display.copies.description}
        mnemonicWords={display.mnemonicWords}
        isBlurred={state.isBlurred}
        showPassphraseLabel={display.copies.showPassphraseLabel}
        hidePassphraseLabel={display.copies.hidePassphraseLabel}
        continueButtonLabel={display.copies.continueButtonLabel}
        onToggleBlur={display.handleToggleBlur}
        onContinue={display.handleContinue}
        {...(isDevelopmentEnvironment && {
          copyButtonLabel: display.copies.copyButtonLabel,
          onCopy: display.handleCopy,
        })}
      />
    );
  }

  return (
    <RecoveryPhraseVerificationSheetTemplate
      title={verify.copies.title}
      description={verify.copies.description}
      inputValue={state.inputValue}
      errorMessage={state.errorMessage}
      placeholder={verify.copies.placeholder}
      finishButtonLabel={verify.copies.finishButtonLabel}
      isFinishEnabled={state.isFinishEnabled}
      onInputChange={verify.handleInputChange}
      onFinish={verify.handleFinish}
      onBack={verify.handleBack}
      {...(isDevelopmentEnvironment && {
        pasteButtonLabel: verify.copies.pasteButtonLabel,
        onPaste: verify.handlePaste,
      })}
    />
  );
};
