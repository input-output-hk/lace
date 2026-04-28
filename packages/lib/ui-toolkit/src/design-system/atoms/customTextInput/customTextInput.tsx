import type {
  ComponentProps,
  ComponentRef,
  ForwardedRef,
  ReactNode,
} from 'react';
import type { TextStyle, ViewStyle } from 'react-native';
import type { TextInputProps as RNTextInputProps } from 'react-native';

import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import React, {
  forwardRef,
  useState,
  useRef,
  useMemo,
  useCallback,
  useEffect,
} from 'react';
import {
  TextInput as RnTextInput,
  StyleSheet,
  View,
  Pressable,
} from 'react-native';
import { useSharedValue, withTiming, Easing } from 'react-native-reanimated';

import { Text, BlurView, Avatar, Row, IconButton, Icon, Loader } from '..';
import { useTheme, radius, spacing } from '../../../design-tokens';
import { isWeb, useControlledState } from '../../util';
import { AnimatedLabel } from '../animatedLabel/animatedLabel';
import {
  CtaButtonWrapper,
  type CtaButtonProps,
} from '../ctaWrapper/ctaWrapper';

import { checkStatus, getSize, renderCtaButtons } from './constants';

import type { IconButtonProps, IconName } from '..';
import type { Theme } from '../../../design-tokens';
import type { AvatarProps } from '../../../utils/avatarUtils';
import type { AnimatedLabelStyles } from '../animatedLabel/animatedLabel';

export type TextInputSize = 'large' | 'medium' | 'small';
export type TextInputStatus =
  | 'active'
  | 'default'
  | 'disabled'
  | 'hover'
  | 'loading';

type BaseCustomTextInputProps = {
  label?: string;
  size?: TextInputSize;
  isActive?: boolean;
  isHover?: boolean;
  isDisabled?: boolean;
  status?: TextInputStatus;
  preIcon?: ReactNode;
  postButton?: IconButtonProps;
  postIcon?: IconName;
  optionalNumber?: number;
  animatedLabel?: boolean;
  avatar?: AvatarProps;
  ctaButtons?: Array<CtaButtonProps | ReactNode>;
  largeHorizontal?: boolean;
  inputError?: string;
  styleOverrides?: Partial<CustomTextInputStyles>;
  readOnly?: boolean;
};

export type CustomTextInputProps =
  | (BaseCustomTextInputProps &
      ComponentProps<typeof BottomSheetTextInput> & {
        isWithinBottomSheet: true;
      })
  | (BaseCustomTextInputProps &
      RNTextInputProps & {
        isWithinBottomSheet?: false;
      });

export type CustomTextInputStyles = Partial<AnimatedLabelStyles> & {
  container: ViewStyle;
  blurView: ViewStyle;
  inputWrapper: ViewStyle;
  input: TextStyle;
  inputLarge: TextStyle;
  inputDisabled: TextStyle;
  inputWeb: TextStyle;
  preIcon: ViewStyle;
  loaderOverlay: ViewStyle;
  optNumberText: TextStyle;
  ctaButtonWrapper: ViewStyle;
  avatarWrapper: ViewStyle;
  inputError: TextStyle;
  mainContentWrapper: ViewStyle;
};

type BottomSheetTextInputProps = ComponentProps<typeof BottomSheetTextInput>;
type BottomSheetFocusEvent = Parameters<
  NonNullable<BottomSheetTextInputProps['onFocus']>
>[0];
type BottomSheetBlurEvent = Parameters<
  NonNullable<BottomSheetTextInputProps['onBlur']>
>[0];
type RNFocusEvent = Parameters<NonNullable<RNTextInputProps['onFocus']>>[0];
type RNBlurEvent = Parameters<NonNullable<RNTextInputProps['onBlur']>>[0];
type RnTextInputRef = ComponentRef<typeof RnTextInput>;

export const CustomTextInput = forwardRef<
  ComponentRef<typeof BottomSheetTextInput> | RnTextInputRef,
  CustomTextInputProps
