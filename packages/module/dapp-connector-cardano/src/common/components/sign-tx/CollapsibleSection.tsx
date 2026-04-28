import {
  Column,
  CustomTag,
  Icon,
  Row,
  spacing,
  Text,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  UIManager,
} from 'react-native';

export interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  /** Initial expanded state. Default: true. */
  defaultOpen?: boolean;
  /** When true, header is not pressable. */
  disabled?: boolean;
  /** Shows info icon in header. Default: false. */
  showInfoIcon?: boolean;
  /** Base testID for this section; `-section-header` and `-section-content` are appended. */
  testID?: string;
}

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const LAYOUT_ANIMATION_CONFIG = {
  duration: 200,
  update: {
    type: LayoutAnimation.Types.easeInEaseOut,
  },
};

/**
 * Collapsible section with header and expandable content.
 * Used in SignTx to group addresses, certificates, and governance actions.
 */
export const CollapsibleSection = ({
  title,
  children,
  defaultOpen = true,
  disabled = false,
  showInfoIcon = false,
  testID,
}: CollapsibleSectionProps) => {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const rotateAnim = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: isOpen ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isOpen, rotateAnim]);

  const chevronRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const handlePress = useCallback(() => {
    if (disabled) return;
    LayoutAnimation.configureNext(LAYOUT_ANIMATION_CONFIG);
    setIsOpen(previous => !previous);
  }, [disabled]);

  return (
    <Column testID={testID} gap={spacing.L}>
      <Pressable
        onPress={handlePress}
        disabled={disabled}
        testID={testID ? `${testID}-section-header` : undefined}>
        <Row alignItems="center" justifyContent="space-between">
          <Row alignItems="center" gap={spacing.S}>
            <Text.XS>{title}</Text.XS>
            {showInfoIcon && (
              <Icon
                name="InformationCircle"
                size={20}
                color={theme.text.secondary}
                variant="stroke"
              />
            )}
          </Row>
          <CustomTag
            size="M"
            color="white"
            icon={
              <Animated.View
                style={{ transform: [{ rotate: chevronRotation }] }}>
                <Icon name="CaretDown" size={20} variant="stroke" />
              </Animated.View>
            }
          />
        </Row>
      </Pressable>

      {isOpen && (
        <Column
          testID={testID ? `${testID}-section-content` : undefined}
          gap={spacing.L}>
          {children}
        </Column>
      )}
    </Column>
  );
};
