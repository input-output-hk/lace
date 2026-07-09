import {
  LanguageSheet as LanguageSheetTemplate,
  Sheet,
} from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useLanguageSheet } from './useLanguageSheet';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const LanguageSheet = ({
  navigation,
}: SheetScreenProps<SheetRoutes.Language>) => {
  const languageSheetProps = useLanguageSheet();

  useEffect(() => {
    navigation.setOptions({
      header: <Sheet.Header title={languageSheetProps.title} />,
      footer: (
        <Sheet.Footer
          secondaryButton={{
            label: languageSheetProps.cancelLabel,
            onPress: languageSheetProps.onClose,
            testID: 'language-sheet-cancel-button',
          }}
          primaryButton={{
            label: languageSheetProps.confirmLabel,
            onPress: languageSheetProps.onConfirm,
            testID: 'language-sheet-confirm-button',
          }}
        />
      ),
    });
  }, [
    navigation,
    languageSheetProps.title,
    languageSheetProps.cancelLabel,
    languageSheetProps.confirmLabel,
    languageSheetProps.onClose,
    languageSheetProps.onConfirm,
  ]);

  return <LanguageSheetTemplate {...languageSheetProps} />;
};
