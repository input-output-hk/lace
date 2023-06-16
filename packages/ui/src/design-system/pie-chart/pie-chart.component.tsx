/* eslint-disable functional/prefer-immutable-types */
import React from 'react';

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
import type { CellProps, TooltipProps } from 'recharts';
import type { PickByValue } from 'utility-types';

type PieChartDataProps = Partial<{
  overrides: CellProps;
}>;
type PieChartColor = ColorValueHex | PieChartGradientColor;
interface PieChartBaseProps<T extends object> {
  animate?: boolean;
  colors?: PieChartColor[];
  data: (PieChartDataProps & T)[];
  direction?: 'clockwise' | 'counterclockwise';
  tooltip?: TooltipProps<number, string>['content'];
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

  return (
    <ResponsiveContainer aspect={1}>
      <RechartsPieChart>
        <defs>
          <linearGradient id={PieChartGradientColor.LaceLinearGradient}>
            <stop offset="-18%" stopColor="#FDC300" />
            <stop offset="120%" stopColor="#FF92E1" />
          </linearGradient>
        </defs>
        {Boolean(tooltip) && <Tooltip content={tooltip} />}
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
