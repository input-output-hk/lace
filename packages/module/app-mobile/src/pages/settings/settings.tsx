import { OptionList } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useCommonOptionListProps } from '../common';

import { useSettingsProps } from './useSettingsProps';

import type { TabRoutes, TabScreenProps } from '@lace-lib/navigation';

export const SettingsPage = ({
  navigation,
  route,
}: TabScreenProps<TabRoutes.Settings>) => {
  const { settingsOptions, title, subtitle } = useSettingsProps({
    navigation,
    route,
  });

  const { colors, isTablet } = useCommonOptionListProps();

  return (
    <OptionList
      colors={colors}
      options={settingsOptions}
      title={title}
      subtitle={subtitle}
      isTablet={isTablet}
    />
  );
};
