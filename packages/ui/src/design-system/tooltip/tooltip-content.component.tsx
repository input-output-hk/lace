import React from 'react';
import type { ReactNode } from 'react';

import { Text } from '../text';

import * as cx from './tooltip-content.css';

export interface TooltipContentProps {
  label: ReactNode | string;
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