>(
  (
    {
      value,
      label,
      onChangeText,
      testID,
      size = 'small',
      status = 'default',
      preIcon,
      postButton,
      postIcon,
      editable = true,
      optionalNumber,
      animatedLabel = false,
      avatar,
      ctaButtons,
      largeHorizontal = false,
      inputError,
      isDisabled,
      styleOverrides,
      readOnly = false,
      isWithinBottomSheet = false,
      ...restProps
    },
    ref,
  ) => {
    const { theme } = useTheme();
    const [isFocused, setIsFocused] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [internalValue, setInternalValue] = useControlledState(value, '');
    const inputRef = useRef<
      ComponentRef<typeof BottomSheetTextInput> | RnTextInputRef | null
    >(null);
    const labelAnim = useSharedValue(animatedLabel && !!value ? 1 : 0);

    // Create a callback ref that assigns to both the forwarded ref and inputRef
    const setInputRef = useCallback(
      (
        node: ComponentRef<typeof BottomSheetTextInput> | RnTextInputRef | null,
      ) => {
        inputRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref],
    );

    const isInputEditable = readOnly ? false : editable;
    const isChromeEditable = readOnly ? true : editable;
    const {
      isActive,
      isHover,
      isDisabled: isStatusDisabled,
      isLoading,
    } = checkStatus(status, isChromeEditable, isFocused, isHovered, isDisabled);

    const { isLarge, isSmall, containerHeight } = getSize(size);

    const filterTextStyles = (
      stylesArray: (TextStyle | false | null | undefined)[],
    ): TextStyle[] => stylesArray.filter(Boolean) as TextStyle[];

    const styles = useMemo(
      () =>
        getStyles(theme, {
          size,
          isActive,
          isHover,
          isDisabled: isStatusDisabled,
          inputError,
          styleOverrides,
        }),
      [
        theme,
        size,
        isActive,
        isHover,
        isStatusDisabled,
        inputError,
        styleOverrides,
      ],
    );

    const avatarNode = useMemo(() => {
      if (!avatar) return null;
      return (
        <View style={styles.avatarWrapper}>
          <Avatar
            content={avatar.content}
            size={avatar.size}
            shape={avatar.shape}
            isShielded={avatar.isShielded}
            testID={avatar.testID}
          />
        </View>
      );
    }, [avatar]);

    const textstyles = useMemo(
      () =>
        filterTextStyles([
          styles.input,
          isStatusDisabled && styles.inputDisabled,
          isLarge && styles.inputLarge,
          restProps.style as TextStyle,
        ]),
      [
        styles.input,
        styles.inputDisabled,
        styles.inputLarge,
        isStatusDisabled,
        isLarge,
        restProps.style,
      ],
    );

    const isMultiline = isLarge ?? restProps.multiline;
    const numberOfLines = isLarge ? 4 : restProps.numberOfLines;

    useEffect(() => {
      if (value !== undefined) {
        setInternalValue(value);
      }
    }, [value]);

    useEffect(() => {
      if (animatedLabel) {
        const shouldAnimate = isFocused || !!internalValue;
        labelAnim.value = withTiming(shouldAnimate ? 1 : 0, {
          duration: 200,
          easing: Easing.out(Easing.ease),
        });
      }
    }, [isFocused, internalValue, animatedLabel, labelAnim]);

    const handleBottomSheetFocus = useCallback(
      (event: BottomSheetFocusEvent) => {
        setIsFocused(true);
        restProps.onFocus?.(event);
      },
      [restProps.onFocus],
    );
    const handleRnFocus = useCallback(
      (event: RNFocusEvent) => {
        setIsFocused(true);
        restProps.onFocus?.(event);
      },
      [restProps.onFocus],
    );

    const handleChangeText = useCallback(
      (text: string) => {
        setInternalValue(text);
        onChangeText?.(text);
      },
      [onChangeText],
    );

    const handleBottomSheetBlur = useCallback(
      (event: BottomSheetBlurEvent) => {
        setIsFocused(false);
        restProps.onBlur?.(event);
      },
      [restProps.onBlur],
    );

    const handleRnBlur = useCallback(
      (event: RNBlurEvent) => {
        setIsFocused(false);
        restProps.onBlur?.(event);
      },
      [restProps.onBlur],
    );

    const handleOverIn = useCallback(() => {
      setIsHovered(true);
    }, []);

    const handleOverOut = useCallback(() => {
      setIsHovered(false);
    }, []);

    const shouldShowSideElements =
      size === 'medium' || largeHorizontal || !!avatar;

    const inputProps = useMemo(
      () => ({
        onFocus: isWithinBottomSheet ? handleBottomSheetFocus : handleRnFocus,
        onBlur: isWithinBottomSheet ? handleBottomSheetBlur : handleRnBlur,
        onChangeText: handleChangeText,
        editable: isInputEditable,
        multiline: isMultiline,
        numberOfLines,
        placeholderTextColor: theme.text.tertiary,
        value: value !== undefined ? value : internalValue,
        ...restProps,
        style: textstyles,
        testID: testID ? `${testID}-value` : 'input-value',
        showsVerticalScrollIndicator: false,
        showsHorizontalScrollIndicator: false,
      }),
      [
        isWithinBottomSheet,
        handleBottomSheetFocus,
        handleRnFocus,
        handleBottomSheetBlur,
        handleRnBlur,
        handleChangeText,
        isInputEditable,
        isMultiline,
        numberOfLines,
        theme.text.tertiary,
        value,
        internalValue,
        restProps,
        textstyles,
        testID,
      ],
    );

    const renderInput = useCallback(() => {
      const shouldUseBottomSheetInput = isWithinBottomSheet && !isWeb;
      return shouldUseBottomSheetInput ? (
        <BottomSheetTextInput
          ref={
            setInputRef as ForwardedRef<
              ComponentRef<typeof BottomSheetTextInput>
            >
          }
          {...inputProps}
        />
      ) : (
        <RnTextInput
          ref={setInputRef as ForwardedRef<RnTextInputRef>}
          {...inputProps}
          style={[inputProps.style, isWeb ? styles.inputWeb : undefined]}
        />
      );
    }, [isWithinBottomSheet, inputProps, isWeb, setInputRef]);

    return (
      <BlurView style={styles.blurView} testID={testID}>
        <Pressable
          style={styles.inputWrapper}
          tabIndex={-1}
          disabled={isStatusDisabled || isLoading}
          onPress={() => inputRef.current?.focus()}
          onHoverIn={handleOverIn}
          onHoverOut={handleOverOut}
          pointerEvents={isLoading || isStatusDisabled ? 'none' : 'auto'}>
          {shouldShowSideElements && avatarNode}
          {preIcon && <View style={styles.preIcon}>{preIcon}</View>}

          {isSmall && optionalNumber && (
            <Text.XS variant="secondary" style={styles.optNumberText}>
              {optionalNumber}
            </Text.XS>
          )}
          <Row
            justifyContent="space-between"
            alignItems="center"
            style={styles.mainContentWrapper}>
            <View style={styles.container}>
              <AnimatedLabel
                label={label}
                animatedLabel={animatedLabel}
                labelAnim={labelAnim}
                containerHeight={containerHeight}
                theme={theme}
                isLarge={isLarge}
                styleOverrides={styleOverrides}
                testID={`${testID}-label`}
              />

              {renderInput()}
              {!!inputError && (
                <Text.XS
                  style={styles.inputError}
                  testID={`${testID}-input-error`}>
                  {inputError}
                </Text.XS>
              )}
            </View>

            {!!postButton && <IconButton.Static {...postButton} />}
            {!!postIcon && <Icon name={postIcon} />}
            {Array.isArray(ctaButtons) && ctaButtons.length > 0 && (
              <View style={styles.ctaButtonWrapper}>
                {renderCtaButtons(
                  ctaButtons.filter(Boolean) as CtaButtonProps[],
                  CtaButtonWrapper,
                )}
              </View>
            )}
          </Row>

          {isLoading && (
            <View style={styles.loaderOverlay}>
              <Loader size={20} />
            </View>
          )}
        </Pressable>
      </BlurView>
    );
  },
);

