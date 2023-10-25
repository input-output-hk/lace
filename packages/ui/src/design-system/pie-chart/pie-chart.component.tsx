/* eslint-disable functional/prefer-immutable-types */
import type { ReactElement, ReactNode } from 'react';
import React, { isValidElement, useMemo, useState } from 'react';

import isFunction from 'lodash/isFunction';
import {
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

import {
  PIE_CHART_DEFAULT_COLOR_SET,
  PieChartGradientColor,
} from './pie-chart.data';

import type { ColorValueHex } from '../../types';
import type { CellProps } from 'recharts';
import type { PickByValue } from 'utility-types';

type PieChartDataProps = Partial<{
  overrides: CellProps;
}>;
export type PieChartColor = ColorValueHex | PieChartGradientColor;

export interface TooltipContentRendererProps<T> {
  active?: boolean;
  name?: string;
  payload?: T;
}
export type TooltipContentRenderer<T> = (
  props: TooltipContentRendererProps<T>,
) => ReactNode;
type TooltipContent<T> = ReactElement | TooltipContentRenderer<T>;

interface RechartTooltipContentRendererProps<T> {
  name?: string;
  active?: boolean;
  payload?: { name?: string; payload?: T }[];
}

type RechartTooltipContentRenderer<T> = (
  props: RechartTooltipContentRendererProps<T>,
) => ReactNode;

// Recharts passes to the renderer for some reason the payload as
// a list which is a bit cumbersome because in practice we care just about the
// first element and the adapter below removes this inconvenience
const transformTooltipContentRenderer =
  <T extends object>(
    tooltipContentRenderer: TooltipContentRenderer<T>,
  ): RechartTooltipContentRenderer<T> =>
  ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: { name?: string; payload?: T }[];
  }) =>
    tooltipContentRenderer({ active, ...payload?.[0] });

interface PieChartBaseProps<T extends object> {
  animate?: boolean;
  colors?: PieChartColor[];
  data: (PieChartDataProps & T)[];
  direction?: 'clockwise' | 'counterclockwise';
  tooltip?: TooltipContent<T>;
}

interface PieChartCustomKeyProps<T extends object>
  extends PieChartBaseProps<T> {
  nameKey: keyof PickByValue<T, string>;
  valueKey: keyof PickByValue<T, number>;
}
interface PieChartDefaultKeyProps<T extends { name: string; value: number }>
  extends PieChartBaseProps<T> {
  nameKey?: 'name';
  valueKey?: 'value';
}

export type PieChartProps<T extends object | { name: string; value: number }> =
  T extends { name: string; value: number }
    ? PieChartDefaultKeyProps<T>
    : PieChartCustomKeyProps<T>;

const formatPieColor = (color: PieChartColor): string =>
  Boolean(PieChartGradientColor[color as PieChartGradientColor])
    ? `url(#${color})`
    : color;

/**
 * **Important**: The length of `colors` array needs to be greater than or equal to the length of `data` array.
 * The `data` items that do not have corresponding `color` definition will not be rendered.
 *
 * @param animate enables animation
 * @param colors set of colors that will be used to render the pies in defined order
 * @param data dataset used to render the pies
 * @param data[].overrides Recharts Cell props
 * @param direction defines how pies will be rendered (clockwise or counterclockwise)
 * @param nameKey object key of a `data` item that will be used as name (displayed in the tooltip)
 * @param tooltip component accepted by Recharts Tooltip `content` prop
 * @param valueKey object key of a `data` item that will be used as value (displayed in the tooltip)
 */

export const PieChart = <T extends object | { name: string; value: number }>({
  animate = true,
  colors = PIE_CHART_DEFAULT_COLOR_SET,
  data: inputData,
  direction = 'clockwise',
  nameKey = 'name',
  tooltip,
  valueKey = 'value',
}: PieChartProps<T>): JSX.Element => {
  const data = inputData.slice(0, colors.length);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const tooltipContent = useMemo(() => {
    if (!tooltip || isValidElement(tooltip)) {
      return tooltip;
    }

    if (isFunction(tooltip)) {
      return transformTooltipContentRenderer(tooltip);
    }
  }, [tooltip]);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>): void => {
    const clientWidth = window.innerWidth;
    if (event.target instanceof SVGSVGElement && clientWidth > 360) {
      const { x, y } = event.target.getBoundingClientRect();
      setTooltipPosition({ x: event.clientX - x, y: event.clientY - y });
    }
  };

  return (
    <ResponsiveContainer aspect={1}>
      <RechartsPieChart
        onMouseMove={(_, event): void => {
          handleMouseMove(event as React.MouseEvent<HTMLDivElement>);
        }}
      >
        <defs>
          <linearGradient id={PieChartGradientColor.LaceLinearGradient}>
            <stop offset="-18%" stopColor="#FDC300" />
            <stop offset="120%" stopColor="#FF92E1" />
          </linearGradient>
        </defs>
        {tooltipContent && (
          <Tooltip
            wrapperStyle={{ zIndex: 1 }}
            content={tooltipContent}
            position={tooltipPosition}
          />
        )}
        <Pie
          data={data}
          dataKey={valueKey}
          nameKey={nameKey}
          innerRadius="90%"
          isAnimationActive={animate}
          outerRadius="100%"
          cornerRadius="50%"
          paddingAngle={data.length > 1 ? 4 : 0}
          stroke="none"
          startAngle={90}
          endAngle={direction === 'clockwise' ? -270 : 450}
        >
          {data.length === 1 && (
            <Cell fill={formatPieColor(colors[0])} {...data[0].overrides} />
          )}
          {data.length > 1 &&
            data.map((_, index) => (
              <Cell
                key={index}
                fill={formatPieColor(colors[index])}
                {...(data[index].overrides ?? {})}
              />
            ))}
        </Pie>
      </RechartsPieChart>
    </ResponsiveContainer>
  );
};
