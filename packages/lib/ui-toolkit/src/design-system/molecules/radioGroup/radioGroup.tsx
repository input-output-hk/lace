import type { ViewStyle, StyleProp } from 'react-native';

import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { spacing } from '../../../design-tokens';
import { Column, Icon, RadioButton, Row, Text } from '../../atoms';

import type { IconName } from '../../atoms';

export interface RadioGroupOption {
  value: string;
  label?: string;
  preIcon?: IconName;
  postIcon?: IconName;
  showInfoPostIcon?: boolean;
  isDisabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

interface RadioGroupProps {
  options: RadioGroupOption[];
  value: string;
  onChange: (value: string) => void;
  testID?: string;
  direction?: 'column' | 'row';
  style?: StyleProp<ViewStyle>;
}

export const RadioGroup = ({
  options,
  value,
  onChange,
  testID,
  direction = 'row',
  style,
}: RadioGroupProps) => {
  const Container = direction === 'column' ? Column : Row;
  const handleSelect = (optionValue: string, isDisabled?: boolean) => {
    if (!isDisabled) onChange(optionValue);
  };

  return (
    <Container gap={spacing.L} testID={testID} style={style}>
      {options.map(option => (
        <Row
          key={option.value}
          alignItems="center"
          gap={spacing.S}
          style={styles.optionRow}>
          <RadioButton
            isChecked={value === option.value}
            isDisabled={option.isDisabled}
            onRadioValueChange={() => {
              handleSelect(option.value, option.isDisabled);
            }}
            style={option.style}
            testID={`radio-button-${option.value}`}
          />
          <Pressable
            onPress={() => {
              handleSelect(option.value, option.isDisabled);
            }}
            disabled={option.isDisabled}>
            <Row alignItems="center" gap={spacing.S}>
              {option.preIcon && (
                <Icon
                  name={option.preIcon}
                  size={20}
                  testID={`option-icon-${option.value}`}
                />
              )}
              {!!option.label && (
                <Text.S testID={`option-label-${option.value}`}>
                  {option.label}
                </Text.S>
              )}
              {option.postIcon && (
                <Icon
                  name={option.postIcon}
                  testID={`option-post-icon-${option.value}`}
                />
              )}
              {option.showInfoPostIcon && (
                <Icon
                  name="Info"
                  size={25}
                  testID={`option-info-icon-${option.value}`}
                />
              )}
            </Row>
          </Pressable>
        </Row>
      ))}
    </Container>
  );
};

const styles = StyleSheet.create({
  optionRow: {
    cursor: 'pointer', // web: show pointer on hover
  },
});
