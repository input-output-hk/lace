import React from 'react';

import { Text } from '../text';

import * as cx from './tooltip-content.css';

export interface TooltipContentProps {
  label: string;
}

export const TooltipContent = ({
  label,
}: Readonly<TooltipContentProps>): JSX.Element => {
  return (
    <div className={cx.tooltipContent}>
      <Text.Body.Small color="secondary" weight="$medium">
        {label}
      </Text.Body.Small>
    </div>
  );
};
