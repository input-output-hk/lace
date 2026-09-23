import { Image } from 'expo-image';
import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  Text as NativeText,
  TextInput,
  View,
} from 'react-native';

import { radius, spacing, useTheme } from '../../../design-tokens';
import { Icon, Row } from '../../atoms';
import { Text } from '../../atoms/text/text';

import type { Theme } from '../../../design-tokens';
import type { ImageSource } from 'expo-image';

export const AVATAR_SIZE = 32;

const NUMERIC_INPUT_REGEX = /^\d*\.?\d*$/;

export interface SwapInputToken {
  name: string;
  /** Raster/URI icon (e.g. wallet asset image). */
  icon?: ImageSource;
  /** Vector icon node (e.g. a brand logo component); takes priority over `icon`. */
  iconNode?: React.ReactNode;
  balance?: string;
}

export interface SwapInputProps {
  token?: SwapInputToken;
  amount: string;
  fiatAmount?: string;
  /** Field label rendered above the token row. */
  label?: string;
  /** Replaces the bare balance figure next to the token name. */
  balanceHint?: string;
  error?: string;
  onTokenPress?: () => void;
  onAmountChange?: (value: string) => void;
  /** Rendered as direct Row children — each element must carry its own key. */
  quickActions?: React.ReactNode[];
  testID?: string;
  placeholder: string;
  disabled?: boolean;
}

export interface SwapInputHandle {
  focus: () => void;
}

const TokenAvatar = ({
  token,
  styles,
  theme,
  testID,
}: {
  token: SwapInputProps['token'];
  styles: ReturnType<typeof getStyles>;
  theme: ReturnType<typeof useTheme>['theme'];
  testID?: string;
}) => {
  let content: React.ReactNode;
  if (token?.iconNode) {
    content = token.iconNode;
  } else if (token?.icon) {
    content = <Image source={token.icon} style={styles.avatarImage} />;
  } else {
    content = (
      <Icon name="Plus" size={AVATAR_SIZE * 0.5} color={theme.text.secondary} />
    );
  }
  return (
    <View style={styles.avatar} testID={testID}>
      {content}
    </View>
  );
};

export const SwapInput = forwardRef<SwapInputHandle, SwapInputProps>(
  (
    {
      token,
      amount,
      fiatAmount,
      label,
      balanceHint,
      error,
      onTokenPress,
      onAmountChange,
      testID,
      placeholder,
      quickActions,
      disabled,
    },
    ref,
  ) => {
    const { theme } = useTheme();
    const styles = useMemo(() => getStyles(theme), [theme]);
    const isIdle = !token;

    const hasError = error !== undefined && error !== '';

    const inputRef = useRef<TextInput>(null);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
    }));

    const handleChangeText = (value: string) => {
      const normalized = value.replace(',', '.');
      if (!NUMERIC_INPUT_REGEX.test(normalized)) return;
      onAmountChange?.(normalized);
    };

    return (
      <View
        style={[styles.container, hasError && styles.containerError]}
        testID={testID}>
        {label !== undefined && (
          <Text.XS
            variant="secondary"
            weight="medium"
            testID={testID ? `${testID}-label` : undefined}>
            {label}
          </Text.XS>
        )}
        <Pressable
          style={styles.tokenSelector}
          // No picker → not pressable, so the row doesn't offer a pointer
          // cursor / focus target it can't honor.
          disabled={onTokenPress === undefined}
          onPress={() => {
            onTokenPress?.();
          }}
          testID={testID ? `${testID}-token-selector` : undefined}>
          <TokenAvatar
            token={token}
            styles={styles}
            theme={theme}
            testID={testID ? `${testID}-avatar` : undefined}
          />
          <Text.XS
            style={styles.tokenName}
            variant={isIdle ? 'secondary' : 'primary'}
            weight="medium"
            numberOfLines={1}>
            {token?.name ?? placeholder}
          </Text.XS>
          <Text.XS variant="secondary" weight="medium">
            {balanceHint ?? token?.balance ?? '0.00'}
          </Text.XS>
          {onTokenPress !== undefined && (
            <View style={styles.chevronSeparator}>
              <Icon name="CaretDown" size={16} color={theme.text.secondary} />
            </View>
          )}
        </Pressable>

        <View style={styles.divider} />

        <View style={styles.valueRow}>
          <View style={styles.valueContainer}>
            {disabled ? (
              // A disabled amount only ever displays an API-derived value, so
              // it renders as text — a read-only TextInput still takes focus,
              // draws an outline and shows a text cursor on web, all of which
              // read as editable.
              <NativeText
                style={[
                  styles.amountInput,
                  amount === '' && styles.amountPlaceholder,
                ]}
                numberOfLines={1}
                testID={testID ? `${testID}-amount-input` : undefined}>
                {amount === '' ? '0.00' : amount}
              </NativeText>
            ) : (
              <TextInput
                ref={inputRef}
                style={styles.amountInput}
                value={amount}
                onChangeText={handleChangeText}
                keyboardType="decimal-pad"
                inputMode="decimal"
                placeholder="0.00"
                placeholderTextColor={theme.text.secondary}
                testID={testID ? `${testID}-amount-input` : undefined}
              />
            )}
            {fiatAmount !== undefined && (
              <Text.XS variant="secondary" weight="medium">
                {`\u2248  ${fiatAmount}`}
              </Text.XS>
            )}
            {hasError && (
              <Text.XS style={styles.errorText} weight="medium">
                {error}
              </Text.XS>
            )}
          </View>
          {quickActions && quickActions.length > 0 && (
            <Row gap={spacing.S}>{quickActions}</Row>
          )}
        </View>
      </View>
    );
  },
);

SwapInput.displayName = 'SwapInput';

export const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.background.tertiary,
      borderRadius: radius.S,
      borderColor: theme.border.middle,
      borderWidth: 1,
      padding: spacing.M,
      gap: spacing.M,
      overflow: 'hidden',
    },
    tokenSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.S,
    },
    avatar: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      backgroundColor: theme.background.primary,
      borderColor: theme.border.middle,
      borderWidth: StyleSheet.hairlineWidth,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    avatarImage: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
    },
    tokenName: {
      flex: 1,
    },
    chevronSeparator: {
      borderLeftWidth: 1,
      borderLeftColor: theme.background.secondary,
      width: 24,
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    divider: {
      height: 1,
      width: '100%',
      backgroundColor: theme.border.middle,
    },
    valueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    valueContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    amountInput: {
      fontSize: 16,
      lineHeight: 20,
      color: theme.text.primary,
      padding: 0,
    },
    amountPlaceholder: {
      color: theme.text.secondary,
    },
    buttonsContainer: {
      flexDirection: 'row',
      gap: spacing.S,
    },
    actionButton: {
      backgroundColor: theme.background.primary,
      borderColor: theme.border.middle,
      borderWidth: 1,
      borderRadius: radius.M,
      height: 40,
      minWidth: 40,
      paddingHorizontal: spacing.S,
      justifyContent: 'center',
      alignItems: 'center',
    },
    actionButtonDisabled: {
      opacity: 0.3,
    },
    containerError: {
      borderColor: theme.background.negative,
    },
    errorText: {
      color: theme.background.negative,
    },
  });
