import { HugeiconsIcon } from '@hugeicons/react-native';
import React from 'react';

import { useTheme } from '../../../design-tokens';

import { CustomIcons } from './customIcons';
import { iconMap } from './IconMap';

import type { CustomIconName } from './customIcons';
import type { SvgProps } from 'react-native-svg';

export type HugeIconName = keyof typeof iconMap;

export type IconName = CustomIconName | HugeIconName;

interface HugeIconProps extends SvgProps {
  name: IconName;
  variant?: 'solid' | 'stroke';
  color?: string;
  size?: number;
  strokeWidth?: number;
  testID?: string;
}

export const Icon = ({
  name,
  variant = 'stroke',
  color,
  size = 24,
  strokeWidth,
  ...props
}: HugeIconProps) => {
  if (name in CustomIcons) {
    const IconComponent = CustomIcons[name as CustomIconName];
    return <IconComponent size={size} testID={props?.testID} {...props} />;
  }
  const { theme } = useTheme();

  const defaultColor = color ?? theme.icons.background;
  const icon = iconMap[name as HugeIconName];
  if (!icon) return null;

  const IconComponent = icon[variant];
  if (!IconComponent) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(`Missing ${variant} variant for icon "${name}"`);
    }
    return null;
  }

  return (
    <HugeiconsIcon
      icon={IconComponent}
      color={defaultColor}
      size={size}
      strokeWidth={strokeWidth}
      testID={props?.testID}
    />
  );
};
