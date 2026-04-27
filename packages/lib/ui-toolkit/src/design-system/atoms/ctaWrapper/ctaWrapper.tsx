import type { ReactNode } from 'react';
import type { ViewStyle } from 'react-native';

import React from 'react';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { IconButton } from '..';

export type CtaButtonVariant = 'critical' | 'primary' | 'secondary';

export type CtaButtonProps = {
  icon?: ReactNode;
  label?: string;
  onPress: () => void;
  testID?: string;
  isDisabled?: boolean;
  style?: ViewStyle | ViewStyle[];
};

const labelOnlyLayout = StyleSheet.create({
  slot: { alignSelf: 'stretch' },
  pressable: {
    flex: 1,
    alignSelf: 'stretch',
  },
});

export const CtaButtonWrapper = memo((props: CtaButtonProps) => {
  const { icon, label, onPress, testID, isDisabled, style } = props;
  const isSingleElement = (label && !icon) || (!label && icon);

  const outerStyle = StyleSheet.flatten([
    style,
    isSingleElement ? labelOnlyLayout.slot : undefined,
  ]);
  const containerStyle = isSingleElement
    ? StyleSheet.flatten([style, labelOnlyLayout.pressable])
    : style;

  return (
    <View style={outerStyle}>
      <IconButton.Static
        onPress={onPress}
        disabled={isDisabled}
        testID={testID}
        label={label ? { position: 'center', content: label } : undefined}
        icon={icon as React.ReactElement}
        containerStyle={containerStyle}
      />
    </View>
  );
});
