import { type SheetScreenProps } from '@lace-lib/navigation';
import { RecoveryPhraseSheetTemplate, Sheet } from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { isDevelopmentEnvironment } from '../../utils';

import { useRecoveryPhrase } from './useRecoveryPhrase';

import type { SheetRoutes } from '@lace-lib/navigation';

export const RecoveryPhrase = (
  props: SheetScreenProps<SheetRoutes.RecoveryPhrase>,
) => {
  const { walletId } = props.route.params;

  const {
    title,
    mnemonicWords,
    isBlurred,
    showPassphraseLabel,
    doneButtonLabel,
    copyButtonLabel,
    handleToggleBlur,
    handleDone,
    handleCopy,
  } = useRecoveryPhrase(walletId);

  useEffect(() => {
    props.navigation.setOptions({
      header: (
        <Sheet.Header title={title} testID="recovery-phrase-sheet-header" />
      ),
      footer: (
        <Sheet.Footer
          secondaryButton={
            isDevelopmentEnvironment && copyButtonLabel
              ? {
                  label: copyButtonLabel,
                  onPress: handleCopy,
                  preIconName: 'Copy',
                  testID: 'recovery-phrase-copy-button',
                }
              : undefined
          }
          primaryButton={{
            label: doneButtonLabel,
            onPress: handleDone,
            testID: 'recovery-phrase-done-button',
          }}
        />
      ),
    });
  }, [
    props.navigation,
    title,
    copyButtonLabel,
    handleCopy,
    doneButtonLabel,
    handleDone,
  ]);

  return (
    <RecoveryPhraseSheetTemplate
      mnemonicWords={mnemonicWords}
      isBlurred={isBlurred}
      showPassphraseLabel={showPassphraseLabel}
      onToggleBlur={handleToggleBlur}
    />
  );
};
