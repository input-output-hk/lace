import type { ReactNode, Ref } from 'react';
import type {
  ScrollViewProps,
  StyleProp,
  ViewProps,
  ViewStyle,
} from 'react-native';

import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useTrueSheet } from '@lodev09/react-native-true-sheet';
import React, { useCallback, useMemo } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, useTheme } from '../../../design-tokens';
import {
  Avatar,
  Button,
  Column,
  Divider,
  Icon,
  IconButton,
  Row,
  Text,
} from '../../atoms';
import { isWeb } from '../../util';
import { getAssetImageUrl } from '../../util';

import type { Theme } from '../../../design-tokens';
import type { IconName } from '../../atoms';
import type { ButtonVariant } from '../../atoms/button/button.types';
import type {
  BottomSheetScrollableProps,
  BottomSheetScrollViewMethods,
} from '@gorhom/bottom-sheet';
import type { AnimatedProps } from 'react-native-reanimated';
import type { EdgeInsets } from 'react-native-safe-area-context';

export const footerHeight = {
  horizontal: isWeb ? 80 : 100,
  vertical: isWeb ? 115 : 200,
  titleRow: 70,
};
const AVATAR_SIZE = 20;
const isIPad = Platform.OS === 'ios' && Platform.isPad;

type WebScrollableProps = BottomSheetScrollableProps &
  Omit<
    AnimatedProps<ScrollViewProps>,
    'decelerationRate' | 'ref' | 'scrollEventThrottle'
  >;

type SheetScrollProps = Omit<ScrollViewProps, 'ref'> &
  WebScrollableProps & {
    ref?: Ref<BottomSheetScrollViewMethods | ScrollView>;
    children: ReactNode | ReactNode[];
  };

type HeaderAvatar = {
  metadata: {
    image?: string;
    fallback?: string;
  };
};

interface SheetHeaderProps {
  title: string;
  leftIcon?: IconName;
  leftIconOnPress?: () => void;
  subtitle?: string;
  testID?: string;
  headerIcon?: IconName;
  headerAvatar?: HeaderAvatar;
  showDivider?: boolean;
  height?: number;
  handleClose?: () => void;
}

export interface ButtonConfig {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  preIconName?: IconName;
  iconColor?: string;
  testID?: string;
}

interface SheetFooterProps {
  primaryButton?: ButtonConfig;
  secondaryButton?: ButtonConfig;
  primaryVariant?: 'critical' | 'primary';
  vertical?: boolean;
  showDivider?: boolean;
  titleRow?: ReactNode;
  testID?: string;
}

const SheetContainer = ({ children, style, ...props }: ViewProps) => {
  const containerStyle: StyleProp<ViewStyle> = useMemo(
    () => ({
      padding: spacing.M,
      ...(!!style && { style }),
    }),
    [style],
  );

  return (
    <View {...props} style={containerStyle}>
      {children}
    </View>
  );
};

const Header = ({
  title,
  leftIcon = 'CaretLeft',
  leftIconOnPress,
  handleClose,
  subtitle,
  headerIcon,
  headerAvatar,
  showDivider = true,
  testID = 'sheet-header',
}: SheetHeaderProps) => {
  const { theme } = useTheme();

  const { dismissAll } = useTrueSheet();

  const headerStyles = getHeaderStyles({ theme });

  const onClosePress = useCallback(() => {
    if (handleClose) {
      handleClose();
    } else {
      void dismissAll();
    }
  }, [dismissAll, handleClose]);

  const avatarContent = useMemo(() => {
    const imageUrl = getAssetImageUrl(headerAvatar?.metadata?.image);

    return {
      fallback: headerAvatar?.metadata?.fallback,
      ...(imageUrl && { img: { uri: imageUrl } }),
    };
  }, [headerAvatar]);

  return (
    <Column testID={testID} style={styles.headerContainer}>
      <Row alignItems="center" justifyContent="center" style={styles.headerRow}>
        {leftIconOnPress && (
          <IconButton.Static
            icon={<Icon name={leftIcon} size={24} />}
            onPress={leftIconOnPress}
            containerStyle={styles.leftIcon}
            testID={`${testID}-left-icon`}
          />
        )}
        <Row
          alignItems="center"
          justifyContent="center"
          style={styles.titleContainer}
          gap={spacing.S}>
          {!!headerIcon && <Icon name={headerIcon} />}
          {!!headerAvatar && (
            <Avatar
              size={AVATAR_SIZE}
              shape="rounded"
              content={avatarContent}
            />
          )}
          <Text.S numberOfLines={1} align="center" testID={`${testID}-title`}>
            {title}
          </Text.S>
        </Row>
        {isWeb && (
          <IconButton.Static
            icon={<Icon name="Cancel" size={20} />}
            onPress={onClosePress}
            containerStyle={headerStyles.closeButton}
            testID={'side-sheet-close-button'}
          />
        )}
      </Row>
      {showDivider && (
        <View style={styles.divider}>
          <Divider />
        </View>
      )}
      {subtitle && (
        <Text.S
          align="center"
          style={styles.subtitle}
          testID={`${testID}-subtitle`}>
          {subtitle}
        </Text.S>
      )}
    </Column>
  );
};