const getStyles = (
  theme: Theme,
  {
    size,
    isActive,
    isHover,
    isDisabled,
    inputError,
    styleOverrides,
  }: Omit<CustomTextInputProps, 'onChangeText' | 'testID' | 'value'>,
): CustomTextInputStyles => {
  const { isLarge, containerHeight } = getSize(size);
  const borderColor = inputError
    ? theme.data.negative
    : isActive || isHover
    ? theme.border.focused
    : theme.border.middle;

  return StyleSheet.create<CustomTextInputStyles>({
    container: {
      flex: 1,
      height: containerHeight,
      width: '100%',
      position: 'relative',
      justifyContent: !isWeb ? 'flex-end' : 'center',
      ...(styleOverrides?.container ?? {}),
    },
    blurView: {
      opacity: isDisabled ? 0.5 : 1,
      backgroundColor: theme.background.secondary,
      paddingVertical: spacing.XS,
      overflow: 'hidden',
      flexDirection: 'row',
      borderRadius: radius.S,
      borderWidth: 1,
      borderColor,
      margin: spacing.XS,
      ...(styleOverrides?.blurView ?? {}),
    },
    inputWrapper: {
      padding: spacing.XS,
      flexDirection: 'row',
      alignItems: isLarge ? 'flex-start' : 'center',
      position: 'relative',
      flexGrow: 1,
      ...(styleOverrides?.inputWrapper ?? {}),
    },
    input: {
      color: !isDisabled ? theme.text.primary : theme.text.tertiary,
      height: '100%',
      marginLeft: spacing.S,
      fontSize: 16, // not an atom but an RN built-in element
      ...(styleOverrides?.input ?? {}),
    },
    inputLarge: {
      minHeight: 80,
      textAlignVertical: 'top',
      paddingTop: spacing.M,
      ...(styleOverrides?.inputLarge ?? {}),
    },
    inputDisabled: {
      cursor: 'auto',
      color: theme.text.tertiary,
      ...(styleOverrides?.inputDisabled ?? {}),
    },
    preIcon: {
      paddingRight: spacing.S,
      ...(styleOverrides?.preIcon ?? {}),
    },
    loaderOverlay: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.background.secondary + 'CC',
      zIndex: 2,
      ...(styleOverrides?.loaderOverlay ?? {}),
    },
    optNumberText: {
      marginHorizontal: spacing.S,
      ...(styleOverrides?.optNumberText ?? {}),
    },
    ctaButtonWrapper: {
      flexDirection: 'row',
      gap: spacing.S,
      ...(styleOverrides?.ctaButtonWrapper ?? {}),
    },
    avatarWrapper: {
      marginHorizontal: spacing.S,
      ...(styleOverrides?.avatarWrapper ?? {}),
    },
    inputError: {
      color: theme.data.negative,
      position: 'absolute',
      bottom: -3,
      left: spacing.S,
      ...(styleOverrides?.inputError ?? {}),
    },
    mainContentWrapper: {
      flex: 1,
      ...(styleOverrides?.mainContentWrapper ?? {}),
    },
    inputWeb: {
      outlineStyle: 'solid',
      outlineWidth: 0,
      scrollbarWidth: 'none',
    } as TextStyle,
  });
};
