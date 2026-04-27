import { OptionList } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useCommonOptionListProps } from '../common';

import { useAboutProps } from './useAboutProps';

export const AboutPage = () => {
  const { aboutOptions, title, subtitle } = useAboutProps();

  const { colors, isTablet } = useCommonOptionListProps();

  return (
    <OptionList
      colors={colors}
      options={aboutOptions}
      title={title}
      subtitle={subtitle}
      isTablet={isTablet}
    />
  );
};
