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
  color?: string;
  size?: number;
  strokeWidth?: number;
  testID?: string;
}

export const Icon = ({
  name,
  color,
  size = 24,
  strokeWidth,
  ...props
}: HugeIconProps) => {
  const { theme } = useTheme();

  if (name in CustomIcons) {
    const IconComponent = CustomIcons[name as CustomIconName];
    return (
      <IconComponent
        size={size}
        color={color}
        testID={props?.testID}
        {...props}
      />
    );
  }

  const defaultColor = color ?? theme.icons.background;
  const IconComponent = iconMap[name as HugeIconName];
  if (!IconComponent) return null;

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
