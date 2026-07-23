import type { StyleProp, TextStyle, ViewProps } from 'react-native';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useTheme, radius, spacing } from '../../../design-tokens';
import {
  Column,
  Text,
  Divider,
  BlurView,
  Icon,
  Avatar,
  Row,
  ContentPortal,
  ContentPortalHost,
} from '../../atoms';
import { Toggle } from '../../atoms/toggle/toggle';
import { isAndroid, isWeb } from '../../util/commons';
import { useDropdownPosition } from '../../util/hooks/useDropdownPosition';

import { isDropdownMenuItemSelected } from './dropdownMenu.utils';
import { SheetPositionContext } from './sheetPositionContext';

import type { Theme } from '../../../design-tokens';
import type { AvatarContent } from '../../../utils/avatarUtils';
import type { IconName } from '../../atoms/icons/Icon';

const ITEM_HEIGHT = 60;
const MAX_VISIBLE_ITEMS = 4;

export type DropdownMenuItemToggle = {
  value: boolean;
  onValueChange: (value: boolean) => void;
};

export type DropdownMenuItem = {
  id: string;
  text: string;
  subText?: string;
  icon?: IconName;
  avatar?: AvatarContent;
  leftIcon?: IconName;
  disabled?: boolean;
  toggle?: DropdownMenuItemToggle;
};

export type DropdownMenuProps = {
  items: (DropdownMenuItem | string)[];
  title?: string;
  titleSubText?: string;
  /** The id (for DropdownMenuItem objects) or label/text value (for string items) of the selected item */
  selectedItemId?: string;
  onSelectItem?: (index: number) => void;
  titleAvatar?: AvatarContent;
  titleLeftIcon?: IconName;
  showActionButton?: boolean;
  onActionPress?: () => void;
  actionText?: string;
  maxVisibleItems?: number;
  animationDuration?: number;
  /**
   * Fixed width for the dropdown list in pixels.
   * When wider than the trigger button the list right-aligns to the trigger's
   * right edge so it never overflows off-screen.
   * Defaults to the trigger button width.
   */
  dropdownWidth?: number;
  /**
   * When true, single-line tail-ellipsizes both the trigger title and item text
   * so long strings stay within the fixed-height row instead of wrapping. Off
   * by default to preserve existing wrapping behavior across consumers.
   */
  truncateText?: boolean;
  /**
   * Overrides automatic vertical placement when the menu is rendered inside
   * constrained containers such as native sheets.
   */
  shouldOpenUpwards?: boolean;
  testID?: string;
};

type DropdownMenuViewportContextValue = {
  boundaryRef: React.RefObject<View | null>;
  boundaryInsets?: { top?: number; bottom?: number };
  hostName: string;
};

type DropdownLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type DropdownPositionResult = {
  layout: DropdownLayout | null;
  boundaryLayout: DropdownLayout | null;
  shouldOpenUpwards: boolean;
  measure: (
    ref: View | null,
    boundaryRef?: React.RefObject<View | null>,
    boundaryInsets?: { top?: number; bottom?: number },
  ) => void;
};

const DropdownMenuViewportContext =
  createContext<DropdownMenuViewportContextValue | null>(null);

export const DropdownMenuViewportProvider = ({
  children,
  value,
}: {
  children: React.ReactNode;
  value: DropdownMenuViewportContextValue;
}) => (
  <DropdownMenuViewportContext.Provider value={value}>
    {children}
  </DropdownMenuViewportContext.Provider>
);

