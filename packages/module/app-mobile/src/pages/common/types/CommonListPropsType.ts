import type { IconName } from '@lace-lib/ui-toolkit';

export type ListOptionType = {
  id: string;
  titleKey: string;
  subtitleKey?: string;
  icon: IconName;
  onPress: () => void;
};
