import { OptionList } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useCommonOptionListProps } from '../common';

import { useAboutProps } from './useAboutProps';

import type { TabRoutes, TabScreenProps } from '@lace-lib/navigation';

export const AboutPage = ({
  navigation,
  route,
}: TabScreenProps<TabRoutes.About>) => {
  const { aboutOptions, title, subtitle } = useAboutProps({
    navigation,
    route,
  });

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