const getFooterStyles = ({
  insets,
  theme,
}: {
  insets: EdgeInsets;
  theme: Theme;
}) =>
  StyleSheet.create({
    footer: {
      // On iPad, the sheet is displayed as a floating modal, so bottom padding is not needed.
      paddingBottom: spacing.S + (isIPad ? 0 : insets.bottom),
      paddingHorizontal: spacing.M,
      backgroundColor: theme.background.page,
    },
  });

const getHeaderStyles = ({ theme }: { theme: Theme }) =>
  StyleSheet.create({
    closeButton: {
      backgroundColor: theme.background.primary,
      position: 'absolute',
      right: spacing.M,
      zIndex: 1,
    },
  });

const Footer = ({
  primaryButton,
  secondaryButton,
  primaryVariant = 'primary',
  vertical = false,
  showDivider = true,
  titleRow,
  testID = 'sheet-footer',
}: SheetFooterProps) => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const footerStyles = getFooterStyles({ insets, theme });

  const PrimaryButtonComponent =
    primaryVariant === 'critical' ? Button.Critical : Button.Primary;
  const SecondaryButtonComponent = Button.Secondary;

  const ButtonsContainer = vertical ? Column : Row;

  return (
    <Column style={footerStyles.footer} gap={spacing.S} testID={testID}>
      {showDivider && <Divider />}
      {titleRow}
      <ButtonsContainer
        alignItems={vertical ? 'stretch' : 'center'}
        gap={spacing.S}>
        {!vertical && secondaryButton && (
          <SecondaryButtonComponent
            flex={1}
            label={secondaryButton.label}
            onPress={secondaryButton.onPress}
            loading={secondaryButton.loading}
            disabled={secondaryButton.disabled}
            preIconName={secondaryButton.preIconName}
            iconColor={secondaryButton.iconColor}
            testID={secondaryButton.testID}
          />
        )}
        {primaryButton && (
          <PrimaryButtonComponent
            flex={vertical ? undefined : 1}
            label={primaryButton.label}
            onPress={primaryButton.onPress}
            loading={primaryButton.loading}
            disabled={primaryButton.disabled}
            preIconName={primaryButton.preIconName}
            iconColor={primaryButton.iconColor}
            testID={primaryButton.testID}
          />
        )}
        {vertical && secondaryButton && (
          <SecondaryButtonComponent
            label={secondaryButton.label}
            onPress={secondaryButton.onPress}
            loading={secondaryButton.loading}
            disabled={secondaryButton.disabled}
            preIconName={secondaryButton.preIconName}
            iconColor={secondaryButton.iconColor}
            testID={secondaryButton.testID}
          />
        )}
      </ButtonsContainer>
    </Column>
  );
};

const Scroll = (props: SheetScrollProps) => {
  const { children, ref, contentContainerStyle, ...restProps } = props;

  const mergedContentContainerStyle = useMemo(
    () => [styles.scrollContentContainer, contentContainerStyle],
    [contentContainerStyle],
  );

  if (isWeb) {
    return (
      <BottomSheetScrollView
        keyboardShouldPersistTaps={props.keyboardShouldPersistTaps ?? 'handled'}
        ref={ref as Ref<BottomSheetScrollViewMethods>}
        contentContainerStyle={mergedContentContainerStyle}
        {...restProps}>
        {children}
      </BottomSheetScrollView>
    );
  }

  return (
    <ScrollView
      ref={ref as Ref<ScrollView>}
      contentContainerStyle={mergedContentContainerStyle}
      showsVerticalScrollIndicator={false}
      {...restProps}>
      {children}
    </ScrollView>
  );
};

export const Sheet = Object.assign(SheetContainer, {
  Header,
  Footer,
  Scroll,
});

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: spacing.L,
  },
  headerRow: {
    position: 'relative',
  },
  leftIcon: {
    backgroundColor: 'transparent',
    position: 'absolute',
    left: 0,
    zIndex: 1,
  },
  titleContainer: {
    flex: 1,
    marginVertical: spacing.S,
  },
  divider: {
    marginTop: spacing.M,
    marginHorizontal: spacing.M,
  },
  subtitle: {
    marginTop: spacing.M,
    marginHorizontal: spacing.M,
  },
  scrollContentContainer: {
    padding: spacing.M,
  },
});
