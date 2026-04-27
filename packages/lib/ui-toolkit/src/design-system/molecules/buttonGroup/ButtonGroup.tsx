import type { ViewStyle } from 'react-native';

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../../../design-tokens';
import { Button } from '../../atoms/button/button';

import type { ButtonProps } from '../../atoms/button/button.types';

export type ButtonGroupProps = {
  btns: ButtonProps[];
  buttonGroupStyle?: ViewStyle;
};

export const ButtonGroup = ({ btns, buttonGroupStyle }: ButtonGroupProps) => {
  const ButtonGroupSize = Button.Root;
  return (
    <View style={[styles.default, buttonGroupStyle]}>
      {btns.map((button, index) => (
        <ButtonGroupSize
          {...button}
          flex={1}
          label={button.label}
          variant={button.variant}
          postNode={button.postNode === undefined ? null : button.postNode}
          key={`btn-${index}`}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  default: {
    justifyContent: 'space-between',
    display: 'flex',
    flex: 1,
    gap: spacing.M,
  },
  button: {
    flex: 1,
  },
});
