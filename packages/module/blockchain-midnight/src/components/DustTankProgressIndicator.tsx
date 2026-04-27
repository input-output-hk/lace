import { useTheme } from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import type { DustTankStatus } from '../hooks';

export type DustTankProgressIndicatorProps = {
  current: number;
  max: number;
  status: DustTankStatus;
  size?: number;
};

const STROKE_WIDTH = 2;

export const DustTankProgressIndicator = ({
  current,
  max,
  status,
  size = 12,
}: DustTankProgressIndicatorProps) => {
  const { theme } = useTheme();

  const radius = (size - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const colors = useMemo(() => {
    switch (status) {
      case 'refilling':
        return {
          fill: theme.brand.ascendingSecondary,
          empty: theme.brand.darkGray,
        };
      case 'decaying':
        return {
          fill: theme.data.positive,
          empty: theme.brand.yellow,
        };
      case 'filled':
        return {
          fill: theme.data.positive,
          empty: theme.data.positive,
        };
      case 'empty':
      default:
        return {
          fill: 'transparent',
          empty: theme.brand.darkGray,
        };
    }
  }, [status, theme]);

  const fillPercentage = useMemo(() => {
    if (max === 0) return 0;
    if (status === 'decaying' && current > max) {
      return (max / current) * 100;
    }
    return Math.min((current / max) * 100, 100);
  }, [current, max, status]);

  const fillStrokeDashoffset = useMemo(() => {
    const fill = (fillPercentage / 100) * circumference;
    return circumference - fill;
  }, [fillPercentage, circumference]);

  if (status === 'empty') {
    return null;
  }

  const shouldMirror = status === 'decaying';

  return (
    <View
      style={{
        width: size,
        height: size,
        transform: shouldMirror ? [{ scaleX: -1 }] : undefined,
      }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.empty}
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.fill}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={fillStrokeDashoffset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>
    </View>
  );
};
