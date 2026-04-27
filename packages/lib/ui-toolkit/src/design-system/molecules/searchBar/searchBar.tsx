import type { StyleProp, TextInputProps, ViewStyle } from 'react-native';

import { useTranslation } from '@lace-contract/i18n';
import React from 'react';
import { StyleSheet, TextInput as RNTextInput } from 'react-native';

import { useTheme, spacing, radius } from '../../../design-tokens';
import { Icon, IconButton, Row } from '../../atoms';

import type { Theme } from '../../../design-tokens';
import type { IconName } from '../../atoms/icons/Icon';

export interface SearchBarAction {
  iconName: IconName;
  onPress: () => void;
  testID?: string;
  hasAscendingColor?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export interface SearchBarProps {
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  testID?: string;
  textInputProps?: Omit<
    TextInputProps,
    'onChangeText' | 'placeholder' | 'value'
  >;
  extraStyle?: StyleProp<ViewStyle>;
  actions?: SearchBarAction[];
}

export const SearchBar = ({
  value = '',
  onChangeText,
  placeholder,
  disabled = false,
  testID = 'search-bar',
  textInputProps,
  extraStyle = {},
  actions = [],
}: SearchBarProps) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const defaultPlaceholder = t('v2.search-bar.placeholder');
  const renderedPlaceholder = placeholder ?? defaultPlaceholder;

  const hasActions = actions.length > 0;

  const renderActions = () => {
    if (actions.length === 0) return null;

    return (
      <Row gap={spacing.M} style={styles.actionsContainer}>
        {actions.map((action, index) => {
          const hasAscendingColor = action.hasAscendingColor ?? false;
          return (
            <IconButton.Static
              key={index}
              icon={
                <Icon
                  name={action.iconName}
                  size={20}
                  color={theme.brand.white}
                />
              }
              onPress={action.onPress}
              containerStyle={StyleSheet.flatten([
                styles.actionButton,
                hasAscendingColor
                  ? styles.ascendingActionColor
                  : styles.regularActionColor,
                action.containerStyle,
              ])}
              testID={action.testID ?? `${testID}-action-${index}`}
            />
          );
        })}
      </Row>
    );
  };

  return (
    <Row
      alignItems="center"
      gap={spacing.S}
      style={[styles.container, disabled && styles.disabled, extraStyle]}
      testID={testID}>
      <Icon
        name="Search"
        color={theme.text.secondary}
        testID={`${testID}-icon`}
      />
      <Row
        style={[
          styles.inputContainer,
          hasActions && styles.inputContainerWithActions,
        ]}>
        <RNTextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={renderedPlaceholder}
          placeholderTextColor={theme.text.secondary}
          style={styles.input}
          editable={!disabled}
          testID={`${testID}-input`}
          {...textInputProps}
        />
      </Row>
      {renderActions()}
    </Row>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.background.secondary,
      borderRadius: radius.S,
      padding: spacing.M,
    },
    inputContainer: {
      flex: 1,
      minWidth: 0,
    },
    inputContainerWithActions: {
      paddingRight: spacing.XXXXL,
    },
    input: {
      flex: 1,
      color: theme.text.primary,
    },
    disabled: {
      opacity: 0.5,
    },
    actionsContainer: {
      position: 'absolute',
      right: spacing.M,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
    },
    actionButton: {
      height: 32,
      width: 32,
      padding: spacing.XS,
    },
    ascendingActionColor: {
      backgroundColor: theme.brand.ascending,
    },
    regularActionColor: {
      backgroundColor: theme.background.tertiary,
    },
  });
