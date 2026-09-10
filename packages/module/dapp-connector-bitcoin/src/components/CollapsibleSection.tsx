import {
  Column,
  CustomTag,
  Icon,
  Row,
  spacing,
  Text,
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
 * Used across the sign review screens to group the transaction summary, the
 * From/To address lists, and the raw PSBT data.
 */
export const CollapsibleSection = ({
  title,
  children,
  defaultOpen = true,
  testID,
}: CollapsibleSectionProps) => {
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
    LayoutAnimation.configureNext(LAYOUT_ANIMATION_CONFIG);
    setIsOpen(previous => !previous);
  }, []);

  return (
    <Column testID={testID} gap={spacing.L}>
      <Pressable
        onPress={handlePress}
        testID={testID ? `${testID}-section-header` : undefined}>
        <Row alignItems="center" justifyContent="space-between">
          <Text.XS>{title}</Text.XS>
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
