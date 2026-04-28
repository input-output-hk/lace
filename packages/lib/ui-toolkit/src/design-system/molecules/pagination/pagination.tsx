import type { LayoutChangeEvent } from 'react-native';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, FlatList, Pressable } from 'react-native';

import { useTheme, spacing } from '../../../design-tokens';
import { Beacon, Icon, IconButton, Row } from '../../atoms';
import { getIsDark, isWeb } from '../../util';

import type { Theme } from '../../../design-tokens';

const PORTFOLIO_BUTTON_WIDTH = isWeb ? 24 : 18;
const BEACON_WIDTH = spacing.M;

type PaginationProps = {
  pages: number;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  withNavigation?: boolean;
  loop?: boolean;
  showPortfolioView?: boolean;
  testID?: string;
};

type PaginationIndicatorProps = {
  active?: boolean;
  testID?: string;
  onPress?: () => void;
};

const PaginationIndicator = ({
  active,
  testID,
  onPress,
}: PaginationIndicatorProps) => {
  const { theme } = useTheme();
  const isDark = getIsDark(theme);
  const beaconColor = active ? 'primary' : isDark ? 'white' : 'lightGray';

  return (
    <Pressable hitSlop={spacing.S} onPress={onPress}>
      <Beacon color={beaconColor} testID={testID} />
    </Pressable>
  );
};

export const Pagination = ({
  pages,
  activeIndex,
  setActiveIndex,
  withNavigation = true,
  loop = false,
  showPortfolioView = false,
  testID,
}: PaginationProps) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const flatListRef = useRef<FlatList>(null);
  const isInitialMount = useRef(true);
  const isDark = theme.name === 'dark';

  const maxPaginationWidth = useMemo(() => {
    // This is the maximum possible width of the pagination container, which is the container minus both navigation buttons and paddings.
    const navigationWidth = withNavigation ? 80 + spacing.M * 2 : 0;

    if (containerWidth <= 0) return Number.POSITIVE_INFINITY;
    return Math.max(0, containerWidth - navigationWidth);
  }, [containerWidth, withNavigation]);

  const totalContentWidth = useMemo(() => {
    // This is the actual width of the content.
    const elementsWidth = showPortfolioView
      ? PORTFOLIO_BUTTON_WIDTH + (pages - 1) * BEACON_WIDTH
      : pages * BEACON_WIDTH;
    const paddingsAndGaps = spacing.M * (pages + 1);
    return paddingsAndGaps + elementsWidth;
  }, [pages, showPortfolioView]);

  const paginationStyle = useMemo(() => {
    const maxWidth = Math.min(maxPaginationWidth, totalContentWidth);
    return {
      maxWidth,
    };
  }, [maxPaginationWidth, totalContentWidth, theme]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!flatListRef.current || maxPaginationWidth === 0) return;

    const isScrollingNeeded = maxPaginationWidth < totalContentWidth;
    if (!isScrollingNeeded) return;

    let elementStartPosition = spacing.M;
    let elementWidth = BEACON_WIDTH;

    if (showPortfolioView) {
      if (activeIndex === 0) {
        elementWidth = PORTFOLIO_BUTTON_WIDTH;
      } else {
        elementStartPosition =
          spacing.M +
          PORTFOLIO_BUTTON_WIDTH +
          spacing.M +
          (activeIndex - 1) * (BEACON_WIDTH + spacing.M);
      }
    } else {
      elementStartPosition =
        spacing.M + activeIndex * (BEACON_WIDTH + spacing.M);
    }

    const elementCenter = elementStartPosition + elementWidth / 2;

    let targetOffset = elementCenter - maxPaginationWidth / 2;

    const maxScrollOffset = totalContentWidth - maxPaginationWidth;

    targetOffset = Math.max(0, Math.min(targetOffset, maxScrollOffset));

    flatListRef.current.scrollToOffset({
      offset: targetOffset,
      animated: true,
    });
  }, [activeIndex, maxPaginationWidth, totalContentWidth, showPortfolioView]);

  const handlePreviousPage = useCallback(() => {
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    } else if (loop) {
      setActiveIndex(pages - 1);
    }
  }, [activeIndex, pages, loop, setActiveIndex]);

  const handleNextPage = useCallback(() => {
    if (activeIndex < pages - 1) {
      setActiveIndex(activeIndex + 1);
    } else if (loop) {
      setActiveIndex(0);
    }
  }, [activeIndex, pages, loop, setActiveIndex]);

  const isPreviousDisabled = !loop && activeIndex === 0;
  const isNextDisabled = !loop && activeIndex === pages - 1;

  const paginationIndicators = useMemo(
    () => Array.from({ length: pages }).fill(''),
    [pages],
  );

  const renderItem = useCallback(
    ({ index }: { index: number }) => {
      const isActive = index === activeIndex;
      const portfolioButtonColor =
        activeIndex === index || isDark ? theme.brand.white : theme.brand.black;

      if (showPortfolioView && index === 0) {
        return (
          <IconButton.Static
            icon={
              <Icon
                name="DragDropHorizontal"
                color={portfolioButtonColor}
                size={PORTFOLIO_BUTTON_WIDTH}
                testID={'portfolio-card-indicator'}
              />
            }
            containerStyle={{
              ...styles.portfolioButton,
              ...(activeIndex === index && styles.portfolioButtonActive),
            }}
            onPress={() => {
              setActiveIndex(0);
            }}
          />
        );
      }
      return (
        <PaginationIndicator
          key={index}
          active={isActive}
          testID="account-indicator"
          onPress={() => {
            setActiveIndex(index);
          }}
        />
      );
    },
    [showPortfolioView, activeIndex, styles, theme, isDark],
  );

  const measureLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setContainerWidth(width);
  }, []);

  return (
    <Row style={styles.container} testID={testID} onLayout={measureLayout}>
      {withNavigation && (
        <IconButton.Static
          icon={<Icon name="CaretLeft" size={16} />}
          onPress={handlePreviousPage}
          disabled={isPreviousDisabled}
          testID="pagination-previous-button"
          containerStyle={styles.arrowButton}
        />
      )}
      <FlatList
        ref={flatListRef}
        data={paginationIndicators}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.indicatorsContainer}
        style={paginationStyle}
      />
      {withNavigation && (
        <IconButton.Static
          icon={<Icon name="CaretRight" size={16} />}
          onPress={handleNextPage}
          disabled={isNextDisabled}
          testID="pagination-next-button"
          containerStyle={styles.arrowButton}
        />
      )}
    </Row>
  );
};

const getStyles = (theme: Theme) => {
  return StyleSheet.create({
    container: {
      justifyContent: 'space-between',
      width: '100%',
    },
    indicatorsContainer: {
      gap: spacing.M,
      alignItems: 'center',
    },
    portfolioButton: {
      width: PORTFOLIO_BUTTON_WIDTH,
      height: PORTFOLIO_BUTTON_WIDTH,
      padding: isWeb ? spacing.XS : spacing.M,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.background.secondary,
    },
    portfolioButtonActive: {
      backgroundColor: theme.brand.ascending,
    },
    arrowButton: {
      backgroundColor: theme.background.primary,
    },
  });
};
