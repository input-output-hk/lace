import type {
  PressableStateCallbackType,
  StyleProp,
  ViewStyle,
} from 'react-native';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';

import { useTheme, radius, spacing } from '../../../design-tokens';
import { getShadowStyle } from '../../../design-tokens/tokens/shadows';
import { Text, BlurView, Loader } from '../../atoms';
import { isWeb } from '../../util';

import type { Theme } from '../../../design-tokens';

export type TabItem<Value extends number | string> = {
  label: string;
  value?: Value;
  testID?: string;
  disabled?: boolean;
};

type NormalisedTabItem<Value extends number | string> = Required<
  TabItem<Value>
>;

type TabsProps<Value extends number | string> = {
  tabs: (TabItem<Value> | Value)[];
  value?: Value;
  selectedTab?: string;
  onSelectTab?: (index: number) => void;
  onChange?: (value: Value) => void;
  variant?: 'horizontal' | 'vertical';
  size?: 'compact' | 'default';
  loadingTabIndex?: number;
};

export const Tabs = <Value extends number | string>({
  tabs,
  value,
  selectedTab,
  onSelectTab,
  onChange,
  variant = 'horizontal',
  size = 'default',
  loadingTabIndex,
}: TabsProps<Value>) => {
  const { theme } = useTheme();
  const isCompact = size === 'compact';
  const styles = {
    ...commonStyles(theme),
    ...getHorizontalTabsStyles(theme, isCompact),
  };

  const normalizedTabs = useMemo<NormalisedTabItem<Value>[]>(
    () =>
      tabs.map((tab, index): NormalisedTabItem<Value> => {
        if (typeof tab === 'string' || typeof tab === 'number') {
          return {
            label: String(tab),
            value: tab,
            disabled: false,
            testID: String(tab),
          };
        }
        return {
          ...tab,
          value: tab.value ?? (index as Value),
          disabled: tab.disabled ?? false,
          testID: tab.testID ?? String(index),
        };
      }),
    [tabs],
  );

  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    if (value === undefined) return;
    const index = normalizedTabs.findIndex(tab => tab.value === value);
    if (index >= 0) {
      setSelectedIndex(index);
    }
  }, [value, normalizedTabs]);

  useEffect(() => {
    if (selectedTab) {
      const index = normalizedTabs.findIndex(tab => tab.label === selectedTab);
      if (index >= 0) {
        setSelectedIndex(index);
      }
    }
  }, [selectedTab, normalizedTabs]);

  if (variant === 'vertical') {
    return (
      <VerticalTabs
        normalizedTabs={normalizedTabs}
        value={value}
        selectedTab={selectedTab}
        onSelectTab={onSelectTab}
        onChange={onChange}
        loadingTabIndex={loadingTabIndex}
      />
    );
  }

  const handleSelectTab = useCallback(
    (index: number) => {
      const tab = normalizedTabs[index];
      if (tab.disabled || loadingTabIndex === index) return;

      setSelectedIndex(index);
      onSelectTab?.(index);
      const tabValue = tab.value;
      onChange?.(tabValue);
    },
    [onSelectTab, onChange, normalizedTabs, loadingTabIndex],
  );

  const getPressableStyle = useCallback(
    (index: number) =>
      (state: PressableStateCallbackType): StyleProp<ViewStyle> => {
        const isPressed = state.pressed;
        const isSelected = selectedIndex === index;
        const isDisabled = normalizedTabs[index]?.disabled;
        const isLoading = loadingTabIndex === index;
        const shouldShowHovered =
          hoveredIndex === index && !isDisabled && !isLoading;
        return [
          styles.tab,
          isSelected && !isDisabled && styles.selectedTab,
          shouldShowHovered && styles.hoveredTab,
          isPressed && !isDisabled && !isLoading && styles.pressedTab,
          isDisabled && styles.disabledTab,
        ].filter(Boolean);
      },
    [selectedIndex, styles, normalizedTabs, loadingTabIndex, hoveredIndex],
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabsContainer}>
        <BlurView style={styles.blurView} pointerEvents="none" />
        {normalizedTabs.map((tab, index) => {
          const isSelected = selectedIndex === index;
          const isDisabled = tab.disabled;
          const isLoading = loadingTabIndex === index;

          return (
            <Pressable
              key={index}
              testID={tab.testID}
              style={getPressableStyle(index)}
              onPress={() => {
                handleSelectTab(index);
              }}
              onHoverIn={() => {
                if (!isDisabled && !isLoading) setHoveredIndex(index);
              }}
              onHoverOut={() => {
                setHoveredIndex(current =>
                  current === index ? null : current,
                );
              }}
              disabled={isDisabled || isLoading}>
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <Loader
                    size={16}
                    color={theme.icons.background}
                    testID={`tab-loader-${index}`}
                  />
                </View>
              ) : isCompact ? (
                <Text.XS
                  variant={isSelected ? 'primary' : 'secondary'}
                  style={[
                    styles.tabText,
                    isDisabled && styles.disabledText,
                    isLoading && styles.loadingText,
                  ]}
                  numberOfLines={1}>
                  {tab.label}
                </Text.XS>
              ) : (
                <Text.S
                  variant={isSelected ? 'primary' : 'secondary'}
                  style={[
                    styles.tabText,
                    isDisabled && styles.disabledText,
                    isLoading && styles.loadingText,
                  ]}
                  numberOfLines={1}>
                  {tab.label}
                </Text.S>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

type VerticalTabsProps<Value extends number | string> = Omit<
  TabsProps<Value>,
  'tabs' | 'variant'
> & {
  normalizedTabs: NormalisedTabItem<Value>[];
};

const VerticalTabs = <Value extends number | string>({
  normalizedTabs,
  value,
  selectedTab,
  onSelectTab,
  onChange,
  loadingTabIndex,
}: VerticalTabsProps<Value>) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const { theme } = useTheme();
  const styles = { ...commonStyles(theme), ...getVerticalTabsStyles(theme) };

  useEffect(() => {
    if (value !== undefined) {
      const index = normalizedTabs.findIndex(tab => tab.value === value);
      if (index >= 0) {
        setSelectedIndex(index);
      }
    }
  }, [value, normalizedTabs]);

  useEffect(() => {
    if (selectedTab) {
      const index = normalizedTabs.findIndex(tab => tab.label === selectedTab);
      if (index >= 0) {
        setSelectedIndex(index);
      }
    }
  }, [selectedTab, normalizedTabs]);

  const handleSelectTab = useCallback(
    (index: number) => {
      if (loadingTabIndex === index) return;
      setSelectedIndex(index);
      onSelectTab?.(index);
      const tabValue = normalizedTabs[index].value;
      onChange?.(tabValue);
    },
    [onSelectTab, onChange, normalizedTabs, loadingTabIndex],
  );

  const getPressableStyle = useCallback(
    (index: number) =>
      (state: PressableStateCallbackType): StyleProp<ViewStyle> => {
        const isPressed = state.pressed;
        const isSelected = selectedIndex === index;
        const isLoading = loadingTabIndex === index;
        const shouldShowHovered = hoveredIndex === index && !isLoading;
        return [
          styles.tab,
          index === normalizedTabs.length - 1 && { marginBottom: 0 },
          isSelected && styles.selectedTab,
          shouldShowHovered && styles.hoveredTab,
          isPressed && !isLoading && styles.pressedTab,
        ].filter(Boolean);
      },
    [
      selectedIndex,
      styles,
      normalizedTabs.length,
      loadingTabIndex,
      hoveredIndex,
    ],
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabsContainer}>
        <BlurView style={StyleSheet.absoluteFillObject} pointerEvents="none" />
        {normalizedTabs.map((tab, index) => {
          const isSelected = selectedIndex === index;
          const isLoading = loadingTabIndex === index;

          return (
            <Pressable
              key={index}
              testID={tab.testID}
              style={getPressableStyle(index)}
              onPress={() => {
                handleSelectTab(index);
              }}
              onHoverIn={() => {
                if (!isLoading) setHoveredIndex(index);
              }}
              onHoverOut={() => {
                setHoveredIndex(current =>
                  current === index ? null : current,
                );
              }}
              disabled={isLoading}>
              {isSelected && !isLoading && (
                <BlurView
                  style={StyleSheet.absoluteFillObject}
                  pointerEvents="none"
                />
              )}
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <Loader
                    size={16}
                    color={theme.icons.background}
                    testID={`tab-loader-${index}`}
                  />
                </View>
              ) : (
                <Text.S
                  variant={isSelected ? 'primary' : 'secondary'}
                  style={[styles.tabText, isLoading && styles.loadingText]}>
                  {tab.label}
                </Text.S>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const commonStyles = (theme: Theme) => {
  return StyleSheet.create({
    container: {
      width: '100%',
    },
    selectedTab: {
      backgroundColor: theme.background.tertiary,
      ...getShadowStyle({ theme, variant: 'elevated' }),
    },
    hoveredTab: {
      ...getShadowStyle({ theme, variant: 'elevated' }),
    },
    pressedTab: {
      backgroundColor: isWeb
        ? theme.background.primary
        : theme.background.secondary,
      ...getShadowStyle({ theme, variant: 'inset' }),
      opacity: !isWeb ? 0.8 : 1,
    },
    tabText: {
      zIndex: 1,
    },
    loadingContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2,
    },
    loadingText: {
      opacity: 0.6,
    },
    disabledTab: {
      backgroundColor: theme.background.tertiary,
    },
    disabledText: {
      color: theme.background.tertiary,
    },
  });
};

const getHorizontalTabsStyles = (theme: Theme, isCompact = false) => {
  return StyleSheet.create({
    blurView: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: radius.rounded,
    },
    tabsContainer: {
      flexDirection: 'row',
      borderRadius: radius.rounded,
      backgroundColor: theme.background.secondary,
      padding: spacing.XS,
      overflow: 'hidden',
      gap: spacing.XS,
    },
    tab: {
      flexGrow: 1,
      flexShrink: 0,
      paddingHorizontal: isCompact ? spacing.S : spacing.M,
      paddingVertical: isCompact ? spacing.XS : spacing.S,
      borderRadius: radius.M,
      overflow: 'hidden',
      alignItems: 'center',
    },
  });
};

const getVerticalTabsStyles = (theme: Theme) => {
  return StyleSheet.create({
    tabsContainer: {
      flexDirection: 'column',
      borderRadius: radius.M,
      backgroundColor: theme.background.primary,
      padding: spacing.XS,
      overflow: 'hidden',
    },
    tab: {
      padding: spacing.M,
      borderRadius: radius.M,
      position: 'relative',
      overflow: 'hidden',
      width: '100%',
      alignItems: 'flex-start',
      justifyContent: 'center',
      marginBottom: spacing.XS,
      backgroundColor: 'transparent',
    },
  });
};
