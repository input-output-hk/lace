import type { StyleProp, ViewStyle } from 'react-native';

import React, { useState, createContext, useContext } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { spacing } from '../../../design-tokens';
import { Column, Divider, Icon, IconButton, Row, Text } from '../../atoms';

import type { SharedValue } from 'react-native-reanimated';

interface AccordionContextType {
  expanded: SharedValue<boolean>;
  isExpanded: boolean;
  isInitiallyExpanded: boolean;
  toggleExpanded: () => void;
  openDuration?: number;
  closeDuration?: number;
}

const AccordionContext = createContext<AccordionContextType | undefined>(
  undefined,
);

const useAccordionContext = () => {
  const context = useContext(AccordionContext);
  if (context === undefined) {
    throw new Error(
      'Accordion components must be used within an Accordion.Root',
    );
  }
  return context;
};

interface RootProps {
  children: React.ReactNode;
  isInitiallyExpanded?: boolean;
  style?: StyleProp<ViewStyle>;
  openDuration?: number;
  closeDuration?: number;
  title?: string;
  testID?: string;
}

interface TriggerProps {
  accordionHeadingOpen: string;
  accordionHeadingClosed: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

interface ContentProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const Root = ({
  children,
  isInitiallyExpanded = false,
  style,
  openDuration = 200,
  closeDuration = 70,
  title,
  testID,
}: RootProps) => {
  const [isExpanded, setIsExpanded] = useState(isInitiallyExpanded);
  const expanded = useSharedValue(isInitiallyExpanded);
  const rotationValue = useSharedValue(isInitiallyExpanded ? 180 : 0);

  const toggleExpanded = () => {
    const willBeExpanded = !isExpanded;
    setIsExpanded(willBeExpanded);
    expanded.value = willBeExpanded;

    rotationValue.value = withTiming(willBeExpanded ? 180 : 0, {
      duration: 300,
    });
  };

  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          rotate: `${rotationValue.value}deg`,
        },
      ],
    };
  }, [rotationValue]);

  const contextValue = {
    expanded,
    isExpanded,
    isInitiallyExpanded,
    toggleExpanded,
    openDuration,
    closeDuration,
  };

  if (title) {
    return (
      <AccordionContext.Provider value={contextValue}>
        <Divider />
        <Column style={style}>
          <TouchableOpacity onPress={toggleExpanded} style={styles.header}>
            <Row justifyContent="space-between" alignItems="center">
              <Text.M variant="secondary" testID={testID}>
                {title}
              </Text.M>
              <Animated.View style={[styles.arrow, animatedIconStyle]}>
                <Icon name="CaretDown" />
              </Animated.View>
            </Row>
          </TouchableOpacity>
          {isExpanded && <View>{children}</View>}
        </Column>
      </AccordionContext.Provider>
    );
  }

  return (
    <AccordionContext.Provider value={contextValue}>
      <View style={style}>{children}</View>
    </AccordionContext.Provider>
  );
};

const Trigger = ({
  accordionHeadingOpen,
  accordionHeadingClosed,
  style,
  children,
}: TriggerProps) => {
  const { toggleExpanded, isExpanded, isInitiallyExpanded } =
    useAccordionContext();
  const icon = isInitiallyExpanded ? (
    <Icon name="CaretUp" />
  ) : (
    <Icon name="CaretDown" />
  );

  return children ? (
    <View onTouchEnd={toggleExpanded}>{children}</View>
  ) : (
    <View style={style}>
      <IconButton.Animated
        label={{
          content: isExpanded ? accordionHeadingOpen : accordionHeadingClosed,
          position: 'left',
        }}
        icon={icon}
        onPressAnimation={toggleExpanded}
        rotateTo={180}
        duration={300}
      />
    </View>
  );
};

const Content = ({ children, style }: ContentProps) => {
  const { expanded, openDuration, closeDuration } = useAccordionContext();
  const height = useSharedValue(0);

  const derivedHeight = useDerivedValue(() =>
    withTiming(height.value * Number(expanded.value), {
      duration: expanded.value ? openDuration : closeDuration,
    }),
  );

  const bodyStyle = useAnimatedStyle(
    () => ({
      height: derivedHeight.value,
    }),
    [derivedHeight],
  );

  return (
    <Animated.View style={[styles.animatedView, bodyStyle, style]}>
      <View
        onLayout={event => {
          height.value = event.nativeEvent.layout.height;
        }}
        style={styles.wrapper}>
        {children}
      </View>
    </Animated.View>
  );
};

const AccordionContent = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.contentContainer}>{children}</View>
);

export const Accordion = {
  Root,
  Trigger,
  Content,
  AccordionContent,
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
  },
  animatedView: {
    width: '100%',
    overflow: 'hidden',
  },
  header: {
    paddingVertical: spacing.M,
  },
  arrow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    paddingTop: spacing.M,
    paddingBottom: spacing.M,
  },
});
