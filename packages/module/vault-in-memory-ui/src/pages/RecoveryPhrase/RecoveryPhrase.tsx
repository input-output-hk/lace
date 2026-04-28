import { type SheetScreenProps } from '@lace-lib/navigation';
import { RecoveryPhraseSheetTemplate } from '@lace-lib/ui-toolkit';
import React from 'react';

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

  return (
    <RecoveryPhraseSheetTemplate
      title={title}
      mnemonicWords={mnemonicWords}
      isBlurred={isBlurred}
      showPassphraseLabel={showPassphraseLabel}
      doneButtonLabel={doneButtonLabel}
      onToggleBlur={handleToggleBlur}
      onDone={handleDone}
      {...(isDevelopmentEnvironment && {
        copyButtonLabel,
        onCopy: handleCopy,
      })}
    />
  );
};
