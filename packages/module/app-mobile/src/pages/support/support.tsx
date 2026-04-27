import { OptionList } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useCommonOptionListProps } from '../common';

import { useSupportProps } from './useSupportProps';

export const SupportPage = () => {
  const { supportOptions, title, subtitle, searchPlaceholder } =
    useSupportProps();

  const { colors, isTablet } = useCommonOptionListProps();

  return (
    <OptionList
      searchPlaceholder={searchPlaceholder}
      isTablet={isTablet}
      colors={colors}
      options={supportOptions}
      title={title}
      subtitle={subtitle}
    />
  );
};
