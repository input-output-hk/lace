import type { ReactNode } from 'react';

import type { IconName } from '../../atoms';

export interface ButtonConfig {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  preIconName?: IconName;
  iconColor?: string;
  testID?: string;
}

export interface SheetFooterProps {
  primaryButton?: ButtonConfig;
  secondaryButton?: ButtonConfig;
  primaryVariant?: 'critical' | 'primary';
  showDivider?: boolean;
  /** Stack buttons vertically instead of side-by-side. Primary renders on top, secondary below. */
  vertical?: boolean;
  /** Optional content rendered below the divider with transparent background (e.g. title + icon, passed from outside) */
  titleRow?: ReactNode;
  testID?: string;
}
