import * as d3 from 'd3';
import React, { useCallback, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

import { radius, spacing, useTheme } from '../../../design-tokens';
import { Text } from '../text/text';

import type { Theme } from '../../../design-tokens';

export type LineChartData = {
  data: number[];
  timestamps?: number[];
};

export type LineChartType = 'negative' | 'neutral' | 'positive';

export type LineChartProps = {
  data: LineChartData;
  width?: number;
  height?: number;
  lineColor?: string;
  testID?: string;
  formatValue?: (value: number) => string;
};

// Helper function to determine a chart type based on data
export const getLineChartType = (
  data: number[],
  neutralThreshold = 0.01,
): LineChartType => {
  const firstPoint = data[0];
  const lastPoint = data[data.length - 1];
  const relativeChange =
    Math.abs(lastPoint - firstPoint) / Math.max(1, Math.abs(firstPoint));

  if (relativeChange < neutralThreshold) return 'neutral';
  if (lastPoint > firstPoint) return 'positive';
  if (lastPoint < firstPoint) return 'negative';
  return 'neutral';
};

// Helper function to get appropriate line color based on chart type
export const getLineChartColor = (
  chartType: LineChartType,
  theme: Theme,
): string => {
  switch (chartType) {
    case 'positive':
      return theme.data.positive;
    case 'negative':
      return theme.background.negative;
    case 'neutral':
      return theme.brand.yellow;
  }
};

export const LineChart = ({
  data,
  lineColor,
  width,
  height,
  testID,
  formatValue = String,
}: LineChartProps): React.JSX.Element => {
  const [containerWidth, setContainerWidth] = useState(200);
  const [containerHeight, setContainerHeight] = useState(220);
  const finalWidth = width || containerWidth;
  const finalHeight = height || containerHeight;
  const { theme } = useTheme();

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const tooltipOpacity = useSharedValue(0);

  // Determine a chart type using the helper function
  const chartType = useMemo((): LineChartType => {
    return getLineChartType(data.data);
  }, [data.data]);

  // Determine line color based on a chart type if not provided
  const finalLineColor = useMemo((): string => {
    if (lineColor) return lineColor;

    return getLineChartColor(chartType, theme);
  }, [lineColor, chartType, theme]);

  // Scales for x and y axes
  const xScale = useMemo(
    () =>
      d3
        .scaleLinear()
        .domain([0, data.data.length - 1])
        .range([0, finalWidth]),
    [data.data.length, finalWidth],
  ); // No padding, full width

  const yScale = useMemo(() => {
    const minValue = d3.min(data.data) || 0;
    const maxValue = d3.max(data.data) || 0;
    const padding = 2; // 2 pixels padding top and bottom

    // Use min-max domain so small variations are visible
    const domainPadding = (maxValue - minValue) * 0.1 || 1;

    return d3
      .scaleLinear()
      .domain([minValue - domainPadding, maxValue + domainPadding])
      .range([finalHeight - padding, padding]);
  }, [data.data, finalHeight]);

  // Generate an SVG path
  const pathData = useMemo(() => {
    const line = d3
      .line<number>()
      .x((_, index) => xScale(index))
      .y(d => yScale(d))
      .curve(d3.curveCatmullRom.alpha(0.5)); // Less smoothing, more angular

    return line(data.data) || '';
  }, [data.data, xScale, yScale]);

  const getIndexFromX = useCallback(
    (x: number): number => {
      if (data.data.length <= 1) return 0;
      const index = Math.round(xScale.invert(x));
      return Math.max(0, Math.min(index, data.data.length - 1));
    },
    [data.data.length, xScale],
  );

  const handleGestureUpdate = useCallback(
    (x: number) => {
      const index = getIndexFromX(x);
      setActiveIndex(index);
    },
    [getIndexFromX],
  );

  const handleGestureEnd = useCallback(() => {
    setActiveIndex(null);
  }, []);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(200)
        .onStart(event => {
          'worklet';
          tooltipOpacity.value = 1;
          runOnJS(handleGestureUpdate)(event.x);
        })
        .onUpdate(event => {
          'worklet';
          runOnJS(handleGestureUpdate)(event.x);
        })
        .onEnd(() => {
          'worklet';
          tooltipOpacity.value = 0;
          runOnJS(handleGestureEnd)();
        }),
    [handleGestureUpdate, handleGestureEnd, tooltipOpacity],
  );

  const hoverGesture = useMemo(
    () =>
      Gesture.Hover()
        .onStart(event => {
          'worklet';
          tooltipOpacity.value = 1;
          runOnJS(handleGestureUpdate)(event.x);
        })
        .onChange(event => {
          'worklet';
          runOnJS(handleGestureUpdate)(event.x);
        })
        .onFinalize(() => {
          'worklet';
          tooltipOpacity.value = 0;
          runOnJS(handleGestureEnd)();
        }),
    [handleGestureUpdate, handleGestureEnd, tooltipOpacity],
  );

  const composedGesture = useMemo(() => {
    if (Platform.OS === 'web') {
      return Gesture.Simultaneous(gesture, hoverGesture);
    }
    return gesture;
  }, [gesture, hoverGesture]);

  const tooltipAnimatedStyle = useAnimatedStyle(() => ({
    opacity: tooltipOpacity.value,
  }));

  const styles = useMemo(() => getStyles(theme), [theme]);

  const activeValue = activeIndex != null ? data.data[activeIndex] : null;
  const activeCx = activeIndex != null ? xScale(activeIndex) : 0;
  const activeCy = activeValue != null ? yScale(activeValue) : 0;

  // Position the tooltip: centered above the point, clamped to chart bounds
  const TOOLTIP_WIDTH = 100;
  const tooltipPositionStyle = useMemo(
    () => ({
      left:
        activeIndex != null
          ? Math.max(
              0,
              Math.min(
                activeCx - TOOLTIP_WIDTH / 2,
                finalWidth - TOOLTIP_WIDTH,
              ),
            )
          : 0,
    }),
    [activeIndex, activeCx, finalWidth],
  );

  return (
    <GestureDetector gesture={composedGesture}>
      <View
        style={styles.container}
        onLayout={event => {
          const { width: layoutWidth, height: layoutHeight } =
            event.nativeEvent.layout;
          if (!width) {
            setContainerWidth(layoutWidth);
          }
          if (!height) {
            setContainerHeight(layoutHeight);
          }
        }}
        testID={testID}>
        <View style={styles.chartLayer}>
          <Svg width={finalWidth} height={finalHeight} style={styles.svg}>
            <Defs>
              <LinearGradient
                id="areaGradient"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%">
                <Stop
                  offset="0%"
                  stopColor={finalLineColor}
                  stopOpacity="0.3"
                />
                <Stop
                  offset="100%"
                  stopColor={finalLineColor}
                  stopOpacity="0.05"
                />
              </LinearGradient>
            </Defs>

            {/* Line */}
            <Path
              d={pathData}
              fill="none"
              stroke={finalLineColor}
              strokeWidth={2}
              opacity={1}
            />

            {/* Active point indicator */}
            {activeIndex != null && activeValue != null && (
              <>
                <Line
                  x1={activeCx}
                  y1={0}
                  x2={activeCx}
                  y2={finalHeight}
                  stroke={theme.text.secondary}
                  strokeWidth={1}
                  strokeDasharray="4,4"
                  opacity={0.5}
                />
                <Circle
                  cx={activeCx}
                  cy={activeCy}
                  r={5}
                  fill={finalLineColor}
                  stroke={theme.background.primary}
                  strokeWidth={2}
                />
              </>
            )}
          </Svg>

          {/* Value tooltip */}
          {activeValue != null && (
            <Animated.View
              style={[
                styles.tooltip,
                tooltipAnimatedStyle,
                tooltipPositionStyle,
              ]}>
              <Text.XS style={styles.tooltipText} numberOfLines={1}>
                {formatValue(activeValue)}
              </Text.XS>
            </Animated.View>
          )}
        </View>
      </View>
    </GestureDetector>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    svg: { width: '100%', height: '100%' },
    container: {
      width: '100%',
      height: '100%',
      flex: 1,
    },
    chartLayer: {
      ...StyleSheet.absoluteFillObject,
    },
    tooltip: {
      position: 'absolute',
      backgroundColor: theme.background.secondary,
      paddingHorizontal: spacing.S,
      paddingVertical: spacing.XS,
      borderRadius: radius.S,
      alignSelf: 'flex-start',
      width: 100,
      alignItems: 'center',
    },
    tooltipText: {
      color: theme.text.primary,
    },
  });
