import type { ImageSourcePropType } from 'react-native';

import { useTranslation } from '@lace-contract/i18n';
import React from 'react';
import { StyleSheet, View, Image, TextInput } from 'react-native';

import { radius, spacing, useTheme } from '../../../design-tokens';
import {
  getBackgroundColor,
  getIsDark,
  type ColorType,
  type BackgroundType,
} from '../../util/commons';
import { useColor } from '../../util/hooks';
import { BlurView } from '../blur-view/blur-view';
import { Text } from '../text/text';

import type { Theme } from '../../../design-tokens';

type SizeType = 'L' | 'M' | 'S' | 'XL';

export interface CustomTagProps {
  size?: SizeType;
  color?: ColorType | undefined;
  backgroundType?: BackgroundType;
  /** When set, overrides the background color from theme (e.g. '#000000' for pure black). */
  backgroundColor?: string;
  label?: string;
  /** When set, overrides the label text color (e.g. theme.brand.black on yellow background). */
  labelColor?: string;
  placeholder?: string;
  imageSource?: ImageSourcePropType;
  icon?: React.ReactNode;
  /** Rendered at the end of the tag (e.g. info icon). */
  trailingIcon?: React.ReactNode;
  value?: string;
  onChangeText?: (text: string) => void;
  testID?: string;
  isAlignStart?: boolean;
}

type StylesProps = {
  theme: Theme;
  backgroundColorMap: Record<ColorType, string>;
  color: ColorType | undefined;
  backgroundType: BackgroundType;
  backgroundColorOverride?: string;
  labelColorOverride?: string;
  size: SizeType;
  isSingleChild?: boolean;
  hasImageSource?: boolean;
  isAlignStart?: boolean;
};

/**
 * Get label color based on color type, background type and theme
 */
export const getLabelColor = (
  theme: Theme,
  color: ColorType | undefined,
  backgroundType: BackgroundType,
): string => {
  const { brand, text, data } = theme;
  const isDark = getIsDark(theme);

  if (!color) return text.primary;

  if (color === 'black' && backgroundType === 'colored') {
    return brand.white;
  }

  if (color === 'primary' && backgroundType === 'semiTransparent') {
    return isDark ? theme.brand.ascendingSecondary : theme.brand.ascending;
  }

  if (color === 'neutral') {
    if (backgroundType === 'colored') {
      return brand.yellow;
    }
    if (backgroundType === 'semiTransparent') {
      return isDark ? brand.yellow : brand.black;
    }
    return text.primary;
  }

  const statusColor = (status: 'negative' | 'positive') => {
    if (backgroundType === 'colored') return brand.white;
    if (backgroundType === 'semiTransparent') {
      return isDark ? data[status] : brand.black;
    }
    return text.primary;
  };

  if (color === 'negative' || color === 'positive') {
    return statusColor(color);
  }

  const isWhite = color === 'white';

  if (backgroundType === 'colored') {
    return isWhite ? (isDark ? brand.white : brand.black) : brand.white;
  }

  if (backgroundType === 'semiTransparent') {
    return isWhite ? (isDark ? brand.white : brand.black) : text.primary;
  }

  return text.primary;
};

const getLabelComponent = (size: SizeType) => {
  switch (size) {
    case 'S':
      return Text.XS;
    case 'M':
      return Text.XS;
    case 'L':
      return Text.S;
    case 'XL':
      return Text.M;
    default:
      return Text.XS;
  }
};

