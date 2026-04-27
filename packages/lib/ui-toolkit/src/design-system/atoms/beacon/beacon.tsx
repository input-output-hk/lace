import React from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '../../../design-tokens';
import { getBackgroundColor } from '../../util/commons';
import { useColor } from '../../util/hooks/useColor';

import type { BackgroundType, ColorType } from '../../util/commons';

export interface BeaconProps {
  color?: ColorType;
  icon?: React.ReactNode;
  backgroundType?: BackgroundType;
  size?: number;
  /** When set, overrides color/backgroundType to use this exact background (e.g. theme.brand.white for solid white in both themes). */
  backgroundColor?: string;
  testID?: string;
}

interface StylesProps {
  backgroundColorMap: Record<ColorType, string>;
  color: ColorType | undefined;
  backgroundType: BackgroundType;
  size: number;
  backgroundColorOverride?: string;
}

export const Beacon = ({
  color,
  icon,
  backgroundType = 'colored',
  size = spacing.M,
  backgroundColor: backgroundColorOverride,
  testID,
}: BeaconProps) => {
  const { backgroundColorMap } = useColor();

  const styles = getStyles({
    backgroundColorMap,
    color,
    backgroundType,
    size,
    backgroundColorOverride,
  });

  return (
    <View style={styles.container} testID={testID}>
      {!!icon && icon}
    </View>
  );
};

const getStyles = (props: StylesProps) => {
  const {
    backgroundColorMap,
    color,
    backgroundType,
    size,
    backgroundColorOverride,
  } = props;
  const backgroundColor =
    backgroundColorOverride ??
    getBackgroundColor(backgroundColorMap, color, backgroundType);

  return StyleSheet.create({
    container: {
      width: size,
      height: size,
      borderRadius: radius.rounded,
      backgroundColor,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
  });
};