export const DropdownMenuViewport = ({
  children,
  style,
  testID,
  boundaryInsets,
}: {
  children: React.ReactNode;
  style?: ViewProps['style'];
  testID?: string;
  boundaryInsets?: DropdownMenuViewportContextValue['boundaryInsets'];
}) => {
  const boundaryRef = useRef<View | null>(null);
  const hostName = useRef(
    `dropdown-menu-viewport-${Math.random().toString(36).slice(2, 11)}`,
  ).current;

  return (
    <DropdownMenuViewportProvider
      value={{ boundaryRef, boundaryInsets, hostName }}>
      <View ref={boundaryRef} style={style} testID={testID}>
        <View style={stylesPortal.hostContainer} pointerEvents="box-none">
          <ContentPortalHost name={hostName} />
        </View>
        {children}
      </View>
    </DropdownMenuViewportProvider>
  );
};

const MenuItem = React.memo(
  ({
    item,
    index,
    selectedItemId,
    onPress,
    isLastItem,
    theme,
    truncateText,
  }: {
    item: DropdownMenuItem;
    index: number;
    selectedItemId?: string;
    onPress: (index: number) => void;
    isLastItem: boolean;
    theme: Theme;
    truncateText?: boolean;
  }) => {
    const defaultStyles = useMemo(() => styles(theme), [theme]);
    const isSelected = isDropdownMenuItemSelected(item, selectedItemId);
    const isDisabled = item.disabled;
    const hasToggle = !!item.toggle;

    const handlePress = () => {
      if (isDisabled) return;
      if (hasToggle) {
        item.toggle!.onValueChange(!item.toggle!.value);
      } else {
        onPress(index);
      }
    };

    const renderTrailing = useCallback(() => {
      if (hasToggle) {
        return (
          <View pointerEvents="none">
            <Toggle
              value={item.toggle!.value}
              testID={`dropdown-menu-item-${index}-toggle`}
            />
          </View>
        );
      }

      if (item.icon) {
        return (
          <Icon
            name={item.icon}
            size={16}
            testID={`dropdown-menu-item-${index}-icon`}
          />
        );
      }

      if (isSelected) {
        return (
          <Icon
            name="Tick"
            size={16}
            testID={`dropdown-menu-item-${index}-tick`}
          />
        );
      }

      return null;
    }, [hasToggle, item, index, isSelected]);

    return (
      <Column>
        <Pressable
          style={[
            defaultStyles.item,
            isSelected && defaultStyles.selectedItem,
            isDisabled && defaultStyles.disabledItem,
          ]}
          onPress={handlePress}
          disabled={isDisabled}
          accessibilityRole={hasToggle ? 'switch' : 'button'}
          accessibilityLabel={
            item.subText ? `${item.text}, ${item.subText}` : item.text
          }
          accessibilityState={{
            selected: isSelected,
            disabled: isDisabled,
            checked: hasToggle ? item.toggle!.value : undefined,
          }}
          testID={`dropdown-menu-item-${index}`}>
          {!!item.avatar && (
            <Avatar
              size={spacing.XL}
              shape="rounded"
              content={item.avatar}
              testID={`dropdown-menu-item-${index}-avatar`}
            />
          )}

          {!!item.leftIcon && (
            <Icon
              name={item.leftIcon}
              size={16}
              testID={`dropdown-menu-item-${index}-left-icon`}
            />
          )}

          <Column style={defaultStyles.text}>
            <Text.S
              numberOfLines={truncateText ? 1 : undefined}
              ellipsizeMode={truncateText ? 'tail' : undefined}
              style={[isDisabled && defaultStyles.disabledText]}
              testID={`dropdown-menu-item-${index}-text`}>
              {item.text}
            </Text.S>
            {!!item.subText && (
              <Text.XS
                variant="secondary"
                numberOfLines={truncateText ? 1 : undefined}
                ellipsizeMode={truncateText ? 'tail' : undefined}
                style={[isDisabled && defaultStyles.disabledText]}
                testID={`dropdown-menu-item-${index}-subtext`}>
                {item.subText}
              </Text.XS>
            )}
          </Column>

          {renderTrailing()}
        </Pressable>
        {!isLastItem && <Divider />}
      </Column>
    );
  },
);

