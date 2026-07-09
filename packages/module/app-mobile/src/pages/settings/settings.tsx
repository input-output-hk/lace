import { OptionList } from '@lace-lib/ui-toolkit';
import React from 'react';

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

  return (
    <OptionList options={settingsOptions} title={title} subtitle={subtitle} />
  );
};
