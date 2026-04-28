import { LanguageSheet as LanguageSheetTemplate } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useLanguageSheet } from './useLanguageSheet';

export const LanguageSheet = () => {
  const languageSheetProps = useLanguageSheet();

  return <LanguageSheetTemplate {...languageSheetProps} />;
};