const TitleComponent = ({
  title,
  titleSubText,
  numberOfLines,
  ellipsizeMode,
  style,
  testID,
}: {
  title?: string;
  titleSubText?: string;
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail';
  style?: StyleProp<TextStyle>;
  testID?: string;
}) => (
  <Column style={style}>
    <Text.XS
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
      testID={`${testID}-title`}>
      {title}
    </Text.XS>
    {!!titleSubText && (
      <Text.XS
        variant="secondary"
        numberOfLines={numberOfLines}
        ellipsizeMode={ellipsizeMode}
        testID={`${testID}-subtitle`}>
        {titleSubText}
      </Text.XS>
    )}
  </Column>
);

const ActionTextComponent = ({
  actionText,
  testID,
}: {
  actionText?: string;
  testID?: string;
}) => (
  <Text.XS variant="secondary" testID={testID}>
    {actionText}
  </Text.XS>
);

export const DropdownMenu = React.memo(
  ({
    items,
    title,
    titleSubText,
    selectedItemId,
    onSelectItem,
    titleAvatar,
    titleLeftIcon,
    showActionButton = false,
    onActionPress,
    actionText,
    maxVisibleItems = MAX_VISIBLE_ITEMS,
    animationDuration = 300,
    dropdownWidth,
    truncateText,
    shouldOpenUpwards: shouldOpenUpwardsOverride,
    testID,
  }: DropdownMenuProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const progress = useSharedValue(0);
    const triggerRef = useRef<View | null>(null);
    const isKeyboardVisibleRef = useRef(false);
    const viewport = useContext(DropdownMenuViewportContext);
    const sheetPosition = useContext(SheetPositionContext);
    const { theme } = useTheme();
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    // Android also renders the expanded list in a Modal: inside native sheets,
    // TrueSheet's CoordinatorLayout intercepts vertical drags over the sheet
    // content, so the list only receives scroll gestures from its own window.
    // Placement is unchanged — the trigger is measured with measureInWindow and
    // the Modal window shares that coordinate space (translucent bars below).
    const shouldUseModalPresentation = isWeb || isAndroid;

    const defaultStyles = useMemo(() => styles(theme), [theme]);

    const normalizedItems = useMemo<DropdownMenuItem[]>(
      () =>
        (items ?? []).map((item, index) =>
          typeof item === 'string'
            ? { id: `${item}-${index}`, text: item }
            : item,
        ),
      [items],
    );

    const maxHeight = useMemo(
      () =>
        Math.min(normalizedItems.length, maxVisibleItems) * ITEM_HEIGHT +
        spacing.S,
      [normalizedItems.length, maxVisibleItems],
    );

    const dropdownPosition = useDropdownPosition(
      maxHeight,
    ) as DropdownPositionResult;
    const {
      layout,
      boundaryLayout,
      shouldOpenUpwards: shouldOpenUpwardsAuto,
      measure,
    } = dropdownPosition;
    const shouldOpenUpwards =
      shouldOpenUpwardsOverride ?? shouldOpenUpwardsAuto;
    const shouldUseViewportPortal =
      !shouldUseModalPresentation && !!viewport?.hostName && !!boundaryLayout;

    // On Android's new architecture, measureInWindow resolves from the shadow
    // tree, which lays the sheet content out as if it filled the screen from
    // y=0 and knows nothing about where TrueSheet natively positions the
    // sheet. The Modal window lives in real screen space, so anchor the list
    // by shifting the measured trigger by the sheet's on-screen Y position.
    const modalAnchor = useMemo(() => {
      if (!layout || !isAndroid) return layout;
      const sheetTop = sheetPosition?.getSheetTop();
      if (sheetTop === undefined) return layout;
      return { ...layout, y: layout.y + sheetTop };
    }, [layout, sheetPosition]);

    const modalContainerStyle = useMemo(() => {
      if (!modalAnchor) return null;

      const listWidth = dropdownWidth ?? modalAnchor.width;
      // When the list is wider than the trigger, right-align to the trigger's
      // right edge so it expands leftward and stays within the screen.
      const left =
        listWidth > modalAnchor.width
          ? Math.max(0, modalAnchor.x + modalAnchor.width - listWidth)
          : modalAnchor.x;

      const base = { left, width: listWidth };

      return shouldOpenUpwards
        ? {
            ...base,
            top: Math.max(spacing.XS, modalAnchor.y - maxHeight - spacing.XS),
          }
        : { ...base, top: modalAnchor.y + modalAnchor.height + spacing.XS };
    }, [modalAnchor, maxHeight, shouldOpenUpwards, dropdownWidth]);

    const modalBounds = useMemo(() => {
      if (!modalAnchor) return null;

      const listWidth = dropdownWidth ?? modalAnchor.width;
      const left =
        listWidth > modalAnchor.width
          ? Math.max(0, modalAnchor.x + modalAnchor.width - listWidth)
          : modalAnchor.x;
      const top = shouldOpenUpwards
        ? Math.max(spacing.XS, modalAnchor.y - maxHeight - spacing.XS)
        : modalAnchor.y + modalAnchor.height + spacing.XS;

      return {
        left,
        top,
        width: listWidth,
        height: maxHeight,
      };
    }, [modalAnchor, dropdownWidth, shouldOpenUpwards, maxHeight]);

    const portalBounds = useMemo(() => {
      if (!modalBounds || !boundaryLayout) return null;

      return {
        left: modalBounds.left - boundaryLayout.x,
        top: modalBounds.top - boundaryLayout.y,
        width: modalBounds.width,
        height: modalBounds.height,
      };
    }, [boundaryLayout, modalBounds]);

    const inlineContainerStyle = useMemo(() => {
      if (!layout) return null;

      const listWidth = dropdownWidth ?? layout.width;
      const left = listWidth > layout.width ? layout.width - listWidth : 0;
      const triggerHeight = layout.height || ITEM_HEIGHT;

      return shouldOpenUpwards
        ? {
            left,
            width: listWidth,
            bottom: triggerHeight + spacing.XS,
          }
        : {
            left,
            width: listWidth,
            top: triggerHeight + spacing.XS,
          };
    }, [layout, shouldOpenUpwards, dropdownWidth]);

    const inlineBackdropStyle = useMemo(() => {
      if (!layout) return null;

      return {
        left: -layout.x,
        top: -layout.y,
        width: windowWidth,
        height: windowHeight,
      };
    }, [layout, windowHeight, windowWidth]);

    useEffect(() => {
      const showSub = Keyboard.addListener('keyboardDidShow', () => {
        isKeyboardVisibleRef.current = true;
      });
      const hideSub = Keyboard.addListener('keyboardDidHide', () => {
        isKeyboardVisibleRef.current = false;
      });

      return () => {
        showSub.remove();
        hideSub.remove();
      };
    }, []);

    const measureNow = () => {
      measure(
        triggerRef.current,
        viewport?.boundaryRef,
        viewport?.boundaryInsets,
      );
    };

    const doOpen = () => {
      setIsOpen(true);
      progress.value = withTiming(1, { duration: animationDuration });
      requestAnimationFrame(measureNow);
      setTimeout(measureNow, 250);
    };

    const afterSettle = () => {
      requestIdleCallback(() => {
        setTimeout(() => requestAnimationFrame(doOpen), 50);
      });
    };

    const openMenu = () => {
      if (isKeyboardVisibleRef.current) {
        let didHide = false;
        const sub = Keyboard.addListener('keyboardDidHide', () => {
          didHide = true;
          sub.remove();
          afterSettle();
        });

        Keyboard.dismiss();

        setTimeout(() => {
          if (!didHide) {
            sub.remove();
            afterSettle();
          }
        }, 350);

        return;
      }

      afterSettle();
    };

    const closeMenu = () => {
      progress.value = withTiming(0, { duration: animationDuration }, () => {
        scheduleOnRN(setIsOpen, false);
      });
    };

    const toggleMenu = () => {
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    };

    const handleSelect = (index: number) => {
      onSelectItem?.(index);
      if (!normalizedItems[index]?.toggle) {
        closeMenu();
      }
    };

    const animatedStyle = useAnimatedStyle(() => {
      const translateFrom = shouldOpenUpwards
        ? MAX_VISIBLE_ITEMS
        : -MAX_VISIBLE_ITEMS;

      return {
        height: interpolate(progress.value, [0, 1], [0, maxHeight]),
        opacity: progress.value,
        transform: [
          {
            translateY: interpolate(progress.value, [0, 1], [translateFrom, 0]),
          },
        ],
      };
    }, [maxHeight, shouldOpenUpwards]);

    const modalAnimatedContainer = useMemo(
      () => [defaultStyles.modalDropdown, modalContainerStyle, animatedStyle],
      [defaultStyles.modalDropdown, modalContainerStyle, animatedStyle],
    );

    const portalAnimatedContainer = useMemo(
      () =>
        portalBounds
          ? [
              defaultStyles.portalDropdown,
              {
                left: portalBounds.left,
                top: portalBounds.top,
                width: portalBounds.width,
              },
              animatedStyle,
            ]
          : [defaultStyles.portalDropdown, animatedStyle],
      [animatedStyle, portalBounds, defaultStyles.portalDropdown],
    );

    const inlineAnimatedContainer = useMemo(
      () => [defaultStyles.inlineDropdown, inlineContainerStyle, animatedStyle],
      [defaultStyles.inlineDropdown, inlineContainerStyle, animatedStyle],
    );

    // A plain ScrollView (not FlatList) because the menu renders inside the
    // sheet's ScrollView — nesting a VirtualizedList there breaks windowing —
    // and the item count is too small for virtualization to matter.
    const dropdownList = (
      <BlurView style={defaultStyles.blurView}>
        <ScrollView
          nestedScrollEnabled={true}
          testID={testID || 'dropdown-menu'}
          showsVerticalScrollIndicator={
            normalizedItems.length > maxVisibleItems
          }
          contentContainerStyle={defaultStyles.contentContainer}>
          {normalizedItems.map((item, index) => (
            <MenuItem
              key={item.id}
              item={item}
              index={index}
              selectedItemId={selectedItemId}
              onPress={handleSelect}
              isLastItem={index === normalizedItems.length - 1}
              theme={theme}
              truncateText={truncateText}
            />
          ))}
        </ScrollView>
      </BlurView>
    );

    return (
      <Column
        style={[
          defaultStyles.dropdownContainer,
          isOpen && defaultStyles.dropdownContainerOpen,
        ]}
        gap={spacing.S}>
        <Pressable
          ref={triggerRef}
          style={defaultStyles.pressable}
          onPress={toggleMenu}
          accessibilityRole="button"
          accessibilityState={{ expanded: isOpen }}
          accessibilityLabel={
            titleSubText ? `${title}, ${titleSubText}` : title
          }
          testID={testID ? `${testID}-button` : 'dropdown-button'}>
          {!!titleAvatar && (
            <Avatar
              size={spacing.XL}
              shape="rounded"
              content={titleAvatar}
              testID={testID ? `${testID}-avatar` : 'dropdown-avatar'}
            />
          )}

          {!!titleLeftIcon && <Icon name={titleLeftIcon} size={16} />}

          <TitleComponent
            title={title}
            titleSubText={titleSubText}
            numberOfLines={truncateText ? 1 : undefined}
            ellipsizeMode={truncateText ? 'tail' : undefined}
            style={defaultStyles.text}
            testID={testID || 'dropdown-button'}
          />

          <Row alignItems="center" gap={spacing.S}>
            {!!actionText && (
              <ActionTextComponent
                actionText={actionText}
                testID={
                  testID ? `${testID}-action-text` : 'dropdown-action-text'
                }
              />
            )}

            {showActionButton && onActionPress && (
              <Pressable
                onPress={onActionPress}
                testID={
                  testID ? `${testID}-action-button` : 'dropdown-action-button'
                }>
                <Icon name="Cancel" size={18} />
              </Pressable>
            )}

            <Icon
              name={isOpen ? 'CaretUp' : 'CaretDown'}
              size={18}
              testID={testID ? `${testID}-title-icon` : 'dropdown-title-icon'}
            />
          </Row>
        </Pressable>

        {isOpen &&
          !shouldUseModalPresentation &&
          !shouldUseViewportPortal &&
          layout &&
          modalBounds && (
            <>
              <View
                style={[defaultStyles.inlineBackdrop, inlineBackdropStyle]}
                pointerEvents="box-none">
                <Pressable
                  style={[
                    defaultStyles.modalBackdropSegment,
                    defaultStyles.modalBackdropTop,
                    {
                      height: modalBounds.top,
                    },
                  ]}
                  onPress={closeMenu}
                />
                <Pressable
                  style={[
                    defaultStyles.modalBackdropSegment,
                    defaultStyles.modalBackdropLeft,
                    {
                      top: modalBounds.top,
                      width: modalBounds.left,
                      height: modalBounds.height,
                    },
                  ]}
                  onPress={closeMenu}
                />
                <Pressable
                  style={[
                    defaultStyles.modalBackdropSegment,
                    defaultStyles.modalBackdropRight,
                    {
                      left: modalBounds.left + modalBounds.width,
                      top: modalBounds.top,
                      height: modalBounds.height,
                    },
                  ]}
                  onPress={closeMenu}
                />
                <Pressable
                  style={[
                    defaultStyles.modalBackdropSegment,
                    defaultStyles.modalBackdropBottom,
                    {
                      top: modalBounds.top + modalBounds.height,
                    },
                  ]}
                  onPress={closeMenu}
                />
              </View>
              <Animated.View style={inlineAnimatedContainer}>
                {dropdownList}
              </Animated.View>
            </>
          )}

        {isOpen &&
          shouldUseViewportPortal &&
          portalBounds &&
          !!viewport?.hostName && (
            <ContentPortal hostName={viewport.hostName}>
              <View style={stylesPortal.hostContainer} pointerEvents="box-none">
                <Pressable
                  style={[
                    defaultStyles.modalBackdropSegment,
                    defaultStyles.modalBackdropTop,
                    {
                      height: portalBounds.top,
                    },
                  ]}
                  onPress={closeMenu}
                />
                <Pressable
                  style={[
                    defaultStyles.modalBackdropSegment,
                    defaultStyles.modalBackdropLeft,
                    {
                      top: portalBounds.top,
                      width: portalBounds.left,
                      height: portalBounds.height,
                    },
                  ]}
                  onPress={closeMenu}
                />
                <Pressable
                  style={[
                    defaultStyles.modalBackdropSegment,
                    defaultStyles.modalBackdropRight,
                    {
                      left: portalBounds.left + portalBounds.width,
                      top: portalBounds.top,
                      height: portalBounds.height,
                    },
                  ]}
                  onPress={closeMenu}
                />
                <Pressable
                  style={[
                    defaultStyles.modalBackdropSegment,
                    defaultStyles.modalBackdropBottom,
                    {
                      top: portalBounds.top + portalBounds.height,
                    },
                  ]}
                  onPress={closeMenu}
                />

                <Animated.View style={portalAnimatedContainer}>
                  {dropdownList}
                </Animated.View>
              </View>
            </ContentPortal>
          )}

        {shouldUseModalPresentation && modalBounds && (
          <Modal
            transparent
            visible={isOpen}
            animationType="none"
            statusBarTranslucent
            navigationBarTranslucent
            onRequestClose={closeMenu}>
            <View
              style={StyleSheet.absoluteFillObject}
              pointerEvents="box-none">
              <Pressable
                style={[
                  defaultStyles.modalBackdropSegment,
                  defaultStyles.modalBackdropTop,
                  {
                    height: modalBounds.top,
                  },
                ]}
                onPress={closeMenu}
              />
              <Pressable
                style={[
                  defaultStyles.modalBackdropSegment,
                  defaultStyles.modalBackdropLeft,
                  {
                    top: modalBounds.top,
                    width: modalBounds.left,
                    height: modalBounds.height,
                  },
                ]}
                onPress={closeMenu}
              />
              <Pressable
                style={[
                  defaultStyles.modalBackdropSegment,
                  defaultStyles.modalBackdropRight,
                  {
                    left: modalBounds.left + modalBounds.width,
                    top: modalBounds.top,
                    height: modalBounds.height,
                  },
                ]}
                onPress={closeMenu}
              />
              <Pressable
                style={[
                  defaultStyles.modalBackdropSegment,
                  defaultStyles.modalBackdropBottom,
                  {
                    top: modalBounds.top + modalBounds.height,
                  },
                ]}
                onPress={closeMenu}
              />

              <Animated.View style={modalAnimatedContainer}>
                {dropdownList}
              </Animated.View>
            </View>
          </Modal>
        )}
      </Column>
    );
  },
);