export const CustomTag = ({
  size = 'M',
  color,
  backgroundType = 'colored',
  backgroundColor,
  label,
  labelColor,
  placeholder,
  imageSource,
  icon,
  trailingIcon,
  value,
  onChangeText,
  testID,
  isAlignStart = false,
}: CustomTagProps) => {
  const { theme } = useTheme();
  const { backgroundColorMap } = useColor();
  const { t } = useTranslation();
  const defaultPlaceholder = t('v2.customTag.placeholder');

  const isSingleChild =
    !trailingIcon &&
    ((!!icon && !label && !imageSource && !placeholder) ||
      (!!label && !icon && !imageSource && !placeholder));

  const styles = getStyles({
    theme,
    backgroundColorMap,
    color,
    backgroundType,
    backgroundColorOverride: backgroundColor,
    labelColorOverride: labelColor,
    size,
    isSingleChild,
    hasImageSource: !!imageSource,
    isAlignStart,
  });

  const shouldUseBlur =
    backgroundType !== 'transparent' && color && !backgroundColor;

  const LabelComponent = label && size && getLabelComponent(size);

  const containerContent = (
    <View style={styles.container} testID={testID}>
      {imageSource ? (
        <View style={styles.assetWrapper}>
          <Image
            source={imageSource}
            style={styles.image}
            testID={testID ? `${testID}-image` : 'custom-tag-image'}
          />
        </View>
      ) : icon ? (
        <View
          style={styles.assetWrapper}
          testID={testID ? `${testID}-icon` : 'custom-tag-icon'}>
          {icon}
        </View>
      ) : null}
      {!!placeholder && (
        <TextInput
          value={value}
          style={styles.inputValue}
          onChangeText={onChangeText}
          placeholder={placeholder ?? defaultPlaceholder}
          placeholderTextColor={theme.text.tertiary}
          testID={testID ? `${testID}-input` : 'custom-tag-input'}
        />
      )}
      {!!label && LabelComponent && (
        <LabelComponent
          style={styles.label}
          testID={testID ? `${testID}-label` : 'custom-tag-label'}>
          {label}
        </LabelComponent>
      )}
      {trailingIcon ? (
        <View
          style={styles.trailingIconWrapper}
          testID={
            testID ? `${testID}-trailing-icon` : 'custom-tag-trailing-icon'
          }>
          {trailingIcon}
        </View>
      ) : null}
    </View>
  );

  return shouldUseBlur ? (
    <BlurView style={styles.blurView}>{containerContent}</BlurView>
  ) : (
    containerContent
  );
};

const getStyles = (props: StylesProps) => {
  const {
    theme,
    backgroundColorMap,
    color,
    backgroundType,
    backgroundColorOverride,
    labelColorOverride,
    size,
    isSingleChild,
    hasImageSource,
    isAlignStart,
  } = props;
  const paddingMap: Record<SizeType, number> = {
    S: spacing.XS,
    M: spacing.S,
    L: spacing.L,
    XL: spacing.XL,
  };

  const imageSizeMap: Record<SizeType, number> = {
    S: 15,
    M: 25,
    L: 30,
    XL: 35,
  };

  const resolvedBackgroundColor =
    backgroundColorOverride ??
    getBackgroundColor(backgroundColorMap, color, backgroundType);
  const labelColor =
    labelColorOverride ?? getLabelColor(theme, color, backgroundType);

  const padding = paddingMap[size];
  const imageSize = imageSizeMap[size];
  const borderRadius = isSingleChild
    ? radius.rounded
    : size === 'XL'
    ? radius.S
    : radius.M;
  const flexDirection = isSingleChild ? 'column' : 'row';
  const gap = isSingleChild ? 0 : spacing.XS;

  return StyleSheet.create({
    blurView: {
      overflow: 'hidden',
      borderRadius,
    },
    container: {
      borderRadius,
      backgroundColor: resolvedBackgroundColor,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection,
      gap,
      padding,
    },
    label: {
      color: labelColor,
      textAlign: isAlignStart ? 'left' : 'center',
      flexShrink: 1,
    },
    trailingIconWrapper: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    assetWrapper: {
      width: imageSize,
      height: imageSize,
      borderRadius: radius.L,
      overflow: hasImageSource ? 'hidden' : 'visible',
      alignItems: 'center',
      justifyContent: 'center',
    },
    image: {
      width: imageSize,
      height: imageSize,
      resizeMode: 'cover',
    },
    inputValue: {
      color: theme.text.primary,
      maxWidth: '40%',
    },
  });
};
