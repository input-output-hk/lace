import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { SheetRoutes } from '@lace-lib/navigation';
import {
  Beacon,
  Divider,
  Row,
  Sheet,
  Text,
  getIsDark,
  spacing,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { howItWorksIllustrations } from '../components/carousel';

import type { AccountId } from '@lace-contract/wallet-repo';
import type { SheetScreenProps } from '@lace-lib/navigation';

// The step keys are the source of truth for the page count: each pairs the
// stepN translation copy with the matching illustration from the carousel barrel.
const STEPS = ['1', '2', '3', '4'] as const;
const SLIDES = STEPS.map((step, index) => ({
  step,
  Illustration: howItWorksIllustrations[index],
}));
const PAGES = SLIDES.length;

// Cap the illustration width on wide sheets so it never blows up to the full
// content width; it stays square (width = height) and centered under this cap.
const IMAGE_MAX_WIDTH = 360;

type Slide = (typeof SLIDES)[number];

/**
 * "How it Works" onboarding carousel, auto-opened over the USDr Staking detail
 * on the user's first visit to that screen.
 * Native paging via a horizontal `FlatList` (drag + snap) inside a `Sheet.Scroll`
 * (the standard sheet body). The slide height is measured from the content so the
 * centered pagination dots sit one `spacing.L` gap under it. Each slide:
 * illustration → divider → "What's USDr?" copy. Footer drives the flow: Skip/Next,
 * collapsing to a lone Get Started on the last page. Get Started opens the Manage
 * Stake flow; Skip returns to the USDr Staking detail beneath.
 */
export const RealFiOnboarding = (
  props: SheetScreenProps<SheetRoutes.RealFiOnboarding>,
) => {
  const { navigation } = props;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = getIsDark(theme);
  const inactiveDotColor = isDark ? 'white' : 'lightGray';
  const accountId = props.route.params.accountId as AccountId;

  const listRef = useRef<FlatList<Slide>>(null);
  const [width, setWidth] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  // Mirror the active index in a ref so the footer callbacks can read the
  // current page WITHOUT listing `activeIndex` as a dependency — otherwise every
  // mid-swipe index change gives `onPrimary` a new identity, the setOptions
  // effect re-runs, and the footer buttons are torn down and rebuilt mid-swipe
  // (the flicker; ADR-31). The dots still read `activeIndex` state for their
  // highlight — only the footer must stay stable.
  const activeIndexRef = useRef(0);
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);
  const { trackEvent } = useAnalytics();
  const hasTrackedCarouselView = useRef(false);
  useEffect(() => {
    // The carousel impression fires once with step 1; every page the user then
    // lands on (swipe, Next, dot tap — forward or back) reports a step view.
    if (!hasTrackedCarouselView.current) {
      hasTrackedCarouselView.current = true;
      trackEvent('realfi | onboarding | viewed');
    }
    trackEvent('realfi | onboarding | step viewed', { step: activeIndex + 1 });
  }, [activeIndex, trackEvent]);
  // Set while a programmatic jump (Next / dot tap) is in flight so the settle it
  // provokes doesn't sync the index back off the explicit target — on web the
  // list may not actually move, and reading its stale offset would snap the dots
  // and footer back to page 0 (the "dots don't jump" bug).
  const programmaticScrollRef = useRef(false);
  const isLast = activeIndex === PAGES - 1;
  const isReady = width > 0;
  // Square illustration, inset by the shared content padding (matches the copy),
  // capped at IMAGE_MAX_WIDTH so it never fills a wide sheet edge-to-edge.
  const imageSize = Math.max(
    0,
    Math.min(IMAGE_MAX_WIDTH, width - spacing.M * 2),
  );

  const openStakingDetail = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const goToIndex = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, PAGES - 1));
    // The explicit index is the source of truth; suppress the scroll settle it
    // triggers so it can't be overridden by the list's (possibly unmoved) offset.
    programmaticScrollRef.current = true;
    listRef.current?.scrollToIndex({ index: clamped, animated: true });
    setActiveIndex(clamped);
  }, []);

  const openManageStake = useCallback(() => {
    // replace, not navigate: a push would leave this carousel mounted under
    // the Manage Stake sheet; replacing removes it as the new sheet presents.
    navigation.replace(SheetRoutes.RealFiManageStake, {
      accountId,
      tab: 'stake',
    });
  }, [navigation, accountId]);

  const onPrimary = useCallback(() => {
    if (activeIndexRef.current === PAGES - 1) {
      trackEvent('realfi | onboarding | get started clicked');
      openManageStake();
      return;
    }
    goToIndex(activeIndexRef.current + 1);
  }, [openManageStake, goToIndex, trackEvent]);

  const onSecondary = useCallback(() => {
    trackEvent('realfi | onboarding | skipped', {
      step: activeIndexRef.current + 1,
    });
    openStakingDetail();
  }, [openStakingDetail, trackEvent]);

  useEffect(() => {
    navigation.setOptions({
      header: <Sheet.Header title={t('realfi.onboarding.title')} />,
      footer: (
        <Sheet.Footer
          secondaryButton={
            isLast
              ? undefined
              : { label: t('realfi.onboarding.skip'), onPress: onSecondary }
          }
          primaryButton={{
            label: isLast
              ? t('realfi.onboarding.get-started')
              : t('realfi.onboarding.next'),
            onPress: onPrimary,
          }}
        />
      ),
    });
  }, [navigation, t, isLast, onPrimary, onSecondary]);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  }, []);

  const onContentLayout = useCallback((event: LayoutChangeEvent) => {
    const measured = Math.ceil(event.nativeEvent.layout.height);
    setContentHeight(previous => (previous === measured ? previous : measured));
  }, []);

  // Re-measure whenever the sheet width changes (e.g. rotation): the measurer
  // below only mounts while the height is unknown, so clearing it here is what
  // re-triggers a measurement instead of stretching the slides to a stale height.
  useEffect(() => {
    if (width > 0) setContentHeight(0);
  }, [width]);

  // Sync the active page only once a scroll SETTLES, not on every frame. A
  // continuous onScroll churns the index across a boundary as the animation
  // eases, which flips `isLast` back and forth and rebuilds the footer buttons
  // repeatedly (the flicker); it also fights `goToIndex` by resetting the index
  // to the live offset mid-jump. Momentum-end fires once, at rest, for a user
  // drag; a programmatic jump already set the index, so its settle is skipped.
  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (programmaticScrollRef.current) {
        programmaticScrollRef.current = false;
        return;
      }
      if (!width) return;
      const index = Math.round(event.nativeEvent.contentOffset.x / width);
      setActiveIndex(previous => (previous === index ? previous : index));
    },
    [width],
  );

  const onScrollToIndexFailed = useCallback(
    (info: { index: number }) => {
      // getItemLayout makes this rare, but a not-yet-measured target would
      // otherwise throw; fall back to an offset scroll to the same page.
      listRef.current?.scrollToOffset({
        offset: width * info.index,
        animated: true,
      });
    },
    [width],
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: width,
      offset: width * index,
      index,
    }),
    [width],
  );

  const renderSlideBody = useCallback(
    (item: Slide) => (
      <>
        <item.Illustration width={imageSize} height={imageSize} />
        <Divider />
        <Text.M align="center">
          {t(`realfi.onboarding.step${item.step}.title`)}
        </Text.M>
        <Text.S align="center" numberOfLines={4}>
          {t(`realfi.onboarding.step${item.step}.description`)}
        </Text.S>
      </>
    ),
    [imageSize, t],
  );

  const renderItem = useCallback(
    ({ item }: { item: Slide }) => (
      <View style={[styles.slide, { width, height: contentHeight }]}>
        {renderSlideBody(item)}
      </View>
    ),
    [width, contentHeight, renderSlideBody],
  );

  // Stable style references so a page-change re-render (dots highlight) does not
  // hand the list / scroll container fresh style objects and re-render them.
  const listStyle = useMemo(() => ({ height: contentHeight }), [contentHeight]);
  const scrollContentStyle = useMemo(
    () => [
      styles.scrollContent,
      { paddingBottom: FOOTER_BASE + insets.bottom },
    ],
    [insets.bottom],
  );

  return (
    <Sheet.Scroll
      onLayout={onLayout}
      contentContainerStyle={scrollContentStyle}>
      {/* Off-screen measurer: all slides share this content, so one measurement
          gives the exact slide height (drives the FlatList height). Rendered ONLY
          until the height is known, then unmounted so its copy of the slide copy
          ("What's USDrf?" etc.) doesn't duplicate the real slide 0 in the a11y
          tree / text queries — the list below renders once contentHeight is set. */}
      {isReady && contentHeight === 0 && (
        <View
          style={[styles.slide, styles.measure, { width }]}
          pointerEvents="none"
          onLayout={onContentLayout}>
          {renderSlideBody(SLIDES[0])}
        </View>
      )}

      {contentHeight > 0 && (
        <>
          <FlatList<Slide>
            ref={listRef}
            data={SLIDES}
            renderItem={renderItem}
            keyExtractor={item => item.step}
            getItemLayout={getItemLayout}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onMomentumScrollEnd}
            onScrollToIndexFailed={onScrollToIndexFailed}
            style={listStyle}
          />
          <Row style={styles.dots} justifyContent="center" gap={spacing.M}>
            {SLIDES.map((slide, index) => (
              <Pressable
                key={slide.step}
                hitSlop={spacing.S}
                onPress={() => {
                  goToIndex(index);
                }}
                testID={`realfi-onboarding-dot-${index}`}>
                <Beacon
                  color={index === activeIndex ? 'primary' : inactiveDotColor}
                />
              </Pressable>
            ))}
          </Row>
        </>
      )}
    </Sheet.Scroll>
  );
};

// Approximate TrueSheet footer height (Divider + buttons + gaps); the safe-area
// bottom inset is added on top at runtime.
const FOOTER_BASE = 96;

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 0,
    paddingTop: spacing.M,
  },
  slide: {
    alignItems: 'center',
    gap: spacing.M,
    paddingHorizontal: spacing.M,
  },
  measure: {
    position: 'absolute',
    top: 0,
    left: 0,
    opacity: 0,
    zIndex: -1,
  },
  dots: {
    width: '100%',
    marginTop: spacing.L,
  },
});