const styles = (theme: Theme) =>
  StyleSheet.create({
    dropdownContainer: {
      width: '100%',
      position: 'relative',
      zIndex: 1,
    },
    dropdownContainerOpen: {
      zIndex: 10,
      elevation: 10,
    },
    pressable: {
      borderRadius: radius.S,
      backgroundColor: theme.background.secondary,
      height: ITEM_HEIGHT,
      flexDirection: 'row',
      gap: spacing.S,
      alignItems: 'center',
      paddingHorizontal: spacing.M,
    },
    text: {
      flex: 1,
    },
    modalDropdown: {
      position: 'absolute',
      backgroundColor: theme.background.primary,
      borderRadius: radius.S,
      borderColor: theme.border.middle,
      overflow: 'hidden',
      zIndex: 3,
      elevation: 1,
    },
    portalDropdown: {
      position: 'absolute',
      backgroundColor: theme.background.primary,
      borderRadius: radius.S,
      borderColor: theme.border.middle,
      overflow: 'hidden',
      zIndex: 3,
      elevation: 1,
    },
    modalBackdropSegment: {
      position: 'absolute',
      zIndex: 1,
      elevation: 1,
    },
    modalBackdropTop: {
      left: 0,
      top: 0,
      right: 0,
    },
    modalBackdropLeft: {
      left: 0,
    },
    modalBackdropRight: {
      right: 0,
    },
    modalBackdropBottom: {
      left: 0,
      right: 0,
      bottom: 0,
    },
    inlineDropdown: {
      position: 'absolute',
      backgroundColor: theme.background.primary,
      borderRadius: radius.S,
      borderColor: theme.border.middle,
      overflow: 'hidden',
      zIndex: 3,
      elevation: 1,
    },
    inlineBackdrop: {
      position: 'absolute',
      zIndex: 2,
    },
    item: {
      minHeight: ITEM_HEIGHT,
      paddingHorizontal: spacing.M,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.S,
    },
    selectedItem: {
      backgroundColor: theme.extra.shadowInnerStrong,
      margin: spacing.XS,
      borderRadius: radius.S,
    },
    blurView: {
      borderRadius: radius.S,
      flex: 1,
    },
    disabledItem: {
      backgroundColor: theme.background.tertiary,
    },
    disabledText: {
      color: theme.text.tertiary,
    },
    contentContainer: {
      backgroundColor: theme.background.primary,
    },
  });

const stylesPortal = StyleSheet.create({
  hostContainer: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'box-none',
    zIndex: 11,
  },
});
